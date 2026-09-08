<script lang="ts">
  import { onMount } from 'svelte';

  type Tool = 'brush' | 'line' | 'rectangle' | 'circle' | 'fill';
  type Brush = 'pen' | 'pencil' | 'spray';
  type Point = { x: number; y: number };

  let canvas = $state<HTMLCanvasElement>();
  let canvasShell = $state<HTMLDivElement>();
  let context = $state<CanvasRenderingContext2D>();
  let tool = $state<Tool>('brush');
  let brush = $state<Brush>('pen');
  let colour = $state('#f05b4f');
  let brushSize = $state(12);
  let isDrawing = $state(false);
  let startPoint = $state<Point | null>(null);
  let shapeOrigin = $state<Point | null>(null);
  let snapshot = $state<ImageData | null>(null);
  let history = $state<ImageData[]>([]);
  let historyIndex = $state(-1);
  let canvasWidth = $state(1200);
  let canvasHeight = $state(760);
  let cursorPreview = $state<{ x: number; y: number } | null>(null);
  let cursorPreviewSize = $derived(
    brushSize *
      (canvasShell && canvasWidth ? canvasShell.clientWidth / canvasWidth : 1) *
      (brush === 'spray' ? 4.2 : 1)
  );

  const tools: { id: Tool; label: string; icon: string }[] = [
    { id: 'brush', label: 'Brush', icon: '✦' },
    { id: 'line', label: 'Line', icon: '╱' },
    { id: 'rectangle', label: 'Rectangle', icon: '▱' },
    { id: 'circle', label: 'Circle', icon: '○' },
    { id: 'fill', label: 'Fill', icon: '◒' }
  ];

  const brushes: { id: Brush; label: string }[] = [
    { id: 'pen', label: 'Pen' },
    { id: 'pencil', label: 'Pencil' },
    { id: 'spray', label: 'Spray can' }
  ];

  onMount(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  });

  function resizeCanvas() {
    if (!canvas || !canvasShell) return;
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
    context.fillStyle = '#fffdf8';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    if (hadDrawing) context.drawImage(previousCanvas, 0, 0, canvasWidth, canvasHeight);
    history = [context.getImageData(0, 0, canvasWidth, canvasHeight)];
    historyIndex = 0;
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
    if (tool === 'brush') drawBrush(point, point);
  }

  function drawStroke(event: PointerEvent) {
    if (!isDrawing || !context || !startPoint) return;
    const point = pointFromEvent(event);
    if (tool === 'brush') drawBrush(startPoint, point);
    else if (shapeOrigin) {
      if (snapshot) context.putImageData(snapshot, 0, 0);
      drawShape(shapeOrigin, point);
    }
    if (tool === 'brush') startPoint = point;
  }

  function handlePointerMove(event: PointerEvent) {
    trackPointer(event);
    drawStroke(event);
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
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = colour;
    context.fillStyle = colour;
    context.lineWidth = brushSize;
    context.globalAlpha = brush === 'pencil' ? 0.46 : 1;
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
    context.globalAlpha = 1;
    context.beginPath();
    if (tool === 'line') {
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
    } else if (tool === 'rectangle') {
      context.rect(from.x, from.y, to.x - from.x, to.y - from.y);
    } else {
      const radius = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
      context.arc(from.x, from.y, radius, 0, Math.PI * 2);
    }
    context.stroke();
  }

  function floodFill(startX: number, startY: number) {
    if (!context) return;
    const image = context.getImageData(0, 0, canvasWidth, canvasHeight);
    const pixels = image.data;
    const index = (startY * canvasWidth + startX) * 4;
    const target = [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]];
    const replacement = hexToRgb(colour);
    if (
      target[0] === replacement[0] &&
      target[1] === replacement[1] &&
      target[2] === replacement[2]
    )
      return;
    const tolerance = 48;
    const matchesTarget = (pixel: number) =>
      Math.abs(pixels[pixel] - target[0]) <= tolerance &&
      Math.abs(pixels[pixel + 1] - target[1]) <= tolerance &&
      Math.abs(pixels[pixel + 2] - target[2]) <= tolerance &&
      Math.abs(pixels[pixel + 3] - target[3]) <= tolerance;
    const stack: Point[] = [{ x: startX, y: startY }];
    while (stack.length) {
      const point = stack.pop()!;
      if (point.x < 0 || point.x >= canvasWidth || point.y < 0 || point.y >= canvasHeight) continue;
      const current = (point.y * canvasWidth + point.x) * 4;
      if (!matchesTarget(current)) continue;
      pixels[current] = replacement[0];
      pixels[current + 1] = replacement[1];
      pixels[current + 2] = replacement[2];
      pixels[current + 3] = 255;
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
  }

  function undo() {
    if (!context || historyIndex <= 0) return;
    historyIndex -= 1;
    context.putImageData(history[historyIndex], 0, 0);
  }

  function redo() {
    if (!context || historyIndex >= history.length - 1) return;
    historyIndex += 1;
    context.putImageData(history[historyIndex], 0, 0);
  }

  function download(format: 'png' | 'webp') {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `canvas-${new Date().toISOString().slice(0, 10)}.${format}`;
    link.href = canvas.toDataURL(`image/${format}`, 0.92);
    link.click();
  }
</script>

<svelte:head>
  <title>Canvas Studio</title>
  <meta name="description" content="A focused browser drawing studio" />
</svelte:head>

<main class="studio-shell">
  <header class="topbar">
    <a class="brand" href="https://example.com/" aria-label="Canvas Studio home"
      ><span class="brand-mark">C</span><span>Canvas <em>Studio</em></span></a
    >
    <div class="topbar-meta">
      <span class="live-dot"></span>Local workspace <span class="meta-divider"></span>Untitled
      canvas
    </div>
    <div class="top-actions">
      <button
        class="icon-button"
        aria-label="Undo"
        title="Undo"
        onclick={undo}
        disabled={historyIndex <= 0}>↶</button
      >
      <button
        class="icon-button"
        aria-label="Redo"
        title="Redo"
        onclick={redo}
        disabled={historyIndex >= history.length - 1}>↷</button
      >
      <div class="export-menu">
        <button class="export-button" onclick={() => download('png')}>Export <span>↓</span></button
        ><button class="export-webp" onclick={() => download('webp')} aria-label="Export WebP"
          >WebP</button
        >
      </div>
    </div>
  </header>

  <section class="workspace">
    <aside class="sidebar">
      <div class="side-heading"><span>Tools</span></div>
      <div class="tool-grid">
        {#each tools as item (item.id)}<button
            class:active={tool === item.id}
            class="tool-button"
            onclick={() => (tool = item.id)}
            aria-label={item.label}
            title={item.label}
            ><span class="tool-icon">{item.icon}</span><span>{item.label}</span></button
          >{/each}
      </div>
      <div class="control-section">
        <div class="section-label">Brush type</div>
        <div class="brush-list">
          {#each brushes as item (item.id)}<button
              class:active={brush === item.id}
              class="brush-option"
              onclick={() => (brush = item.id)}
              ><span class="brush-preview {item.id}"></span><span>{item.label}</span></button
            >{/each}
        </div>
      </div>
      <div class="control-section size-section">
        <div class="section-label"><span>Size</span><strong>{brushSize}px</strong></div>
        <input aria-label="Brush size" type="range" min="2" max="60" bind:value={brushSize} />
        <div class="range-labels"><span>Fine</span><span>Bold</span></div>
      </div>
      <div class="control-section colour-section">
        <div class="section-label">Colour</div>
        <label class="colour-picker" style={`--picked: ${colour}`}
          ><input aria-label="Brush colour" type="color" bind:value={colour} /><span
            class="colour-swatch"
          ></span><span>{colour.toUpperCase()}</span><span class="picker-arrow">⌄</span></label
        >
        <div class="swatches">
          {#each ['#1b1d24', '#f05b4f', '#f6b84b', '#64b5a2', '#5b7cfa', '#f3eee3'] as swatch (swatch)}<button
              class:chosen={colour === swatch}
              class="swatch"
              style={`background: ${swatch}`}
              aria-label={`Use ${swatch}`}
              onclick={() => (colour = swatch)}
            ></button>{/each}
        </div>
      </div>
    </aside>

    <div class="canvas-column">
      <div class="canvas-header">
        <div>
          <span class="eyebrow">Workspace / 01</span>
          <h1>Make something <i>real.</i></h1>
        </div>
        <span class="canvas-size">{canvasWidth} × {canvasHeight}</span>
      </div>
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
        {#if cursorPreview && tool !== 'fill'}
          <span
            class="brush-ghost"
            aria-hidden="true"
            style={`left: ${cursorPreview.x}px; top: ${cursorPreview.y}px; width: ${cursorPreviewSize}px; height: ${cursorPreviewSize}px`}
          ></span>
        {/if}
        <div class="canvas-corner top-left"></div>
        <div class="canvas-corner top-right"></div>
        <div class="canvas-corner bottom-left"></div>
        <div class="canvas-corner bottom-right"></div>
      </div>
      <div class="canvas-footer">
        <span><b class="status-dot"></b> Ready to draw</span><span
          >Drag to create · {brushSize}px {brush}</span
        >
      </div>
    </div>
  </section>
</main>
