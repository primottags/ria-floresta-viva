import { useEffect, useRef, useState } from 'react';

/**
 * Terreno "com cara de foto de satélite" para o chute. Mistura duas texturas recortadas de
 * imagens Landsat reais da Amazônia (mata fechada e pasto) conforme o percentual escolhido.
 * A mata some a partir das estradas, no desenho de espinha de peixe típico da região:
 * o que fica longe das estradas é o último pedaço a virar pasto.
 * Não representa nenhum município: é só uma paisagem de referência.
 */
const S = 300;

let field: Float32Array | null = null;
let sorted: Float32Array | null = null;
let roadDist: Float32Array | null = null;

function random(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Ruído suave (interpolação cúbica numa grade aleatória). */
function noise(cells: number, seed: number) {
  const rnd = random(seed); const g = Array.from({ length: (cells + 1) * (cells + 1) }, rnd);
  const at = (i: number, j: number) => g[j * (cells + 1) + i] ?? 0;
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const fx = (x / S) * cells; const fy = (y / S) * cells;
    const i = Math.min(cells - 1, Math.floor(fx)); const j = Math.min(cells - 1, Math.floor(fy));
    const u = fade(fx - i); const v = fade(fy - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u; const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * v;
  };
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax; const dy = by - ay; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/** Calcula uma vez a distância até as estradas e o "quanto resiste" de cada pixel. */
function build() {
  if (field) return;
  const roads: [number, number, number, number][] = [];
  const ax = 0; const ay = S * 0.79; const bx = S; const by = S * 0.25; // estrada principal
  roads.push([ax, ay, bx, by]);
  const len = Math.hypot(bx - ax, by - ay); const nx = -(by - ay) / len; const ny = (bx - ax) / len;
  for (let k = 1; k < 8; k++) { // vicinais perpendiculares
    const cx = ax + ((bx - ax) * k) / 8; const cy = ay + ((by - ay) * k) / 8;
    roads.push([cx - nx * S, cy - ny * S, cx + nx * S, cy + ny * S]);
  }
  const n1 = noise(9, 7); const n2 = noise(23, 11);
  field = new Float32Array(S * S); roadDist = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d = Infinity; for (const r of roads) d = Math.min(d, distToSegment(x, y, ...r));
    const k = y * S + x; roadDist[k] = d;
    field[k] = d + (n1(x, y) * 0.75 + n2(x, y) * 0.25) * 60;
  }
  sorted = Float32Array.from(field).sort();
}

function loadPixels(src: string) {
  return new Promise<Uint8ClampedArray>((resolve, reject) => {
    const img = new Image(); img.onload = () => {
      const c = document.createElement('canvas'); c.width = S; c.height = S; const ctx = c.getContext('2d');
      if (!ctx) return reject(new Error('canvas')); ctx.drawImage(img, 0, 0, S, S); resolve(ctx.getImageData(0, 0, S, S).data);
    }; img.onerror = reject; img.src = src;
  });
}

let textures: Promise<[Uint8ClampedArray, Uint8ClampedArray]> | null = null;

export function SatTerrain({ cover, empty = false, flat = false }: { cover: number; empty?: boolean; flat?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [tex, setTex] = useState<[Uint8ClampedArray, Uint8ClampedArray] | null>(null);
  useEffect(() => {
    let alive = true;
    textures ??= Promise.all([loadPixels('/texturas/floresta.jpg'), loadPixels('/texturas/pasto.jpg')]);
    textures.then((t) => { if (alive) setTex(t); }).catch(() => { textures = null; });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d'); if (!ctx || !tex) return;
    build(); if (!field || !sorted || !roadDist) return;
    const [forest, pasture] = tex; const share = Math.max(0, Math.min(100, empty ? 50 : cover)) / 100;
    const idx = Math.floor((1 - share) * (S * S));
    const threshold = share >= 1 ? -Infinity : share <= 0 ? Infinity : (sorted[Math.min(S * S - 1, idx)] ?? 0);
    const out = ctx.createImageData(S, S); const o = out.data;
    for (let k = 0; k < S * S; k++) {
      // Borda suave de ~3 px entre mata e pasto.
      const t = threshold === -Infinity ? 1 : threshold === Infinity ? 0 : Math.max(0, Math.min(1, ((field[k] ?? 0) - threshold) / 3 + 0.5));
      const p = k * 4;
      const mix = (c: number) => (pasture[p + c] ?? 0) + ((forest[p + c] ?? 0) - (pasture[p + c] ?? 0)) * t;
      let r = mix(0); let g = mix(1); let b = mix(2);
      const d = roadDist[k] ?? Infinity;
      if (share < 1 && d < 2.2) { const a = (1 - d / 2.2) * (t > 0.5 ? 0.55 : 0.85); r += (200 - r) * a; g += (176 - g) * a; b += (128 - b) * a; }
      o[p] = r; o[p + 1] = g; o[p + 2] = b; o[p + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }, [tex, cover, empty]);
  return <div className={`sat-terrain${flat ? ' is-flat' : ''}${empty ? ' is-empty' : ''}`} aria-hidden="true"><canvas ref={ref} width={S} height={S} /></div>;
}
