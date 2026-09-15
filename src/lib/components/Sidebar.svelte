<script lang="ts">
  import type { Brush, Tool } from '$lib/paint-types';

  type Props = {
    tool: Tool;
    brush: Brush;
    colour: string;
    brushSize: number;
    savedColours: string[];
    onToolChange: (tool: Tool) => void;
    onBrushChange: (brush: Brush) => void;
    onColourChange: (colour: string) => void;
    onBrushSizeChange: (size: number) => void;
    onSaveColour: () => void;
    onRemoveSavedColour: (colour: string) => void;
    collapsed: boolean;
    onToggleCollapsed: () => void;
  };

  let {
    tool,
    brush,
    colour,
    brushSize,
    savedColours,
    onToolChange,
    onBrushChange,
    onColourChange,
    onBrushSizeChange,
    onSaveColour,
    onRemoveSavedColour,
    collapsed,
    onToggleCollapsed
  }: Props = $props();

  const tools: { id: Tool; label: string; icon: string }[] = [
    { id: 'brush', label: 'Brush', icon: '✦' },
    { id: 'line', label: 'Line', icon: '╱' },
    { id: 'rectangle', label: 'Rectangle', icon: '▱' },
    { id: 'circle', label: 'Circle', icon: '○' },
    { id: 'fill', label: 'Fill', icon: '◒' },
    { id: 'eraser', label: 'Eraser', icon: '⌫' }
  ];
  const brushes: { id: Brush; label: string }[] = [
    { id: 'pen', label: 'Pen' },
    { id: 'chalk', label: 'Chalk' },
    { id: 'spray', label: 'Spray can' }
  ];
  const presets = ['#1b1d24', '#ff1938', '#f6b84b', '#64b5a2', '#5b7cfa', '#f3eee3'];
</script>

<aside class:collapsed class="sidebar">
  <div class="side-heading">
    <span>Tools</span>
    <button
      class="collapse-button"
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      onclick={onToggleCollapsed}>{collapsed ? '›' : '‹'}</button
    >
  </div>
  <div class="tool-grid">
    {#each tools as item (item.id)}
      <button
        class:active={tool === item.id}
        class="tool-button"
        onclick={() => onToolChange(item.id)}
        aria-label={item.label}
        title={item.label}
      >
        <span class="tool-icon">{item.icon}</span><span class="tool-label">{item.label}</span>
      </button>
    {/each}
  </div>

  <div class="control-section">
    <div class="section-label">Brush type</div>
    <div class="brush-list">
      {#each brushes as item (item.id)}
        <button
          class:active={brush === item.id}
          class="brush-option"
          onclick={() => onBrushChange(item.id)}
        >
          <span class="brush-preview {item.id}"></span><span>{item.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="control-section size-section">
    <div class="section-label"><span>Size</span><strong>{brushSize}px</strong></div>
    <input
      aria-label="Brush size"
      type="range"
      min="2"
      max="60"
      value={brushSize}
      oninput={(event) => onBrushSizeChange(Number(event.currentTarget.value))}
    />
  </div>

  <div class="control-section colour-section">
    <div class="section-label">Colour</div>
    <label class="colour-picker" style={`--picked: ${colour}`}>
      <input
        aria-label="Brush colour"
        type="color"
        value={colour}
        oninput={(event) => onColourChange(event.currentTarget.value)}
      />
      <span class="colour-swatch"></span><span>{colour.toUpperCase()}</span>
    </label>
    <div class="swatches">
      {#each presets as swatch (swatch)}
        <button
          class:chosen={colour === swatch}
          class="swatch"
          style={`background: ${swatch}`}
          aria-label={`Use ${swatch}`}
          onclick={() => onColourChange(swatch)}
        ></button>
      {/each}
    </div>
    <button class="save-colour" onclick={onSaveColour}>Save colour</button>
    {#if savedColours.length > 0}
      <div class="saved-colours" aria-label="Saved colours">
        {#each savedColours as savedColour (savedColour)}
          <div class="saved-colour">
            <button
              class="saved-swatch"
              class:chosen={colour === savedColour}
              style={`background: ${savedColour}`}
              aria-label={`Use saved colour ${savedColour}`}
              title={savedColour.toUpperCase()}
              onclick={() => onColourChange(savedColour)}
            ></button>
            {#if colour === savedColour}<button
                class="remove-colour"
                aria-label={`Remove saved colour ${savedColour}`}
                title="Remove saved colour"
                onclick={() => onRemoveSavedColour(savedColour)}>&times;</button
              >{/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    border-right: 1px solid var(--border);
    padding-right: 28px;
    min-height: calc(100vh - 174px);
    display: flex;
    flex-direction: column;
    transition:
      width 0.2s ease,
      padding 0.2s ease;
  }
  .sidebar.collapsed {
    padding-right: 12px;
  }
  .sidebar.collapsed .side-heading {
    justify-content: center;
  }
  .sidebar.collapsed .side-heading > span,
  .sidebar.collapsed .tool-label,
  .sidebar.collapsed .control-section {
    display: none;
  }
  .collapse-button {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    background: var(--background-muted2);
    font-size: var(--font-18);
    line-height: 1;
  }
  .collapse-button:hover {
    border-color: var(--text);
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
    border-radius: var(--radius);
    color: var(--text);
    background: transparent;
    text-align: left;
    font-size: var(--font-12);
    transition: all 0.2s linear;
  }
  .sidebar.collapsed .tool-grid {
    grid-template-columns: 1fr;
    margin-top: 17px;
  }
  .sidebar.collapsed .tool-button {
    justify-content: center;
    padding: 0;
  }
  .tool-button.active {
    background: var(--accent);
    border-color: var(--border);
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
    font-weight: 700;
    letter-spacing: 0.1em;
  }
  .brush-preview {
    width: 35px;
    height: 10px;
    display: block;
    border-radius: 16px;
    background: var(--text);
  }
  .brush-preview.chalk {
    height: 12px;
    border-radius: 45%;
    opacity: 0.82;
    background:
      radial-gradient(circle at 12% 45%, var(--text) 0 1px, transparent 1.5px),
      radial-gradient(circle at 31% 65%, var(--text) 0 1px, transparent 1.5px),
      radial-gradient(circle at 48% 35%, var(--text) 0 1px, transparent 1.5px),
      linear-gradient(to bottom, hsl(from var(--text) h s calc(l - 28)), var(--text));
    background-size:
      8px 8px,
      9px 9px,
      7px 7px,
      100% 100%;
  }
  .brush-preview.spray {
    height: 15px;
    border-radius: 400%;
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
  .colour-picker {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    margin-top: 12px;
    padding: 0 9px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
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
  .swatches {
    display: flex;
    justify-content: space-between;
    margin-top: 13px;
  }
  .swatch,
  .saved-swatch {
    border: 2px solid transparent;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(27, 29, 36, 0.14);
  }
  .swatch {
    width: 20px;
    height: 20px;
  }
  .swatch.chosen,
  .saved-swatch.chosen {
    outline: 2px solid var(--border);
    outline-offset: 2px;
  }
  .save-colour {
    width: 100%;
    height: 30px;
    margin-top: 15px;
    border: 1px solid hsl(from var(--border) h s calc(l + 20));
    border-radius: var(--radius);
    color: var(--text);
    background: var(--background-muted2);
    font-size: var(--font-12);
  }
  .saved-colours {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }
  .saved-colour {
    position: relative;
  }
  .saved-swatch {
    width: 23px;
    height: 23px;
  }
  .remove-colour {
    position: absolute;
    top: -8px;
    right: -7px;
    display: grid;
    place-items: center;
    width: 14px;
    height: 14px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 50%;
    color: var(--text);
    background: var(--background-muted2);
    font-size: 11px;
    line-height: 0;
  }
  @media (max-width: 800px) {
    .sidebar {
      min-height: auto;
      border-right: 0;
      border-bottom: 1px solid var(--border);
      padding: 0 0 25px;
    }
    .tool-grid {
      grid-template-columns: repeat(6, 1fr);
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
    .swatches {
      padding-inline: 1em;
    }
    .brush-list {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (max-width: 500px) {
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
