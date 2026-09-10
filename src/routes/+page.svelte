<script lang="ts">
  import { onMount } from 'svelte';

  type Tool = 'brush' | 'line' | 'rectangle' | 'circle' | 'fill';
  type Brush = 'pen' | 'pencil' | 'spray';
  type Point = { x: number; y: number };

  const canvasBackground = 'rgb(14, 14, 14)';

  let canvas = $state<HTMLCanvasElement>();
  let canvasShell = $state<HTMLDivElement>();
  let context = $state<CanvasRenderingContext2D>();
  let tool = $state<Tool>('brush');
  let brush = $state<Brush>('pen');
  let colour = $state('#ff1938');
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
    // window.addEventListener('resize', resizeCanvas);
    // return () => window.removeEventListener('resize', resizeCanvas);
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
    context.fillStyle = canvasBackground;
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
  <meta name="description" content="Painting / drawing app" />
</svelte:head>

<main class="studio-shell">
  <header>
    <div class="footer-actions">
      <div class="undo-redo">
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
      </div>
      <div class="export-menu">
        <button class="export-button" onclick={() => download('png')}>
          Export <span>↓</span>
        </button>

        <button class="export-webp" onclick={() => download('webp')} aria-label="Export WebP">
          WebP
        </button>
      </div>
    </div>
  </header>
  <section class="workspace">
    <aside class="sidebar">
      <!-- tools -->
      <div class="side-heading"><span>Tools</span></div>
      <div class="tool-grid">
        {#each tools as item (item.id)}
          <button
            class:active={tool === item.id}
            class="tool-button"
            onclick={() => (tool = item.id)}
            aria-label={item.label}
            title={item.label}
          >
            <span class="tool-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        {/each}
      </div>

      <!-- brushes -->
      <div class="control-section">
        <div class="section-label">Brush type</div>
        <div class="brush-list">
          {#each brushes as item (item.id)}
            <button
              class:active={brush === item.id}
              class="brush-option"
              onclick={() => (brush = item.id)}
            >
              <span class="brush-preview {item.id}"></span>
              <span>{item.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- size -->
      <div class="control-section size-section">
        <div class="section-label">
          <span>Size</span>
          <strong>{brushSize}px</strong>
        </div>

        <input aria-label="Brush size" type="range" min="2" max="60" bind:value={brushSize} />
        <!-- <div class="range-labels">
          <span>Fine</span>
          <span>Bold</span>
        </div> -->
      </div>

      <div class="control-section colour-section">
        <div class="section-label">Colour</div>
        <label class="colour-picker" style={`--picked: ${colour}`}>
          <input aria-label="Brush colour" type="color" bind:value={colour} />
          <span class="colour-swatch"> </span><span>{colour.toUpperCase()}</span>
          <!-- <span class="picker-arrow">⌄</span> -->
        </label>

        <!-- colour presets -->
        <div class="swatches">
          {#each ['#1b1d24', '#ff1938', '#f6b84b', '#64b5a2', '#5b7cfa', '#f3eee3'] as swatch (swatch)}<button
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

        <!-- size preview -->
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
        <span>{brushSize}px {brush} </span>
        <span class="canvas-size">{canvasWidth} × {canvasHeight}</span>
      </div>
    </div>
  </section>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    --border: hsl(from var(--background) h s calc(l + 13));
    --background-muted1: hsl(from var(--background) h s calc(l + 4));
    --background-muted2: hsl(from var(--background) h s calc(l + 14));
    --disabled: hsl(from var(--text) h s calc(l - 50));
  }
  button,
  input {
    font: inherit;
  }
  button {
    cursor: pointer;
  }
  .studio-shell {
    min-height: 100vh;
  }
  header {
    height: 74px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4vw;
    border-bottom: 1px solid var(--border);
    background: var(--background-muted1);
  }
  /* footer-meta, */
  .canvas-size,
  .section-label,
  /* .range-labels, */
  .canvas-footer,
  .footer-key
  /*, kbd */ {
    font-family: var(--font-roboto-mono);
    font-size: 10px;
    letter-spacing: 0.03em;
  }
  .footer-actions {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 7px;
  }
  .icon-button,
  .export-button,
  .export-webp {
    border: 1px solid hsl(from var(--border) h s calc(l + 20));
    color: var(--text);
    background: var(--background-muted2);
    height: 34px;
  }
  .icon-button {
    width: 34px;
    border-radius: 5px;
    font-size: 20px;
    line-height: 1;
  }
  .icon-button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .export-menu {
    display: flex;
    margin-left: 10px;
  }
  .export-button {
    padding: 0 13px;
    border-radius: 5px 0 0 5px;
    border-right: 0;
    font-size: 12px;
    font-weight: 700;
  }
  .export-button span {
    color: var(--accent);
    margin-left: 6px;
    font-size: 16px;
  }
  .export-webp {
    width: 42px;
    border-radius: 0 5px 5px 0;
    font-family: var(--font-roboto-mono);
    font-size: 9px;
    color: var(--disabled);
  }
  .workspace {
    width: 100%;
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: clamp(28px, 4vw, 64px);
    max-width: 1680px;
    margin: 0 auto;
    padding: 38px 3vw 32px;
  }
  .sidebar {
    border-right: 1px solid var(--border);
    padding-right: 28px;
    min-height: calc(100vh - 174px);
    display: flex;
    flex-direction: column;
  }
  .side-heading,
  .section-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--disabled);
    text-transform: uppercase;
    font-weight: 500;
    font-size: 10px;
    letter-spacing: 0.12em;
  }
  /* kbd {
    color: #aaa79d;
    border: 1px solid #cbc8bf;
    padding: 4px 6px;
    border-radius: 3px;
    font-size: 9px;
  } */
  .tool-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
    margin-top: 17px;
  }
  .tool-button {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 40px;
    padding: 0 10px;
    border: 1px solid transparent;
    border-radius: 5px;
    color: var(--text);
    background: transparent;
    text-align: left;
    font-size: var(--font-12);

    transition: all 0.2s linear;
  }
  /* .tool-button:hover, */
  .tool-button.active {
    background: var(--accent);
    border-color: var(--border);
    /* font-weight: 700; */
    /* letter-spacing: 0.1em; */
  }
  .tool-button.active {
    box-shadow: inset 3px 0 var(--text);
  }
  .tool-icon {
    display: grid;
    place-items: center;
    width: 22px;
    color: var(--text);
    font-size: var(--font-18);
    line-height: 1;
  }
  .control-section {
    border-top: 1px solid var(--border);
    margin-top: 32px;
    padding-top: 23px;
  }
  .brush-list {
    display: grid;
    gap: 4px;
    margin-top: 12px;
  }
  .brush-option {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 32px;
    padding: 0 5px;
    border: 0;
    color: var(--text);
    background: transparent;
    font-size: var(--font-12);
    text-align: left;

    transition: all 0.2s linear;
  }
  .brush-option.active {
    color: hsl(from var(--background) h s calc(l + 44));
    /* opacity: 0.6; */
    font-weight: 700;
    letter-spacing: 0.1em;
  }
  .brush-preview {
    width: 35px;
    height: 10px;
    display: block;
    border-radius: 50%;
    background: var(--text);
  }
  .brush-preview.pencil {
    opacity: 0.42;
    height: 4px;
  }
  .brush-preview.spray {
    width: 35px;
    height: 15px;
    background: radial-gradient(var(--text) 1px, transparent 1.5px);
    background-size: 5px 5px;
    opacity: 0.7;
  }
  .size-section {
    margin-top: 28px;
  }
  .section-label strong {
    color: var(--disabled);
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
  }
  input[type='range'] {
    width: 100%;
    margin: 19px 0 4px;
    accent-color: var(--accent);
  }

  /* .range-labels {
    justify-content: space-between;
    display: flex;
    color: var(--disabled);
    font-size: 9px;
  } */
  .colour-picker {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    margin-top: 12px;
    padding: 0 9px;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: var(--background-muted1);
    color: var(--picked);
    font-family: var(--font-roboto-mono);
    font-size: var(--font-10);
    letter-spacing: 0.2em;
    cursor: pointer;
  }
  .colour-picker input {
    position: absolute;
    opacity: 0;
    width: 1px;
  }
  .colour-swatch {
    width: 17px;
    height: 17px;
    border-radius: 3px;
    background: var(--picked);
    border: 1px solid rgba(0, 0, 0, 0.12);
  }
  /* .picker-arrow {
    margin-left: auto;
    font-size: 15px;
    color: #9a978f;
  } */
  .swatches {
    display: flex;
    justify-content: space-between;
    margin-top: 13px;
  }
  .swatch {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(27, 29, 36, 0.14);
  }
  .swatch.chosen {
    outline: 2px solid var(--border);
    outline-offset: 2px;
  }
  /* .sidebar-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: auto;
    padding-top: 28px;
    color: #858279;
    font-size: 10px;
  } */
  /* .shortcut-key {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: 1px solid #cbc8bf;
    border-radius: 3px;
    color: #5f5d57;
  } */
  .canvas-column {
    min-width: 0;
    padding-top: 8px;
  }
  .canvas-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 24px;
  }
  .canvas-size {
    color: var(--disabled);
    margin-bottom: 4px;
  }
  .canvas-shell {
    position: relative;
    overflow: hidden;
    width: 100%;
    aspect-ratio: 1.45;
    max-height: 800px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--background-muted2);
    box-shadow: 0 15px 40px rgba(234, 233, 230, 0.08);
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
    font-size: 9px;
  }
  .canvas-footer span {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  @media (max-width: 800px) {
    .workspace {
      grid-template-columns: 1fr;
      padding: 32px 20px;
      gap: 30px;
    }
    .sidebar {
      min-height: auto;
      border-right: 0;
      border-bottom: 1px solid var(--border);
      padding: 0 0 25px;
    }
    .sidebar-footer {
      display: none;
    }
    .tool-grid {
      grid-template-columns: repeat(5, 1fr);
    }
    .tool-button {
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      padding: 5px;
    }
    .tool-button.active {
      box-shadow: inset 0 -3px rgb(255, 255, 255);
    }
    .control-section {
      margin-top: 20px;
      padding-top: 17px;
      width: 100%;
      padding-inline: 1em;
    }
    .colour-section {
      margin-left: 0;
    }
    .swatches {
      padding-inline: 1em;
    }
    .brush-list {
      grid-template-columns: repeat(3, 1fr);
    }
    .canvas-header {
      margin-top: 0;
    }
  }

  @media (max-width: 500px) {
    .export-menu {
      margin-left: 0;
    }
    .export-button {
      padding: 0 9px;
    }
    .workspace {
      padding-left: 14px;
      padding-right: 14px;
    }
    .canvas-header {
      display: block;
    }

    .canvas-size {
      display: block;
      margin-top: 13px;
    }
    .tool-grid {
      gap: 2px;
    }
    .tool-button {
      font-size: 9px;
    }
    .tool-icon {
      font-size: 17px;
    }
  }
</style>
