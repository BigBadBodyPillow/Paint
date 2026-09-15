<script lang="ts">
  import { onMount } from 'svelte';
  import type { Brush, Point, Tool } from '$lib/paint-types';

  type Props = {
    tool: Tool;
    brush: Brush;
    colour: string;
    brushSize: number;
    onHistoryChange: (index: number, length: number) => void;
    canvasBackground?: string;
  };

  let {
    tool,
    brush,
    colour,
    brushSize,
    onHistoryChange,
    canvasBackground = 'rgb(14, 14, 14)'
  }: Props = $props();

  let canvas = $state<HTMLCanvasElement>();
  let canvasShell = $state<HTMLDivElement>();
  let context = $state<CanvasRenderingContext2D>();
  let isDrawing = $state(false);
  let startPoint = $state<Point | null>(null);
  let shapeOrigin = $state<Point | null>(null);
  let snapshot = $state<ImageData | null>(null);
  let history = $state<ImageData[]>([]);
  let historyIndex = $state(-1);
  let canvasWidth = $state(1200);
  let canvasHeight = $state(760);
  let displayedWidth = $state(1200);
  let displayedHeight = $state(760);
  let cursorPreview = $state<{ x: number; y: number } | null>(null);
  let cursorPreviewSize = $derived(
    brushSize *
      (canvasShell && canvasWidth ? canvasShell.clientWidth / canvasWidth : 1) *
      (brush === 'spray' ? 4.2 : 1)
  );

  onMount(() => {
    resizeCanvas();

    if (!canvasShell) return;
    const resizeObserver = new ResizeObserver(updateDisplayedSize);
    resizeObserver.observe(canvasShell);

    return () => resizeObserver.disconnect();
  });

  function resizeCanvas() {
    if (!canvas || !canvasShell) return;

    updateDisplayedSize();
    const rect = canvasShell.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const previousCanvas = document.createElement('canvas');
    const hadDrawing = canvas.width > 0 && canvas.height > 0 && historyIndex >= 0;

    if (hadDrawing) {
      previousCanvas.width = canvas.width;
      previousCanvas.height = canvas.height;
      previousCanvas.getContext('2d')?.drawImage(canvas, 0, 0);
    }

    canvasWidth = Math.max(320, Math.floor(rect.width * ratio));
    canvasHeight = Math.max(260, Math.floor(rect.height * ratio));
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    context = canvas.getContext('2d') ?? undefined;

    if (!context) return;
    context.fillStyle = canvasBackground;
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    if (hadDrawing) context.drawImage(previousCanvas, 0, 0, canvasWidth, canvasHeight);
    history = [context.getImageData(0, 0, canvasWidth, canvasHeight)];
    historyIndex = 0;
    onHistoryChange(historyIndex, history.length);
  }

  function updateDisplayedSize() {
    if (!canvasShell) return;

    const rect = canvasShell.getBoundingClientRect();
    displayedWidth = Math.round(rect.width);
    displayedHeight = Math.round(rect.height);
  }

  function pointFromEvent(event: PointerEvent): Point {
    const rect = canvas!.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas!.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas!.height
    };
  }

  function trackPointer(event: PointerEvent) {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    cursorPreview = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function beginStroke(event: PointerEvent) {
    if (!context || !canvas) return;

    trackPointer(event);
    canvas.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);

    if (tool === 'fill') {
      floodFill(Math.floor(point.x), Math.floor(point.y));
      saveHistory();
      return;
    }

    isDrawing = true;
    startPoint = point;
    shapeOrigin = point;
    snapshot = context.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === 'brush' || tool === 'eraser') drawBrush(point, point);
  }

  function drawStroke(event: PointerEvent) {
    if (!isDrawing || !context || !startPoint) return;
    const point = pointFromEvent(event);

    if (tool === 'brush' || tool === 'eraser') drawBrush(startPoint, point);
    else if (shapeOrigin) {
      if (snapshot) context.putImageData(snapshot, 0, 0);
      drawShape(shapeOrigin, point);
    }

    if (tool === 'brush' || tool === 'eraser') startPoint = point;
  }

  function handlePointerMove(event: PointerEvent) {
    trackPointer(event);

    for (const coalescedEvent of event.getCoalescedEvents?.() ?? [event])
      drawStroke(coalescedEvent);
  }

  function endStroke(event: PointerEvent) {
    if (!isDrawing || !canvas) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);

    isDrawing = false;
    startPoint = null;
    shapeOrigin = null;
    snapshot = null;

    saveHistory();
  }

  function prepareStroke() {
    if (!context) return;

    context.globalCompositeOperation = 'source-over';
    context.lineCap = brush === 'chalk' ? 'butt' : 'round';
    context.lineJoin = 'round';
    context.strokeStyle = tool === 'eraser' ? canvasBackground : colour;
    context.fillStyle = tool === 'eraser' ? canvasBackground : colour;
    context.lineWidth = brushSize;
    context.globalAlpha = brush === 'chalk' ? 0.46 : 1;
  }

  function drawBrush(from: Point, to: Point) {
    if (!context) return;
    prepareStroke();

    if (brush === 'spray') {
      const density = Math.max(18, brushSize * 2);
      context.globalAlpha = 0.32;
      for (let i = 0; i < density; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * brushSize * 2.1;
        context.fillRect(
          to.x + Math.cos(angle) * radius,
          to.y + Math.sin(angle) * radius,
          1.4,
          1.4
        );
      }
      return;
    }

    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  function drawShape(from: Point, to: Point) {
    if (!context) return;
    prepareStroke();

    if (brush === 'spray') {
      drawSprayShape(from, to);
      return;
    }

    context.beginPath();

    if (tool === 'line') {
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
    } else if (tool === 'rectangle') context.rect(from.x, from.y, to.x - from.x, to.y - from.y);
    else {
      const radius = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
      context.arc(from.x, from.y, radius, 0, Math.PI * 2);
    }

    context.stroke();
  }

  function drawSprayShape(from: Point, to: Point) {
    if (!context) return;
    const samples = Math.max(24, Math.floor(Math.hypot(to.x - from.x, to.y - from.y) / 3));

    for (let index = 0; index <= samples; index += 1) {
      const progress = index / samples;
      let x = from.x;
      let y = from.y;

      if (tool === 'line') {
        x += (to.x - from.x) * progress;
        y += (to.y - from.y) * progress;
      } else if (tool === 'rectangle') {
        const width = to.x - from.x;
        const height = to.y - from.y;
        const perimeter = 2 * (Math.abs(width) + Math.abs(height));
        const distance = perimeter * progress;

        if (distance < Math.abs(width)) {
          x += Math.sign(width) * distance;
        } else if (distance < Math.abs(width) + Math.abs(height)) {
          x += width;
          y += Math.sign(height) * (distance - Math.abs(width));
        } else if (distance < 2 * Math.abs(width) + Math.abs(height)) {
          x += width - Math.sign(width) * (distance - Math.abs(width) - Math.abs(height));
          y += height;
        } else {
          x += -Math.sign(width) * (perimeter - distance);
          y += height;
        }
      } else {
        const angle = progress * Math.PI * 2;
        const radius = Math.hypot(to.x - from.x, to.y - from.y);

        x += Math.cos(angle) * radius;
        y += Math.sin(angle) * radius;
      }
      drawBrush({ x, y }, { x, y });
    }
  }

  function floodFill(startX: number, startY: number) {
    if (!context || startX < 0 || startX >= canvasWidth || startY < 0 || startY >= canvasHeight)
      return;

    const image = context.getImageData(0, 0, canvasWidth, canvasHeight);
    const pixels = image.data;
    const index = (startY * canvasWidth + startX) * 4;
    const target = [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]];
    const replacement = hexToRgb(colour);

    if (
      target[0] === replacement[0] &&
      target[1] === replacement[1] &&
      target[2] === replacement[2] &&
      brush === 'pen'
    )
      return;

    const tolerance = brush === 'chalk' ? 64 : 48;
    const matchesTarget = (pixel: number) =>
      Math.abs(pixels[pixel] - target[0]) <= tolerance &&
      Math.abs(pixels[pixel + 1] - target[1]) <= tolerance &&
      Math.abs(pixels[pixel + 2] - target[2]) <= tolerance &&
      Math.abs(pixels[pixel + 3] - target[3]) <= tolerance;
    const stack: Point[] = [{ x: startX, y: startY }];
    const alpha = brush === 'chalk' ? 0.46 : brush === 'spray' ? 0.32 : 1;

    while (stack.length) {
      const point = stack.pop()!;
      if (point.x < 0 || point.x >= canvasWidth || point.y < 0 || point.y >= canvasHeight) continue;
      const current = (point.y * canvasWidth + point.x) * 4;
      if (!matchesTarget(current)) continue;
      if (brush !== 'spray' || Math.random() < 0.7) {
        pixels[current] = pixels[current] * (1 - alpha) + replacement[0] * alpha;
        pixels[current + 1] = pixels[current + 1] * (1 - alpha) + replacement[1] * alpha;
        pixels[current + 2] = pixels[current + 2] * (1 - alpha) + replacement[2] * alpha;
        pixels[current + 3] = 255;
      }

      stack.push(
        { x: point.x + 1, y: point.y },
        { x: point.x - 1, y: point.y },
        { x: point.x, y: point.y + 1 },
        { x: point.x, y: point.y - 1 }
      );
    }
    context.putImageData(image, 0, 0);
  }

  function hexToRgb(hex: string) {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  function saveHistory() {
    if (!context) return;
    history = [
      ...history.slice(0, historyIndex + 1),
      context.getImageData(0, 0, canvasWidth, canvasHeight)
    ];
    historyIndex = history.length - 1;
    onHistoryChange(historyIndex, history.length);
  }

  function undo() {
    if (!context || historyIndex <= 0) return;
    historyIndex -= 1;
    context.putImageData(history[historyIndex], 0, 0);
    onHistoryChange(historyIndex, history.length);
  }

  function redo() {
    if (!context || historyIndex >= history.length - 1) return;
    historyIndex += 1;
    context.putImageData(history[historyIndex], 0, 0);
    onHistoryChange(historyIndex, history.length);
  }

  function clearCanvas() {
    if (!context) return;
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.fillStyle = canvasBackground;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    saveHistory();
  }

  function download(format: 'png' | 'webp') {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `canvas-${new Date().toISOString().slice(0, 10)}.${format}`;
    link.href = canvas.toDataURL(`image/${format}`, 0.92);
    link.click();
  }

  export function undoCanvas() {
    undo();
  }

  export function redoCanvas() {
    redo();
  }

  export function clearCanvasFromParent() {
    clearCanvas();
  }

  export function downloadCanvas(format: 'png' | 'webp') {
    download(format);
  }
</script>

<div class="canvas-column">
  <div class="canvas-shell" bind:this={canvasShell}>
    <canvas
      bind:this={canvas}
      aria-label="Drawing canvas"
      onpointerdown={beginStroke}
      onpointermove={handlePointerMove}
      onpointerup={endStroke}
      onpointercancel={endStroke}
      onpointerleave={() => (cursorPreview = null)}
    ></canvas>
    {#if cursorPreview && tool !== 'fill'}<span
        class="brush-ghost"
        aria-hidden="true"
        style={`left: ${cursorPreview.x}px; top: ${cursorPreview.y}px; width: ${cursorPreviewSize}px; height: ${cursorPreviewSize}px`}
      ></span>{/if}
    <div class="canvas-corner top-left"></div>
    <div class="canvas-corner top-right"></div>
    <div class="canvas-corner bottom-left"></div>
    <div class="canvas-corner bottom-right"></div>
  </div>
  <div class="canvas-footer">
    <span>{brushSize}px {tool === 'eraser' ? 'eraser' : brush}</span><span class="canvas-size"
      >{displayedWidth} × {displayedHeight}</span
    >
  </div>
</div>

<style>
  .canvas-column {
    min-width: 0;
    padding-top: 8px;
  }
  .canvas-shell {
    position: relative;
    overflow: hidden;
    width: 100%;
    aspect-ratio: 1.45;
    max-height: 800px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--background-muted2);
    box-shadow: 0 15px 40px rgba(95, 94, 93, 0.08);
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: crosshair;
  }
  .brush-ghost {
    position: absolute;
    z-index: 2;
    transform: translate(-50%, -50%);
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 50%;
    background: rgba(6, 6, 6, 0.361);
    pointer-events: none;
  }
  .canvas-corner {
    position: absolute;
    width: 13px;
    height: 13px;
    pointer-events: none;
    color: var(--accent);
  }
  .top-left {
    top: 10px;
    left: 10px;
    border-top: 1px solid;
    border-left: 1px solid;
  }
  .top-right {
    top: 10px;
    right: 10px;
    border-top: 1px solid;
    border-right: 1px solid;
  }
  .bottom-left {
    bottom: 10px;
    left: 10px;
    border-bottom: 1px solid;
    border-left: 1px solid;
  }
  .bottom-right {
    right: 10px;
    bottom: 10px;
    border-right: 1px solid;
    border-bottom: 1px solid;
  }
  .canvas-footer {
    display: flex;
    justify-content: space-between;
    padding: 14px 1px;
    color: var(--disabled);
    font-family: var(--font-roboto-mono);
    font-size: 10px;
    letter-spacing: 0.03em;
    font-variant-numeric: tabular-nums;
  }
  .canvas-footer span {
    display: flex;
    align-items: center;
    gap: 7px;
  }
</style>
