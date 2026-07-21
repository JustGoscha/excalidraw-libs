# interactions

Standard mouse-pointer and touch-interaction items for Excalidraw — for design
and interaction explanations, click-through docs, and UX flows.

![preview](./dist/preview.png)

All 19 items are grouped, so each drops in as a single object you can resize,
recolor and rotate.

## Contents

### Cursors
- **Pointer (Arrow)** — the classic default cursor
- **Hand pointer (Finger)** — link / clickable
- **Text (I-beam)** — editable text
- **Crosshair** — precision / draw
- **Move (4-way)** — move / pan
- **Resize ↕ (NS)**, **Resize ↔ (EW)**, **Resize ⤡ (NWSE)**, **Resize ⤢ (NESW)**
- **Grab (open hand)**, **Grabbing (closed hand)** — draggable / dragging
- **Not allowed** — disabled / blocked
- **Zoom in**, **Zoom out**

### Interaction indicators
- **Click / Tap** — pulse ring + label
- **Double click** — concentric rings
- **Long press / Hold**
- **Drag** — dashed path with arrowhead
- **Pointer + click** — arrow cursor with a click ripple (great for "click here")

## Rebuild

```bash
bun install        # once, for the svg-path-properties dev dependency
bun src/build.mjs
```

Geometry lives in [`src/build.mjs`](./src/build.mjs); it emits the
`.excalidrawlib` and the SVG/PNG preview from the same source. The three hand
shapes are sampled from the Phosphor SVGs in [`src/icons/`](./src/icons).

## License

CC0 1.0 for all original shapes; the three hand cursors are derived from
[Phosphor Icons](https://phosphoricons.com) (MIT). See
[CREDITS.md](../CREDITS.md).
