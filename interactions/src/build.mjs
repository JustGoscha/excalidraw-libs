// Build script: generates interactions.excalidrawlib + preview.svg from one
// geometry source. Original vector work — released CC0.
// Run: bun src/build.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "..", "dist");

// ---- palette ------------------------------------------------------------
const INK = "#1e1e1e";     // cursor outline / ink
const FILL = "#ffffff";    // cursor body fill
const RED = "#e03131";     // not-allowed
const BLUE = "#1971c2";    // interaction accent
const GREEN = "#2f9e44";

const S = 2.4; // global scale

// ---- deterministic id / seed generator ---------------------------------
let _n = 0x1a2b3c;
const rnd = () => (_n = (_n * 1103515245 + 12345) & 0x7fffffff);
const seed = () => rnd() % 2147483647;
const id = () => {
  const a = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 12; i++) s += a[rnd() % a.length];
  return s;
};

// ---- element factories --------------------------------------------------
function baseEl(type, extra) {
  return {
    id: id(),
    type,
    x: 0, y: 0, width: 0, height: 0, angle: 0,
    strokeColor: INK,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: seed(),
    version: 1,
    versionNonce: seed(),
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    ...extra,
  };
}

// polyline / polygon. pts in unit space. closed => filled polygon.
function poly(pts, { closed = false, stroke = INK, fill = "transparent", w = 2, dashed = false, start = null, end = null, type = "line" } = {}) {
  const P = pts.map(([x, y]) => [x * S, y * S]);
  const xs = P.map((p) => p[0]); const ys = P.map((p) => p[1]);
  const minx = Math.min(...xs); const miny = Math.min(...ys);
  const rel = P.map(([x, y]) => [x - minx, y - miny]);
  if (closed) rel.push([...rel[0]]);
  return baseEl(type, {
    x: minx, y: miny,
    width: Math.max(...xs) - minx,
    height: Math.max(...ys) - miny,
    points: rel,
    strokeColor: stroke,
    backgroundColor: closed ? fill : "transparent",
    fillStyle: "solid",
    strokeWidth: w,
    strokeStyle: dashed ? "dashed" : "solid",
    roundness: closed ? { type: 2 } : { type: 2 },
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: start,
    endArrowhead: end,
    polygon: !!closed,
  });
}

// double / single headed arrow (type=arrow so heads render)
function arrow(pts, { start = "triangle", end = "triangle", w = 2.5, stroke = INK } = {}) {
  return poly(pts, { type: "arrow", start, end, w, stroke });
}

function ellipse(cx, cy, r, { stroke = INK, fill = "transparent", w = 2 } = {}) {
  return baseEl("ellipse", {
    x: (cx - r) * S, y: (cy - r) * S,
    width: 2 * r * S, height: 2 * r * S,
    strokeColor: stroke, backgroundColor: fill, fillStyle: "solid",
    strokeWidth: w, roundness: null,
  });
}

function label(text, x, y) {
  const fs = 16;
  return baseEl("text", {
    x: x * S, y: y * S,
    width: text.length * fs * 0.55, height: fs * 1.25,
    text, originalText: text,
    fontSize: fs, fontFamily: 1, textAlign: "center", verticalAlign: "top",
    lineHeight: 1.25, baseline: fs, containerId: null,
    strokeColor: INK, roundness: null, strokeWidth: 1,
  });
}

// ---- geometry: cursors --------------------------------------------------
// Each entry -> one library item: { name, shapes: [...] }
const items = [];
const add = (name, shapes) => items.push({ name, shapes });

// classic arrow pointer (tip at 0,0)
add("Pointer (Arrow)", [
  poly([[0,0],[0,16],[3.6,12.6],[6.1,18.2],[8.4,17.1],[5.8,11.6],[10.6,11.6]],
    { closed: true, fill: FILL }),
]);

// pointing hand (hyperlink hand): index finger up on the LEFT (not centered,
// so it reads as pointing, not a rude gesture), thumb out left, folded fingers
// as a lower rounded hump to the right — the classic OS "link" cursor.
const HAND = [
  [4.6,0.2],[5.4,0.6],[5.8,1.7],[5.9,6.8],          // index finger, right side down
  [6.8,6.6],[7.4,5.9],[8.2,5.8],[8.9,6.4],           // folded finger 1 (lower than index)
  [9.3,6.0],[10.0,6.0],[10.6,6.6],                    // folded finger 2
  [11.0,6.4],[11.6,6.7],[12.1,7.4],[12.4,8.8],       // folded finger 3 + outer palm
  [12.3,14.8],[11.6,17.8],[10.3,19.4],[5.8,19.8],    // right side + bottom
  [3.7,18.9],[3.2,16.2],                              // bottom-left / heel
  [2.2,12.9],[1.5,11.3],[1.8,10.2],[3.0,10.4],[3.4,9.1], // thumb (out to the left)
  [3.7,6.9],[3.7,2.0],[4.1,0.7],                      // left side up to finger tip
];
add("Hand pointer (Finger)", [ poly(HAND, { closed: true, fill: FILL }) ]);

// text I-beam
add("Text (I-beam)", [
  poly([[0,0],[6,0]], { w: 2 }),
  poly([[0,20],[6,20]], { w: 2 }),
  poly([[3,0],[3,20]], { w: 2 }),
]);

// crosshair (with center gap)
add("Crosshair", [
  poly([[0,7],[5,7]]), poly([[9,7],[14,7]]),
  poly([[7,0],[7,5]]), poly([[7,9],[7,14]]),
]);

// move — 4-way arrow
add("Move (4-way)", [
  arrow([[7,0],[7,20]]),
  arrow([[0,10],[14,10]]),
]);

// resize arrows
add("Resize ↕ (NS)", [ arrow([[0,0],[0,20]]) ]);
add("Resize ↔ (EW)", [ arrow([[0,0],[20,0]]) ]);
add("Resize ⤡ (NWSE)", [ arrow([[0,0],[15,15]]) ]);
add("Resize ⤢ (NESW)", [ arrow([[0,15],[15,0]]) ]);

// grabbing (closed fist): rounded body, 4 knuckle bumps across the top,
// thumb tucked across the left — the pan "grabbing" cursor.
const FIST = [
  [3.3,8.8],[3.5,7.7],[4.4,7.2],[5.2,7.7],          // knuckle 1
  [5.5,7.6],[5.9,7.0],[6.7,6.9],[7.1,7.5],          // knuckle 2
  [7.4,7.4],[7.8,6.9],[8.6,6.9],[9.0,7.5],          // knuckle 3
  [9.3,7.5],[9.7,7.1],[10.5,7.2],[11.1,7.9],        // knuckle 4
  [11.5,9.3],[11.5,14.2],[10.7,16.9],[8.8,18.0],    // right side + bottom
  [5.3,17.8],[3.5,16.3],[2.9,13.7],                  // bottom-left
  [2.3,12.0],[2.5,10.7],[3.4,10.6],[3.9,11.2],       // thumb bump (front/left)
  [3.6,9.8],
];
add("Grabbing (closed hand)", [ poly(FIST, { closed: true, fill: FILL }) ]);

// grab (open hand): four fingers up (slightly spread) + thumb out left —
// the pan "grab" / open-hand cursor.
const OPEN = [
  [4.6,6.6],[4.7,3.2],[5.1,2.6],[5.7,2.6],[6.1,3.2],[6.1,6.1],  // finger 1
  [6.5,5.7],[6.6,2.1],[7.0,1.5],[7.6,1.5],[8.0,2.1],[8.1,5.7],  // finger 2 (tallest)
  [8.5,6.0],[8.6,2.4],[9.0,1.8],[9.6,1.8],[10.0,2.4],[10.1,6.3],// finger 3
  [10.5,6.5],[10.7,3.9],[11.1,3.3],[11.7,3.4],[12.1,4.1],[12.2,7.6], // finger 4 (pinky)
  [12.1,13.6],[11.3,16.7],[9.0,18.1],[5.4,17.7],[3.8,15.8],     // right + bottom
  [3.1,13.4],[2.0,11.6],[1.6,10.4],[2.3,9.6],[3.4,10.1],[4.0,9.1],[4.2,7.0], // thumb + left
];
add("Grab (open hand)", [ poly(OPEN, { closed: true, fill: FILL }) ]);

// not-allowed
add("Not allowed", [
  ellipse(7, 7, 7, { stroke: RED, w: 2.5 }),
  poly([[2.4,2.4],[11.6,11.6]], { stroke: RED, w: 2.5 }),
]);

// zoom in / out (magnifier)
add("Zoom in", [
  ellipse(7, 7, 6, { stroke: INK, fill: FILL, w: 2.5 }),
  poly([[11.2,11.2],[17,17]], { w: 3 }),
  poly([[7,3.8],[7,10.2]], { w: 2 }),
  poly([[3.8,7],[10.2,7]], { w: 2 }),
]);
add("Zoom out", [
  ellipse(7, 7, 6, { stroke: INK, fill: FILL, w: 2.5 }),
  poly([[11.2,11.2],[17,17]], { w: 3 }),
  poly([[3.8,7],[10.2,7]], { w: 2 }),
]);

// ---- geometry: interaction indicators -----------------------------------
// click / tap — dot + radiating pulse ring
add("Click / Tap", [
  ellipse(7, 7, 2.2, { stroke: BLUE, fill: BLUE, w: 1 }),
  ellipse(7, 7, 6.5, { stroke: BLUE, w: 2 }),
  poly([[7,-1.5],[7,-3.5]], { stroke: BLUE, w: 2 }),
  poly([[7,17.5],[7,19.5]], { stroke: BLUE, w: 2 }),
  poly([[-1.5,7],[-3.5,7]], { stroke: BLUE, w: 2 }),
  poly([[15.5,7],[17.5,7]], { stroke: BLUE, w: 2 }),
  label("click", 0.5, 14),
]);

// double click — dot + two rings
add("Double click", [
  ellipse(7, 7, 2.2, { stroke: BLUE, fill: BLUE, w: 1 }),
  ellipse(7, 7, 6, { stroke: BLUE, w: 2 }),
  ellipse(7, 7, 9, { stroke: BLUE, w: 1.5 }),
  label("double", 0, 17),
]);

// long press — dot + arc ring (dashed)
add("Long press / Hold", [
  ellipse(7, 7, 2.2, { stroke: GREEN, fill: GREEN, w: 1 }),
  ellipse(7, 7, 7, { stroke: GREEN, w: 2.5, }),
  label("hold", 1, 16),
]);

// drag — grab dot + dashed path to arrowhead
add("Drag", [
  ellipse(2, 4, 2, { stroke: BLUE, fill: BLUE, w: 1 }),
  poly([[2,4],[10,4],[18,10]], { stroke: BLUE, w: 2.5, dashed: true, type: "arrow", end: "triangle" }),
  label("drag", 2, 12),
]);

// cursor + click ripple — arrow with pulse at tip (great for "click here")
add("Pointer + click", [
  ellipse(0, 0, 5, { stroke: BLUE, w: 2 }),
  poly([[0,0],[0,16],[3.6,12.6],[6.1,18.2],[8.4,17.1],[5.8,11.6],[10.6,11.6]],
    { closed: true, fill: FILL }),
]);

// ---- emit excalidrawlib -------------------------------------------------
const libraryItems = items.map((it) => {
  const gid = id();
  const elements = it.shapes.map((el) => ({ ...el, groupIds: [gid] }));
  return { status: "published", id: id(), created: 1, name: it.name, elements };
});

const lib = {
  type: "excalidrawlib",
  version: 2,
  source: "https://github.com/JustGoscha/excalidraw-libs",
  libraryItems,
};
writeFileSync(join(OUT, "interactions.excalidrawlib"), JSON.stringify(lib, null, 2));

// ---- emit SVG preview grid ---------------------------------------------
const COLS = 6;
const CELL = 120;
const cells = items.map((it, i) => {
  const cx = (i % COLS) * CELL;
  const cy = Math.floor(i / COLS) * CELL;
  // compute bbox of item in scaled space
  const parts = [];
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  const bump = (x, y) => { minx = Math.min(minx, x); miny = Math.min(miny, y); maxx = Math.max(maxx, x); maxy = Math.max(maxy, y); };
  for (const el of it.shapes) {
    if (el.type === "ellipse") { bump(el.x, el.y); bump(el.x + el.width, el.y + el.height); }
    else if (el.type === "text") { bump(el.x, el.y); bump(el.x + 40, el.y + el.height); }
    else { for (const [px, py] of el.points) { bump(el.x + px, el.y + py); } }
  }
  const bw = maxx - minx, bh = maxy - miny;
  const scale = Math.min((CELL - 40) / Math.max(bw, 1), (CELL - 46) / Math.max(bh, 1), 1.6);
  const ox = cx + (CELL - bw * scale) / 2 - minx * scale;
  const oy = cy + 24 + (CELL - 40 - bh * scale) / 2 - miny * scale;
  const T = (x, y) => [ (x * scale + ox).toFixed(1), (y * scale + oy).toFixed(1) ];
  for (const el of it.shapes) {
    if (el.type === "ellipse") {
      const rx = (el.width / 2) * scale, ry = (el.height / 2) * scale;
      const [cxp, cyp] = T(el.x + el.width / 2, el.y + el.height / 2);
      parts.push(`<ellipse cx="${cxp}" cy="${cyp}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${el.backgroundColor === 'transparent' ? 'none' : el.backgroundColor}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}"/>`);
    } else if (el.type === "text") {
      const [tx, ty] = T(el.x, el.y);
      parts.push(`<text x="${tx}" y="${(+ty + 12).toFixed(1)}" font-family="Comic Sans MS, cursive" font-size="${(el.fontSize * scale).toFixed(1)}" fill="${el.strokeColor}" text-anchor="start">${el.text}</text>`);
    } else {
      const d = el.points.map(([px, py], k) => { const [X, Y] = T(el.x + px, el.y + py); return `${k ? 'L' : 'M'}${X} ${Y}`; }).join(" ") + (el.polygon ? " Z" : "");
      const dash = el.strokeStyle === "dashed" ? ` stroke-dasharray="6 5"` : "";
      let head = "";
      if (el.type === "arrow") head = ` marker-end="url(#tri)"${el.startArrowhead ? ' marker-start="url(#tris)"' : ''}`;
      parts.push(`<path d="${d}" fill="${el.polygon ? (el.backgroundColor === 'transparent' ? 'none' : el.backgroundColor) : 'none'}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"${dash}${head}/>`);
    }
  }
  parts.push(`<text x="${cx + CELL / 2}" y="${cy + 14}" font-family="sans-serif" font-size="9" fill="#666" text-anchor="middle">${it.name}</text>`);
  return parts.join("\n");
});

const rows = Math.ceil(items.length / COLS);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * CELL}" height="${rows * CELL}" viewBox="0 0 ${COLS * CELL} ${rows * CELL}">
<defs>
<marker id="tri" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${INK}"/></marker>
<marker id="tris" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${INK}"/></marker>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
${cells.join("\n")}
</svg>`;
writeFileSync(join(OUT, "preview.svg"), svg);

console.log(`Wrote ${libraryItems.length} items -> dist/interactions.excalidrawlib + dist/preview.svg`);
