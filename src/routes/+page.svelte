<script lang="ts">
  import { onMount } from 'svelte';
  import type { Brush, Tool } from '$lib/paint-types';

  import Canvas from '$lib/components/Canvas.svelte';
  import Header from '$lib/components/Header.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';

  let clearDialog = $state<HTMLDialogElement>();
  let canvasController = $state<{
    undoCanvas: () => void;
    redoCanvas: () => void;
    clearCanvasFromParent: () => void;
    downloadCanvas: (format: 'png' | 'webp') => void;
  }>();

  let tool = $state<Tool>('brush');
  let brush = $state<Brush>('pen');
  let colour = $state('#ff1938');
  let brushSize = $state(12);
  let savedColours = $state<string[]>([]);
  let historyIndex = $state(-1);
  let historyLength = $state(0);

  onMount(() => {
    const storedColours = localStorage.getItem('canvas-studio-colours');
    if (!storedColours) return;
    try {
      const parsedColours = JSON.parse(storedColours);
      if (Array.isArray(parsedColours))
        savedColours = parsedColours.filter(
          (value): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
        );
    } catch {
      localStorage.removeItem('canvas-studio-colours');
    }
  });

  function saveColour() {
    if (savedColours.includes(colour)) return;
    savedColours = [...savedColours, colour];
    localStorage.setItem('canvas-studio-colours', JSON.stringify(savedColours));
  }

  function removeSavedColour(savedColour: string) {
    savedColours = savedColours.filter((value) => value !== savedColour);
    localStorage.setItem('canvas-studio-colours', JSON.stringify(savedColours));
  }

  function openClearDialog() {
    clearDialog?.showModal();
  }

  function clearCanvas() {
    canvasController?.clearCanvasFromParent();
    clearDialog?.close();
  }
</script>

<svelte:head>
  <title>Canvas Studio</title>
  <meta name="description" content="Painting / drawing app" />
</svelte:head>

<main class="studio-shell">
  <Header
    canUndo={historyIndex > 0}
    canRedo={historyIndex < historyLength - 1}
    onUndo={() => canvasController?.undoCanvas()}
    onRedo={() => canvasController?.redoCanvas()}
    onClear={openClearDialog}
    onDownload={(format) => canvasController?.downloadCanvas(format)}
  />

  <section class="workspace">
    <Sidebar
      {tool}
      {brush}
      {colour}
      {brushSize}
      {savedColours}
      onToolChange={(value) => (tool = value)}
      onBrushChange={(value) => (brush = value)}
      onColourChange={(value) => (colour = value)}
      onBrushSizeChange={(value) => (brushSize = value)}
      onSaveColour={saveColour}
      onRemoveSavedColour={removeSavedColour}
    />
    <Canvas
      bind:this={canvasController}
      {tool}
      {brush}
      {colour}
      {brushSize}
      onHistoryChange={(index, length) => {
        historyIndex = index;
        historyLength = length;
      }}
    />
  </section>

  <dialog bind:this={clearDialog} class="clear-dialog">
    <form method="dialog" onsubmit={(event) => event.preventDefault()}>
      <p>Clear the entire canvas?</p>
      <div class="dialog-actions">
        <button type="button" class="dialog-cancel" onclick={() => clearDialog?.close()}>
          Cancel
        </button>
        <button type="button" class="dialog-confirm" onclick={clearCanvas}>Clear</button>
      </div>
    </form>
  </dialog>
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

  button {
    font: inherit;
    cursor: pointer;
  }

  .studio-shell {
    min-height: 100vh;
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

  .clear-dialog {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    color: var(--text);
    background: var(--background-muted1);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.3);
    margin: auto;
  }

  .clear-dialog::backdrop {
    background: rgba(0, 0, 0, 0.55);
  }

  .clear-dialog p {
    margin: 0 0 20px;
    font-size: var(--font-16);
  }

  .dialog-actions {
    display: flex;
    justify-content: center;
    gap: 8px;
  }

  .dialog-cancel,
  .dialog-confirm {
    height: 32px;
    padding: 0 12px;
    border: 1px solid hsl(from var(--border) h s calc(l + 20));
    border-radius: var(--radius);
    color: var(--text);
    background: var(--background-muted2);
    font-size: var(--font-12);
  }

  .dialog-confirm {
    color: var(--text-invert);
    background: var(--accent);
  }

  @media (max-width: 800px) {
    .workspace {
      grid-template-columns: 1fr;
      padding: 32px 20px;
      gap: 30px;
    }
  }

  @media (max-width: 500px) {
    .workspace {
      padding-left: 14px;
      padding-right: 14px;
    }
  }
</style>
