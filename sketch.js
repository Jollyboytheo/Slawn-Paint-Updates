/*
  Slawn Paint
  Keep p5.js and your existing images/ folder.

  Desktop: wheel or +/- to zoom.
  Space+drag or middle-mouse drag to move while zoomed.
  Mobile: pinch to zoom; two-finger drag to move.
  One finger paints.
*/

let icon, logo, clown, car, house;
let thumbnails = {}, toolIcons = {};
let currentTool = "pencil", currentColor = "black";
let host, shell, home, editor, viewport, status, zoomLabel, surface, artwork;
let zoom = 1, fitZoom = 1, history = [], busy = false, strokeState = null;
let pointers = new Map(), gesture = null, spaceHeld = false;
let controls = [], toolButtons = [], swatches = [];
let pencilSize = 1, pencilOptions, pencilSizeButtons = [];

const ART_W = 716;
const ART_H = 430;
const MAX_UNDO = 20;

const AVAILABLE_TOOLS = [
  "eraser", "paint", "pencil", "brush",
  "spray", "line", "rect", "circle"
];

const WEB_COLORS = [
  "black", "gray", "maroon", "olive",
  "green", "teal", "navy", "purple",
  "darkkhaki", "darkgreen", "dodgerblue",
  "royalblue", "blueviolet", "brown",
  "white", "silver", "red", "yellow",
  "lime", "aqua", "blue", "fuchsia",
  "moccasin", "springgreen", "aqua",
  "lightsteelblue", "deeppink", "orange"
];

const effects = ["Paint", "Spray", "Drip"];

let lineWidth = 1;
let brushScale = 1;
let sprayScale = 1;
let selectedEffect = "Paint";

let panel, effectGrid, sizeLabel, sizeRow;
let effectButtons = [], sizeButtons = [];

function preload() {
  thumbnails.blank = loadImage("images/Blank Canvas.png");
  thumbnails.clown = loadImage("images/Batman Canvas.png");
  thumbnails.car = loadImage("images/Superman Canvas.png");
  thumbnails.house = loadImage("images/Dreadful Canvas.png");

  icon = loadImage("images/icon.png");
  logo = loadImage("images/SlawnC.png");

  clown = loadImage("images/Batman.png");
  car = loadImage("images/Superman.png");
  house = loadImage("images/Dreadful.png");

  AVAILABLE_TOOLS.forEach((tool) => {
    toolIcons[tool] = [
      loadImage(`images/${tool}.png`),
      loadImage(`images/${tool}-on.png`)
    ];
  });
}

function setup() {
  if (!document.querySelector('meta[name="viewport"]')) {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1";
    document.head.appendChild(meta);
  }

  const paintStyleElement = document.createElement("style");

  paintStyleElement.textContent = `
    #paint-game {
      width:100%;
      max-width:920px;
      margin:auto;
      color:#000;
      font-family:"Courier New",monospace;
      box-sizing:border-box;
    }

    #paint-game * {
      box-sizing:border-box;
    }

    #paint-game .paint-window {
      width:calc(100% - 100px);
      max-width:820px;
      margin:20px auto;
      background:#c0c0c0;
      padding:4px;
      border:3px outset #eee;
    }

    #paint-game .paint-title {
      height:24px;
      background:navy;
      color:white;
      display:flex;
      align-items:center;
      gap:6px;
      padding:2px 4px;
      font-weight:bold;
    }

    #paint-game .paint-title img {
      width:16px;
      height:16px;
    }

    #paint-game button {
      font:bold 13px "Courier New",monospace;
      color:#000;
      background:#c0c0c0;
      border:3px outset #eee;
      border-radius:0;
      cursor:pointer;
      min-height:36px;
      padding:4px 8px;
    }

    #paint-game button:active,
    #paint-game button.selected {
      border-style:inset;
      background:#ddd;
    }

    #paint-game button:focus-visible {
      outline:2px solid navy;
      outline-offset:1px;
    }

    #paint-game button:disabled {
      opacity:.45;
      cursor:default;
    }

    #paint-game .paint-close {
      margin-left:auto;
      min-height:20px;
      height:20px;
      padding:0 5px;
      line-height:14px;
    }

    #paint-game .paint-home {
      height:510px;
      padding:28px 35px;
      background:#e1e3df;
    }

    #paint-game .paint-logo {
      display:block;
      max-width:100%;
      width:360px;
      height:130px;
      object-fit:contain;
      margin:0 auto 22px;
    }

    #paint-game .paint-choices {
      display:grid;
      grid-template-columns:1fr 1fr;
      justify-items:center;
      gap:4px 50px;
    }

    #paint-game .paint-choices button {
      border:0;
      padding:0;
      background:transparent;
    }

    #paint-game .paint-choices img {
      width:180px;
      max-width:100%;
      height:150px;
      object-fit:contain;
      display:block;
    }

    #paint-game .paint-actions {
      display:flex;
      gap:6px;
      align-items:center;
      flex-wrap:wrap;
      padding:6px 0;
    }

    #paint-game .paint-action {
      min-width:62px;
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:2px;
    }

    #paint-game .paint-action svg {
      width:25px;
      height:25px;
      image-rendering:pixelated;
    }

    #paint-game .paint-workspace {
      min-width:0;
      width:100%;
      display:grid;
      grid-template-columns:76px minmax(0,1fr);
      gap:6px;
    }

    #paint-game .paint-tools {
      display:grid;
      grid-template-columns:repeat(2,32px);
      gap:3px;
      align-content:start;
    }

    #paint-game .paint-tools button {
      width:32px;
      height:36px;
      padding:2px;
    }

    #paint-game .paint-tools img {
      display:block;
      width:24px;
      height:24px;
      object-fit:contain;
    }

    #paint-game .paint-viewport {
      width:100%;
      min-width:0;
      max-width:100%;
      height:1px;
      aspect-ratio:auto;
      contain:inline-size;
      overflow:auto;
      background:white;
      scrollbar-width:none;
      border:2px inset #eee;
      position:relative;
      overscroll-behavior:contain;
      touch-action:none;
    }

    #paint-game .paint-viewport::-webkit-scrollbar {
      width:0;
      height:0;
    }

    #paint-game canvas {
      display:block;
      touch-action:none;
      user-select:none;
      -webkit-user-select:none;
      max-width:none!important;
    }

    #paint-game .paint-palette {
      display:flex;
      gap:10px;
      padding:10px 4px;
      align-items:center;
      min-height:72px;
    }

    #paint-game .paint-current {
      width:44px;
      height:44px;
      flex-shrink:0;
      border:4px inset #eee;
    }

    #paint-game .paint-colors {
      display:grid;
      grid-template-columns:repeat(14,24px);
      gap:4px;
    }

    #paint-game .paint-colors button {
      width:24px;
      height:24px;
      min-height:24px;
      padding:0;
      border-width:2px;
    }

    #paint-game .paint-colors button.selected {
      outline:2px solid navy;
      outline-offset:1px;
    }

    #paint-game .paint-status {
      font-size:12px;
      min-height:24px;
      padding:4px;
      border:2px inset #eee;
    }

    #paint-game .paint-pencil-options {
      display:flex;
      gap:6px;
      flex-wrap:wrap;
      padding:0 0 8px;
    }

    #paint-game .paint-pencil-size {
      width:76px;
      min-height:68px;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:8px;
    }

    #paint-game .paint-pencil-size.selected {
      outline:2px solid #2347cf;
      outline-offset:-6px;
      background:#ddd;
    }

    #paint-game .paint-pencil-preview {
      height:26px;
      display:flex;
      align-items:center;
      justify-content:center;
    }

    #paint-game .paint-pencil-dot {
      display:block;
      border-radius:50%;
      background:currentColor;
    }

    #paint-game [hidden] {
      display:none!important;
    }

    @media(max-width:639px) {
      #paint-game .paint-window {
        width:100%;
        margin:8px auto;
      }

      #paint-game .paint-home {
        height:auto;
        min-height:460px;
        padding:20px 6px;
      }

      #paint-game .paint-choices {
        gap:8px;
      }

      #paint-game .paint-choices img {
        width:145px;
        height:125px;
      }

      #paint-game .paint-logo {
        height:120px;
      }

      #paint-game .paint-workspace {
        grid-template-columns:1fr;
      }

      #paint-game .paint-tools {
        display:flex;
        flex-wrap:wrap;
        gap:4px;
      }

      #paint-game .paint-tools button {
        width:44px;
        height:44px;
        padding:7px;
      }

      #paint-game .paint-viewport {
        min-width:0;
      }

      #paint-game .paint-palette {
        gap:6px;
        padding:10px 2px;
      }

      #paint-game .paint-current {
        width:28px;
        height:38px;
      }

      #paint-game .paint-colors {
        flex:1;
        grid-template-columns:repeat(7,minmax(0,1fr));
        gap:4px;
      }

      #paint-game .paint-colors button {
        width:100%;
        height:32px;
        min-height:32px;
      }

      #paint-game .paint-actions button {
        min-height:44px;
      }
    }
  `;

  document.head.appendChild(paintStyleElement);

  host = document.getElementById("paint-game") || el("div", document.body);
  host.id = "paint-game";

  shell = el("div", host, "paint-window");

  const title = el("div", shell, "paint-title");
  const titleIcon = el("img", title);

  titleIcon.src = "images/icon.png";
  titleIcon.alt = "";

  el("span", title).textContent = "Slawn - Paint";

  const close = button(title, "×", () => {
    if (busy) return;

    cancelInput(true);
    editor.hidden = true;
    home.hidden = false;
  }, "paint-close");

  close.setAttribute("aria-label", "Back to canvas choices");

  home = el("div", shell, "paint-home");

  const brand = el("img", home, "paint-logo");
  brand.src = "images/SlawnC.png";
  brand.alt = "Slawn";

  const choices = el("div", home, "paint-choices");

  [
    ["blank", "Blank Canvas.png", "Blank canvas"],
    ["clown", "Batman Canvas.png", "Batman canvas"],
    ["car", "Superman Canvas.png", "Superman canvas"],
    ["house", "Dreadful Canvas.png", "Dreadful canvas"]
  ].forEach(([key, path, label]) => {
    const b = button(choices, "", () => openCanvas(key));
    const img = el("img", b);

    img.src = "images/" + path;
    img.alt = label;
  });

  editor = el("div", shell);
  editor.hidden = true;

  const actions = el("div", editor, "paint-actions");

  const icons = {
    New: '<path d="M6 2h12l6 6v22H6z" fill="white" stroke="#111" stroke-width="3"/><path d="M18 2v7h6" fill="#ddd" stroke="#111" stroke-width="2"/>',
    Undo: '<path d="M13 3L2 12l11 8v-6h7q10 0 4 9h-9v6h10q14-18-5-21h-7z" fill="#193dd1"/>',
    Save: '<path d="M3 2h23l4 4v24H3z" fill="#2347cf" stroke="#111" stroke-width="2"/><path d="M8 3h15v9H8zM8 19h17v11H8z" fill="#eee"/><path d="M12 22h10M12 26h10" stroke="#555" stroke-width="2"/>'
  };

  [
    ["New", newPage],
    ["Undo", undo],
    ["Save", savePicture]
  ].forEach(([label, fn]) => {
    const b = button(actions, "", fn, "paint-action");

    b.innerHTML =
      '<svg viewBox="0 0 32 32" aria-hidden="true">' +
      icons[label] +
      "</svg><span>" + label + "</span>";

    b.dataset.action = label;
  });

  button(actions, "−", () => setZoom(zoom / 1.25))
    .setAttribute("aria-label", "Zoom out");

  zoomLabel = el("span", actions);
  zoomLabel.style.fontSize = "12px";

  button(actions, "+", () => setZoom(zoom * 1.25))
    .setAttribute("aria-label", "Zoom in");

  button(actions, "Fit", fitView);

  pencilOptions = el("div", editor, "paint-pencil-options");
  pencilOptions.setAttribute("role", "group");
  pencilOptions.setAttribute("aria-label", "Pencil thickness");

  [
    ["Thin", 1, 5],
    ["Medium", 5, 12],
    ["Thick", 10, 22]
  ].forEach(([label, size, previewSize]) => {
    const b = button(pencilOptions, "", () => {
      pencilSize = size;
      syncControls();
    }, "paint-pencil-size");

    b.setAttribute("aria-label", label + " pencil");

    const preview = el("span", b, "paint-pencil-preview");
    preview.setAttribute("aria-hidden", "true");

    const pencilPreviewDot = el(
      "span",
      preview,
      "paint-pencil-dot"
    );

    pencilPreviewDot.style.width = previewSize + "px";
    pencilPreviewDot.style.height = previewSize + "px";

    el("span", b).textContent = label;

    pencilSizeButtons.push({ size, b, pencilPreviewDot });
  });

  const workspace = el("div", editor, "paint-workspace");
  const toolbar = el("div", workspace, "paint-tools");

  AVAILABLE_TOOLS.forEach(name => {
    const b = button(toolbar, "", () => {
      currentTool = name;
      syncControls();
    });

    b.title = name;
    b.setAttribute("aria-label", name);

    const img = el("img", b);
    img.alt = "";
    img.src = "images/" + name + ".png";

    toolButtons.push({ name, b, img });
  });

  viewport = el("div", workspace, "paint-viewport");

  pixelDensity(1);

  surface = createCanvas(ART_W, ART_H);
  surface.parent(viewport);
  surface.elt.setAttribute("aria-label", "Painting canvas");

  artwork = createGraphics(ART_W, ART_H);
  artwork.pixelDensity(1);
  artwork.background("white");

  const palette = el("div", editor, "paint-palette");

  const current = el("div", palette, "paint-current");
  current.id = "paint-current-color";

  const colors = el("div", palette, "paint-colors");

  WEB_COLORS.forEach(name => {
    const b = button(colors, "", () => {
      currentColor = name;
      syncControls();
    });

    b.style.background = name;
    b.title = name;
    b.setAttribute("aria-label", name);

    swatches.push({ name, b });
  });

  status = el("div", editor, "paint-status");
  status.setAttribute("role", "status");

  const c = surface.elt;

  c.addEventListener("pointerdown", pointerDown, { passive: false });
  c.addEventListener("pointermove", pointerMove, { passive: false });
  c.addEventListener("pointerup", pointerUp, { passive: false });

  c.addEventListener("pointercancel", () => cancelInput(true));

  c.addEventListener("lostpointercapture", e => {
    if (pointers.has(e.pointerId)) cancelInput(true);
  });

  viewport.addEventListener("wheel", e => {
    e.preventDefault();

    if (busy || strokeState) return;

    const r = viewport.getBoundingClientRect();

    setZoom(
      zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12),
      e.clientX - r.left - viewport.clientLeft,
      e.clientY - r.top - viewport.clientTop
    );
  }, { passive: false });

  c.addEventListener("contextmenu", e => e.preventDefault());

  window.addEventListener("keydown", e => {
    if (
      editor.hidden ||
      /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
    ) return;

    if (e.code === "Space") {
      e.preventDefault();
      spaceHeld = true;
    }

    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "z"
    ) {
      e.preventDefault();
      undo();
    }
  });

  window.addEventListener("keyup", e => {
    if (e.code === "Space") spaceHeld = false;
  });

  window.addEventListener("blur", () => {
    spaceHeld = false;
    cancelInput(true);
  });

  let paintFitFrame = 0;
  let paintLastWidth = -1;

  const schedulePaintFit = () => {
    if (paintFitFrame) return;

    paintFitFrame = requestAnimationFrame(() => {
      paintFitFrame = 0;

      if (editor.hidden) return;

      const available = Math.floor(viewport.clientWidth);

      if (
        available < 1 ||
        available === paintLastWidth
      ) return;

      paintLastWidth = available;

      cancelInput(true);
      fitView();
    });
  };

  // Observe the outer container, not the frame being resized.
  if (window.ResizeObserver) {
    new ResizeObserver(schedulePaintFit).observe(host);
  }

  window.addEventListener("resize", schedulePaintFit);

  buildEffectOptions();
  syncControls();
}

function el(tag, parent, cls = "") {
  const n = document.createElement(tag);
  n.className = cls;
  parent.appendChild(n);
  return n;
}

function button(parent, label, fn, cls = "") {
  const b = el("button", parent, cls);
  b.type = "button";
  b.textContent = label;

  b.addEventListener("click", () => {
    if (!busy) fn();
  });

  controls.push(b);
  return b;
}

function syncControls() {
  if (pencilOptions) {
    pencilOptions.hidden = currentTool !== "pencil";

    pencilSizeButtons.forEach(({ size, b, pencilPreviewDot }) => {
      b.classList.toggle("selected", size === pencilSize);
      b.setAttribute("aria-pressed", String(size === pencilSize));
      pencilPreviewDot.style.background = currentColor;
    });
  }

  controls.forEach(b => {
    b.disabled =
      busy ||
      (b.dataset.action === "Undo" && !history.length);
  });

  toolButtons.forEach(({ name, b, img }) => {
    b.classList.toggle("selected", name === currentTool);

    b.setAttribute(
      "aria-pressed",
      String(name === currentTool)
    );

    img.src =
      "images/" + name +
      (name === currentTool ? "-on" : "") +
      ".png";
  });

  swatches.forEach(({ name, b }) => {
    b.classList.toggle("selected", name === currentColor);

    b.setAttribute(
      "aria-pressed",
      String(name === currentColor)
    );
  });

  document.getElementById("paint-current-color")
    .style.background = currentColor;

  status.textContent = busy
    ? "Filling…"
    : "Pinch or +/− to zoom • Two-finger drag or Space+drag to move";

  updateEffectControls();
}

function remember() {
  history.push(artwork.get());

  if (history.length > MAX_UNDO) {
    history.shift();
  }

  syncControls();
}

function restore(img) {
  artwork.clear();
  artwork.image(img, 0, 0);
}

function undo() {
  if (busy) return;

  const active = !!strokeState;

  cancelInput(true);

  if (!active && history.length) {
    restore(history.pop());
  }

  syncControls();
}

function newPage() {
  if (busy) return;

  cancelInput(true);

  if (!window.confirm(
    "Clear your painting and restart this page? You can undo this, or save your painting first."
  )) return;

  remember();

  artwork.background("white");

  // Restore the original PNG for the selected page.
  const img = artwork.paintTemplate;

  if (img) {
    const scaleFactor = Math.min(
      ART_W / img.width,
      ART_H / img.height
    );

    artwork.image(
      img,
      (ART_W - img.width * scaleFactor) / 2,
      (ART_H - img.height * scaleFactor) / 2,
      img.width * scaleFactor,
      img.height * scaleFactor
    );
  }

  fitView();
}

function savePicture() {
  if (busy) return;

  cancelInput(false);

  const a = document.createElement("a");
  a.download = "slawn-paint-" + Date.now() + ".png";
  a.href = artwork.canvas.toDataURL("image/png");

  document.body.appendChild(a);
  a.click();
  a.remove();
}

function openCanvas(name) {
  if (busy) return;

  cancelInput(true);

  if (
    history.length &&
    !window.confirm(
      "Open a fresh canvas? Save your current painting first if you want to keep it."
    )
  ) return;

  artwork.paintTemplate = { clown, car, house }[name] || null;

  artwork.background("white");
  history = [];

  const img = artwork.paintTemplate;

  if (img) {
    const scaleFactor = Math.min(
      ART_W / img.width,
      ART_H / img.height
    );

    artwork.image(
      img,
      (ART_W - img.width * scaleFactor) / 2,
      (ART_H - img.height * scaleFactor) / 2,
      img.width * scaleFactor,
      img.height * scaleFactor
    );
  }

  home.hidden = true;
  editor.hidden = false;

  fitView();
  syncControls();
}

function fitView() {
  if (!viewport || !viewport.clientWidth) return;

  fitZoom = Math.floor(viewport.clientWidth) / ART_W;

  // Include the frame's two 2px borders.
  viewport.style.height = (ART_H * fitZoom + 4) + "px";

  setZoom(fitZoom);

  viewport.scrollLeft = 0;
  viewport.scrollTop = 0;
}

function setZoom(
  value,
  cx = viewport.clientWidth / 2,
  cy = viewport.clientHeight / 2
) {
  const old = zoom;

  // Prevent shrinking the page below its fitted size.
  zoom = Math.max(fitZoom, Math.min(8, value));

  surface.elt.style.width = ART_W * zoom + "px";
  surface.elt.style.height = ART_H * zoom + "px";

  viewport.scrollLeft =
    (viewport.scrollLeft + cx) * zoom / old - cx;

  viewport.scrollTop =
    (viewport.scrollTop + cy) * zoom / old - cy;

  zoomLabel.textContent = Math.round(zoom * 100) + "%";
}

function paintPointerPosition(e) {
  const r = surface.elt.getBoundingClientRect();

  return {
    x: constrain(
      (e.clientX - r.left) * ART_W / r.width,
      0,
      ART_W - 1
    ),
    y: constrain(
      (e.clientY - r.top) * ART_H / r.height,
      0,
      ART_H - 1
    )
  };
}

function paintBasePointerDown(e) {
  if (
    busy ||
    (
      e.pointerType === "mouse" &&
      e.button !== 0 &&
      e.button !== 1
    )
  ) return;

  e.preventDefault();

  surface.elt.setPointerCapture(e.pointerId);

  pointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY
  });

  if (pointers.size >= 2) {
    cancelStroke(true);

    const [a, b] = [...pointers.values()];
    const r = viewport.getBoundingClientRect();

    const cx =
      (a.x + b.x) / 2 - r.left - viewport.clientLeft;

    const cy =
      (a.y + b.y) / 2 - r.top - viewport.clientTop;

    gesture = {
      distance: Math.max(
        1,
        Math.hypot(a.x - b.x, a.y - b.y)
      ),
      zoom,
      ax: (viewport.scrollLeft + cx) / zoom,
      ay: (viewport.scrollTop + cy) / zoom
    };

    return;
  }

  if (spaceHeld || e.button === 1) {
    gesture = {
      pan: true,
      x: e.clientX,
      y: e.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop
    };

    return;
  }

  const p = paintPointerPosition(e);

  if (currentTool === "paint") {
    fillAt(p.x, p.y);
    return;
  }

  remember();

  strokeState = {
    start: p,
    last: p,
    tool: currentTool,
    color: currentColor,
    pencilWidth: pencilSize
  };

  if (!["line", "rect", "circle"].includes(currentTool)) {
    mark(p, p);
  }
}

function pointerDown(e) {
  paintBasePointerDown(e);

  if (strokeState && strokeState.tool === "line") {
    strokeState.lineWidth = lineWidth;
  }
}

function pointerMove(e) {
  if (!pointers.has(e.pointerId) || busy) return;

  e.preventDefault();

  pointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY
  });

  if (pointers.size >= 2 && gesture && !gesture.pan) {
    const [a, b] = [...pointers.values()];
    const r = viewport.getBoundingClientRect();

    const cx =
      (a.x + b.x) / 2 - r.left - viewport.clientLeft;

    const cy =
      (a.y + b.y) / 2 - r.top - viewport.clientTop;

    setZoom(
      gesture.zoom *
      Math.hypot(a.x - b.x, a.y - b.y) /
      gesture.distance,
      cx,
      cy
    );

    viewport.scrollLeft = gesture.ax * zoom - cx;
    viewport.scrollTop = gesture.ay * zoom - cy;

    return;
  }

  if (gesture?.pan) {
    viewport.scrollLeft =
      gesture.left + gesture.x - e.clientX;

    viewport.scrollTop =
      gesture.top + gesture.y - e.clientY;

    return;
  }

  if (!strokeState) return;

  const p = paintPointerPosition(e);

  mark(strokeState.last, p);
  strokeState.last = p;
}

function pointerUp(e) {
  if (!pointers.has(e.pointerId)) return;

  e.preventDefault();

  if (strokeState) {
    const p = paintPointerPosition(e);

    mark(strokeState.last, p);
    strokeState.last = p;

    cancelStroke(false);
  }

  pointers.delete(e.pointerId);

  if (surface.elt.hasPointerCapture(e.pointerId)) {
    surface.elt.releasePointerCapture(e.pointerId);
  }

  // Remaining fingers must lift before painting starts again.
  if (!pointers.size) gesture = null;
}

function cancelStroke(rollback) {
  if (!strokeState) return;

  if (rollback) {
    if (history.length) restore(history.pop());
  } else if (
    ["line", "rect", "circle"].includes(strokeState.tool)
  ) {
    shape(artwork, strokeState);
  }

  strokeState = null;
  syncControls();
}

function cancelInput(rollback) {
  cancelStroke(rollback);

  const ids = [...pointers.keys()];

  pointers.clear();
  gesture = null;

  ids.forEach(id => {
    if (surface.elt.hasPointerCapture(id)) {
      surface.elt.releasePointerCapture(id);
    }
  });
}

function paintBasicMark(a, b) {
  const s = strokeState;
  if (!s) return;

  artwork.stroke(s.tool === "eraser" ? "white" : s.color);

  artwork.strokeWeight(
    s.tool === "eraser" ? 10 :
    s.tool === "brush" ? 5 :
    s.tool === "pencil" ? s.pencilWidth : 1
  );

  if (["pencil", "brush", "eraser"].includes(s.tool)) {
    if (a.x === b.x && a.y === b.y) {
      artwork.point(b.x, b.y);
    } else {
      artwork.line(a.x, a.y, b.x, b.y);
    }
  }

  if (s.tool === "spray") {
    for (let i = 0; i < 40; i++) {
      const t = random(TWO_PI);
      const r = random(10);

      artwork.point(
        b.x + cos(t) * r,
        b.y + sin(t) * r
      );
    }
  }
}

function paintBaseShape(g, s) {
  g.push();
  g.noFill();
  g.stroke(s.color);
  g.strokeWeight(1);

  const a = s.start;
  const b = s.last;

  if (s.tool === "line") {
    g.line(a.x, a.y, b.x, b.y);
  }

  if (s.tool === "rect") {
    g.rect(
      Math.min(a.x, b.x),
      Math.min(a.y, b.y),
      Math.abs(b.x - a.x),
      Math.abs(b.y - a.y)
    );
  }

  if (s.tool === "circle") {
    g.ellipse(
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      Math.abs(b.x - a.x),
      Math.abs(b.y - a.y)
    );
  }

  g.pop();
}

function shape(g, s) {
  if (s.tool !== "line") {
    return paintBaseShape(g, s);
  }

  g.push();
  g.stroke(s.color);
  g.strokeWeight(s.lineWidth || lineWidth);

  g.line(
    s.start.x,
    s.start.y,
    s.last.x,
    s.last.y
  );

  g.pop();
}

function paintBaseDraw() {
  if (!artwork) return;

  image(artwork, 0, 0);

  if (
    strokeState &&
    ["line", "rect", "circle"].includes(strokeState.tool)
  ) {
    shape(window, strokeState);
  }
}

function fillAt(x, y) {
  if (busy) return;

  const ctx = artwork.drawingContext;
  let data;

  try {
    data = ctx.getImageData(0, 0, ART_W, ART_H);
  } catch (error) {
    status.textContent =
      "Fill could not read the canvas. Check that image assets are hosted on the same site.";
    return;
  }

  const p = data.data;
  const start = Math.floor(y) * ART_W + Math.floor(x);
  const offset = start * 4;

  const target = Array.from(p.slice(offset, offset + 4));
  const replacement = color(currentColor).levels;

  if (target.every((v, i) => v === replacement[i])) return;

  remember();

  busy = true;
  syncControls();

  const queue = new Int32Array(ART_W * ART_H);
  const seen = new Uint8Array(ART_W * ART_H);

  let head = 0;
  let tail = 0;

  function enqueue(index) {
    if (seen[index]) return;

    seen[index] = 1;

    const k = index * 4;

    for (let c = 0; c < 4; c++) {
      if (Math.abs(p[k + c] - target[c]) > 10) return;
    }

    queue[tail++] = index;
  }

  enqueue(start);

  function batch() {
    try {
      // Bounded work per tick; display only the completed fill.
      for (
        let count = 0;
        count < 2048 && head < tail;
        count++
      ) {
        const i = queue[head++];
        const k = i * 4;

        for (let c = 0; c < 4; c++) {
          p[k + c] = replacement[c];
        }

        const col = i % ART_W;

        if (col > 0) enqueue(i - 1);
        if (col < ART_W - 1) enqueue(i + 1);

        if (i >= ART_W) enqueue(i - ART_W);
        if (i < ART_W * (ART_H - 1)) enqueue(i + ART_W);
      }

      if (head < tail) {
        setTimeout(batch, 0);
        return;
      }

      ctx.putImageData(data, 0, 0);

      busy = false;
      syncControls();
    } catch (error) {
      busy = false;

      if (history.length) restore(history.pop());

      syncControls();

      status.textContent =
        "Fill failed; the painting was restored. Try again.";
    }
  }

  setTimeout(batch, 0);
}

function buildEffectOptions() {
  const effectStyleElement = document.createElement("style");

  effectStyleElement.textContent = `
    #paint-game .fx-panel {
      padding:0 0 8px;
    }

    #paint-game .fx-grid {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:6px;
      margin-bottom:8px;
    }

    #paint-game .fx-card {
      min-width:0;
      padding:6px;
      font-size:12px;
    }

    #paint-game .fx-card.selected,
    #paint-game .fx-size.selected {
      outline:2px solid #2347cf;
      outline-offset:-5px;
      background:#ddd;
    }

    #paint-game canvas.fx-preview {
      width:100%!important;
      height:38px!important;
      background:white;
      margin-bottom:5px;
      pointer-events:none;
    }

    #paint-game .fx-sizes {
      display:flex;
      gap:6px;
      flex-wrap:wrap;
      margin-top:6px;
    }

    #paint-game .fx-size {
      width:76px;
      min-height:68px;
      padding:8px;
    }

    #paint-game .fx-size canvas {
      width:54px!important;
      height:28px!important;
      margin:0 auto 5px;
      pointer-events:none;
    }

    #paint-game .fx-label {
      font-size:13px;
      font-weight:bold;
    }

    @media(max-width:639px) {
      #paint-game .fx-grid {
        grid-template-columns:repeat(3,minmax(0,1fr));
      }
    }
  `;

  document.head.appendChild(effectStyleElement);

  panel = el("div", editor, "fx-panel");
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", "Line and brush options");

  editor.insertBefore(
    panel,
    editor.querySelector(".paint-workspace")
  );

  effectGrid = el("div", panel, "fx-grid");

  effects.forEach(name => {
    const b = button(effectGrid, "", () => {
      selectedEffect = name;
      currentTool = name === "Spray" ? "spray" : "brush";
      syncControls();
    }, "fx-card");

    b.setAttribute("aria-label", name + " brush effect");

    const canvas = el("canvas", b, "fx-preview");
    canvas.width = 140;
    canvas.height = 40;
    canvas.setAttribute("aria-hidden", "true");

    el("span", b).textContent = name;

    effectButtons.push({ name, b, canvas });
  });

  sizeLabel = el("div", panel, "fx-label");
  sizeRow = el("div", panel, "fx-sizes");

  ["Thin", "Medium", "Thick"].forEach((label, index) => {
    const b = button(sizeRow, "", () => {
      if (currentTool === "line") {
        lineWidth = [1, 5, 10][index];
      } else if (currentTool === "spray") {
        sprayScale = [0.55, 1, 1.7][index];
      } else {
        brushScale = [0.55, 1, 1.7][index];
      }

      syncControls();
    }, "fx-size");

    b.setAttribute("aria-label", label + " size");

    const canvas = el("canvas", b);
    canvas.width = 54;
    canvas.height = 28;
    canvas.setAttribute("aria-hidden", "true");

    el("span", b).textContent = label;

    sizeButtons.push({ index, b, canvas });
  });

  syncControls();
}

function updateEffectControls() {
  if (!panel) return;

  const isLine = currentTool === "line";

  panel.hidden = !["line", "brush", "spray"].includes(currentTool);
  effectGrid.hidden = isLine;

  sizeLabel.textContent = isLine
    ? "Line thickness"
    : currentTool === "spray"
      ? "Spray size"
      : "Brush size";

  const mode = currentTool === "spray"
    ? "Spray"
    : selectedEffect;

  effectButtons.forEach(({ name, b, canvas }) => {
    const on = name === mode;

    b.classList.toggle("selected", on);
    b.setAttribute("aria-pressed", String(on));

    fxPreview(canvas, name);
  });

  sizeButtons.forEach(({ index, b, canvas }) => {
    const value = isLine
      ? lineWidth
      : currentTool === "spray"
        ? sprayScale
        : brushScale;

    const on = value === (
      isLine ? [1, 5, 10] : [0.55, 1, 1.7]
    )[index];

    b.classList.toggle("selected", on);
    b.setAttribute("aria-pressed", String(on));

    const c = canvas.getContext("2d");

    c.clearRect(0, 0, 54, 28);
    c.strokeStyle = c.fillStyle = currentColor;
    c.lineCap = "round";

    if (isLine) {
      c.lineWidth = [1, 5, 10][index];

      c.beginPath();
      c.moveTo(12, 22);
      c.lineTo(42, 6);
      c.stroke();
    } else {
      c.beginPath();
      c.arc(27, 14, [3, 6, 11][index], 0, Math.PI * 2);
      c.fill();
    }
  });
}

function mark(a, b) {
  const s = strokeState;

  if (!s || !["brush", "spray"].includes(s.tool)) {
    return paintBasicMark(a, b);
  }

  if (!s.fx) {
    s.fx = {
      mode: s.tool === "spray" ? "Spray" : selectedEffect,
      size: s.tool === "spray" ? sprayScale : brushScale,
      color: s.color,
      distance: 0,
      nextStamp: 0,
      rng: Math.random
    };
  }

  fxRenderEffect(artwork.drawingContext, a, b, s.fx);
}

function draw() {
  const s = strokeState;

  if (s && s.fx && s.fx.mode === "Spray" && !busy) {
    const now = performance.now();

    if (!s.fx.lastTick || now - s.fx.lastTick >= 45) {
      fxStamp(
        artwork.drawingContext,
        s.last.x,
        s.last.y,
        0,
        s.fx
      );

      s.fx.lastTick = now;
    }
  }

  paintBaseDraw();
}

function fxStroke(c, a, b, width, paintColor) {
  c.strokeStyle = paintColor;
  c.lineWidth = width;
  c.lineCap = "round";

  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.stroke();

  if (a.x === b.x && a.y === b.y) {
    c.fillStyle = paintColor;

    c.beginPath();
    c.arc(a.x, a.y, width / 2, 0, Math.PI * 2);
    c.fill();
  }
}

function fxRenderEffect(c, a, b, f) {
  c.save();

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);

  if (f.mode === "Paint" || f.mode === "Drip") {
    fxStroke(c, a, b, 5 * f.size, f.color);
  }

  if (f.mode === "Spray" || f.mode === "Drip") {
    const spacing = (f.mode === "Spray" ? 3 : 18) * f.size;
    const end = f.distance + length;

    for (
      let count = 0;
      count < 2048 && f.nextStamp <= end;
      count++
    ) {
      const t = length
        ? Math.max(
            0,
            Math.min(1, (f.nextStamp - f.distance) / length)
          )
        : 0;

      fxStamp(c, a.x + dx * t, a.y + dy * t, 0, f);
      f.nextStamp += spacing;
    }
  }

  f.distance += length;

  c.restore();
}

function fxStamp(c, x, y, angle, f) {
  c.save();
  c.translate(x, y);
  c.scale(f.size, f.size);

  c.strokeStyle = c.fillStyle = f.color;
  c.lineCap = "round";

  const r = f.rng;

  if (f.mode === "Spray") {
    for (let i = 0; i < 24; i++) {
      const t = r() * Math.PI * 2;
      const radius = Math.sqrt(r()) * 11;

      c.fillRect(
        Math.cos(t) * radius,
        Math.sin(t) * radius,
        1,
        1
      );
    }
  }

  if (f.mode === "Drip") {
    const h = 7 + r() * 20;

    fxStroke(
      c,
      { x: 0, y: 0 },
      { x: 0, y: h },
      2,
      f.color
    );

    c.beginPath();
    c.arc(0, h, 2, 0, Math.PI * 2);
    c.fill();
  }

  c.restore();
}

function fxPreview(canvas, mode) {
  const c = canvas.getContext("2d");

  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = "white";
  c.fillRect(0, 0, canvas.width, canvas.height);

  let seed = 21;

  const f = {
    mode,
    size: 0.65,
    color: currentColor,
    distance: 0,
    nextStamp: 0,
    rng: () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
  };

  let a = { x: 8, y: 20 };

  for (let x = 10; x <= 132; x += 2) {
    const b = {
      x,
      y: 20 + Math.sin((x - 8) / 20) * 7
    };

    fxRenderEffect(c, a, b, f);
    a = b;
  }
}