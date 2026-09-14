<script lang="ts">
  type Props = {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    onDownload: (format: 'png' | 'webp') => void;
  };

  let { canUndo, canRedo, onUndo, onRedo, onClear, onDownload }: Props = $props();
</script>

<header>
  <div class="header-actions">
    <div class="undo-redo-clear">
      <div class="undo-redo">
        <button
          class="icon-button"
          aria-label="Undo"
          title="Undo"
          onclick={onUndo}
          disabled={!canUndo}
        >
          ↶
        </button>
        <button
          class="icon-button"
          aria-label="Redo"
          title="Redo"
          onclick={onRedo}
          disabled={!canRedo}
        >
          ↷
        </button>
      </div>
      <button class="clear-button" onclick={onClear}>Clear</button>
    </div>

    <div class="export-menu">
      <button class="export-button" onclick={() => onDownload('png')}>Export <span>↓</span></button>
      <button class="export-webp" onclick={() => onDownload('webp')} aria-label="Export WebP">
        WebP
      </button>
    </div>
  </div>
</header>

<style>
  header {
    height: 74px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4vw;
    border-bottom: 1px solid var(--border);
    background: var(--background-muted1);
  }

  .header-actions {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 7px;
  }

  .undo-redo-clear,
  .undo-redo,
  .export-menu {
    display: flex;
    align-items: center;
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
    border-radius: var(--radius);
    font-size: var(--font-20);
    line-height: 1;
  }

  .clear-button {
    height: 34px;
    padding: 0 12px;
    border: 1px solid hsl(from var(--border) h s calc(l + 20));
    border-radius: var(--radius);
    color: var(--text);
    background: var(--background-muted2);
    font-size: var(--font-12);
  }

  .icon-button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .export-menu {
    gap: 0;
  }

  .export-button {
    padding: 0 13px;
    border-radius: var(--radius) 0 0 var(--radius);
    border-right: 0;
    font-size: var(--font-12);
    /* font-weight: 700; */
    display: flex;
    align-items: center;
    gap: 1em;
  }

  .export-button span {
    color: var(--accent);
    font-size: var(--font-16);
    margin-top: -0.2em;
  }

  .export-webp {
    width: 42px;
    border-radius: 0 var(--radius) var(--radius) 0;
    font-family: var(--font-roboto-mono);
    font-size: var(--font-8);
    color: var(--disabled);
  }

  @media (max-width: 500px) {
    .export-menu {
      margin-left: 0;
    }
    .export-button {
      padding: 0 9px;
    }
  }
</style>
