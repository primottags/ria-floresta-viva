/**
 * Bloco isométrico com 100 pedaços de terra (10 x 10), como os pixels de um mapa do MapBiomas.
 * `cover` diz quantos pedaços são floresta. A ordem em que a floresta some imita o avanço
 * a partir de uma estrada: os pedaços perto da borda da frente viram pasto primeiro.
 */
const W = 56; const H = 28; const DEPTH = 16; const N = 10;

const tiles = Array.from({ length: N * N }, (_, k) => {
  const i = k % N; const j = Math.floor(k / N);
  const noise = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  const jitter = (noise - Math.floor(noise)) * 3.2;
  // Quanto maior, mais "protegido" (some por último): longe da estrada da frente.
  const keep = (N - 1 - i) * 0.55 + (N - 1 - j) * 1 + jitter;
  return { i, j, keep, tone: Math.floor((noise - Math.floor(noise)) * 3) };
});
const rankOf = new Map([...tiles].sort((a, b) => b.keep - a.keep).map((t, r) => [t.i * N + t.j, r]));
const drawOrder = [...tiles].sort((a, b) => a.i + a.j - (b.i + b.j) || a.i - b.i);

const cx = (i: number, j: number) => (i - j) * (W / 2);
const cy = (i: number, j: number) => (i + j) * (H / 2);

export function IsoPlot({ cover, empty = false }: { cover: number; empty?: boolean }) {
  const count = Math.round(cover);
  return <svg className={`iso-plot ${empty ? 'iso-empty' : ''}`} viewBox="-300 -80 600 400" role="presentation" aria-hidden="true">
    <ellipse className="iso-shadow" cx="0" cy={cy(N, N) / 2 + 40} rx="300" ry="40" />
    {drawOrder.map(({ i, j, tone }) => {
      const forest = !empty && (rankOf.get(i * N + j) ?? 99) < count;
      const x = cx(i, j); const y = cy(i, j);
      const top = `M${x} ${y - H / 2}L${x + W / 2} ${y}L${x} ${y + H / 2}L${x - W / 2} ${y}Z`;
      return <g key={`${i}-${j}`} className={forest ? 'iso-tile is-forest' : 'iso-tile'}>
        {j === N - 1 && <path className="iso-side-left" d={`M${x - W / 2} ${y}L${x} ${y + H / 2}V${y + H / 2 + DEPTH}L${x - W / 2} ${y + DEPTH}Z`} />}
        {i === N - 1 && <path className="iso-side-right" d={`M${x + W / 2} ${y}L${x} ${y + H / 2}V${y + H / 2 + DEPTH}L${x + W / 2} ${y + DEPTH}Z`} />}
        <path className="iso-top" d={top} />
        <g transform={`translate(${x} ${y + 4})`}><g className={`iso-tree iso-tone-${tone}`} style={{ transitionDelay: `${((i * 7 + j * 3) % 10) * 12}ms` }}>
          <ellipse className="iso-tree-shadow" cx="3" cy="2" rx="15" ry="6" />
          <path className="iso-trunk" d="M-2 0V-14H2V0Z" />
          <circle className="iso-crown" cx="0" cy="-26" r="15" />
          <circle className="iso-crown-light" cx="-5" cy="-31" r="7" />
        </g></g>
      </g>;
    })}
  </svg>;
}
