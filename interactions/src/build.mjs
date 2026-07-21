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

// hand cursors — original, simplified line-icon style (stroke, not filled):
// each finger is a rounded arch, the palm + thumb one smooth stroke. Inspired
// by modern gesture icon sets, drawn from scratch (CC0).
const HS = 0.82; // hand scale relative to other cursors
// finger arch ∩: up left side, over the rounded top, down the right side
const arch = (x, w, yTop, ylL, ylR) => [
  [x, ylL], [x, yTop + 0.3], [x + w * 0.5, yTop], [x + w, yTop + 0.3], [x + w, ylR],
];
// palm + 4th finger + thumb, one continuous stroke. `nub` = top y of the 4th
// finger; the rest of the hand body is shared across all three hands.
const palm = (nub) => [
  [17, nub + 1], [17, nub], [18.5, nub], [20, nub + 1],       // 4th finger nub
  [20, 16], [19, 20], [16, 22], [12, 22], [8.5, 20.5],        // right side + bottom
  [7, 18], [5.5, 15.5], [5, 14],                              // bottom-left / heel
  [5.3, 12.8], [6.4, 13], [8, 14.5],                          // thumb
];
function handItem(name, fingers, nub) {
  const strokes = [...fingers, palm(nub)].map((pts) =>
    poly(pts.map(([x, y]) => [x * HS, y * HS]), { closed: false, w: 2 })
  );
  add(name, strokes);
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

// pointing hand: tall index (far left) + two folded-finger bumps + palm
handItem("Hand pointer (Finger)",
  [arch(8, 3, 4.5, 13, 12), arch(11, 3, 9.5, 12, 11.5), arch(14, 3, 10.5, 11.5, 11.5)], 11.5);

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

// grabbing (fist): four short finger bumps + palm
handItem("Grabbing (closed hand)",
  [arch(8, 3, 7.5, 11, 10.5), arch(11, 3, 6.5, 10.5, 10.5), arch(14, 3, 7.5, 10.5, 10.5)], 9.5);
// grab (open hand): four fingers up (spread) + palm
handItem("Grab (open hand)",
  [arch(8, 3, 5.5, 13, 12), arch(11, 3, 3.5, 12, 12), arch(14, 3, 5.5, 12, 12)], 12);

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
