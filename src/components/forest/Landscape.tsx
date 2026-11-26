const trees = Array.from({ length: 100 }, (_, i) => {
  const row = i < 40 ? 0 : i < 75 ? 1 : 2;
  const index = row === 0 ? i : row === 1 ? i - 40 : i - 75;
  const count = row === 0 ? 40 : row === 1 ? 35 : 25;
  return { rank: (i * 37 + 11) % 100, x: (index + .5) * (1440 / count) + Math.sin(i * 2.7) * 13, y: ([365, 438, 525][row] ?? 525) + Math.sin(i * 1.9) * 18, size: ([.42, .7, 1.04][row] ?? 1.04) + (i % 3) * .07, tone: (i + row) % 4 };
}).sort((a, b) => a.y - b.y);

function Tree({ x, y, size, tone, visible, stump }: { x: number; y: number; size: number; tone: number; visible: boolean; stump: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    {stump && <g className={visible ? 'scene-stump hidden-stump' : 'scene-stump'}><ellipse cx="0" cy="0" rx="34" ry="8" /><path d="M-8 0V-14H8V0" /></g>}
    <g className={`tree tree-tone-${tone} ${visible ? '' : 'tree-gone'}`}>
      <path className="tree-trunk" d="M-4 0 0-88 5 0Z" />
      <path d="M0-146C-21-144-30-129-27-113C-49-115-60-96-53-78C-74-62-61-34-40-36C-31-11-8-21 0-25C21-11 41-21 43-38C71-33 77-64 57-79C65-100 48-118 30-114C34-132 16-148 0-146Z" />
      <path className="tree-vein" d="M0-27V-126M0-64-27-87M0-80 23-101" />
    </g>
  </g>;
}

export const MEMORY_OPTIONS = ['Igarapé ou rio para tomar banho', 'Mata fechada perto de casa', 'Bicho cantando à noite', 'Quintal ou roça com fruta', 'Pasto com gado', 'Fumaça de queimada na seca', 'Caminhão de tora na estrada', 'Rua de terra', 'Asfalto e prédios'] as const;
const has = (list: readonly string[], i: number) => list.includes(MEMORY_OPTIONS[i] ?? '');

/** Elementos que ficam no chão, embaixo das árvores: rio, estrada e rua de terra. */
function GroundMemories({ list }: { list: readonly string[] }) {
  return <g className="memory-ground">
    {has(list, 0) && <><path className="scene-river" d="M743 351C667 385 837 393 784 423C744 454 558 480 561 560H848C783 481 918 447 842 414C761 382 775 367 787 350Z"/><path className="scene-river-light" d="M754 367c-35 18 57 24 56 42M779 445c-40 16-106 43-113 61"/></>}
    {(has(list, 6) || has(list, 8)) && <path className={has(list, 8) ? 'scene-asphalt' : 'scene-road'} d="M1010 352C1040 400 1120 460 1230 560H1380C1230 470 1100 400 1040 350Z" />}
    {has(list, 7) && <path className="scene-dirt" d="M300 560C330 500 390 470 360 420C340 390 300 380 330 352H350C330 380 380 395 400 425C430 470 380 510 400 560Z" />}
  </g>;
}

/** Elementos que ficam na frente: casa, quintal, gado, fumaça, caminhão, prédios e bichos. */
function FrontMemories({ list }: { list: readonly string[] }) {
  return <g className="memory-front">
    {has(list, 8) && <g className="scene-buildings"><rect x="1250" y="250" width="56" height="110"/><rect x="1312" y="215" width="44" height="145"/><rect x="1362" y="270" width="60" height="90"/><path className="scene-window" d="M1262 270h10m14 0h10M1262 300h10m14 0h10M1322 240h10m0 30h-10m0 30h10M1374 290h10m14 0h10"/></g>}
    {has(list, 5) && <g className="scene-smoke"><path d="M560 340c-30-40 20-60-10-100s30-70 5-110"/><path d="M590 345c-20-30 25-55 0-90s35-55 15-95"/></g>}
    <g className="scene-house" transform="translate(400 478) scale(.9)"><path className="house-roof" d="M-62 -40 0-92 62-40Z"/><rect className="house-wall" x="-50" y="-42" width="100" height="62"/><rect className="house-door" x="-12" y="-14" width="24" height="34"/><rect className="house-window" x="18" y="-30" width="20" height="18"/></g>
    {has(list, 3) && <g className="scene-yard" transform="translate(515 500)"><path className="tree-trunk" d="M-3 0 0-50 4 0Z"/><circle className="yard-crown" cx="0" cy="-62" r="30"/><circle className="yard-fruit" cx="-12" cy="-58" r="5"/><circle className="yard-fruit" cx="10" cy="-70" r="5"/><circle className="yard-fruit" cx="8" cy="-50" r="5"/></g>}
    {has(list, 4) && [[850, 440, .95], [915, 418, .8], [970, 448, .9]].map(([x, y, k]) => <g key={x} className="scene-cow" transform={`translate(${x} ${y}) scale(${k})`}><ellipse cx="0" cy="-22" rx="30" ry="15"/><circle cx="30" cy="-30" r="9"/><path d="M-20 -10v14M-8 -10v14M12 -10v14M22 -10v14"/></g>)}
    {has(list, 6) && <g className="scene-truck" transform="translate(1060 470) scale(.8)"><rect x="-70" y="-48" width="96" height="36" rx="4"/><rect className="truck-cab" x="26" y="-56" width="40" height="44" rx="4"/><circle className="truck-wheel" cx="-46" cy="-8" r="11"/><circle className="truck-wheel" cx="44" cy="-8" r="11"/><path className="truck-logs" d="M-66-56h88M-66-64h88"/></g>}
    {has(list, 2) && <g className="scene-fireflies">{[[420, 300], [610, 270], [880, 300], [1050, 260], [240, 330], [700, 240]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5"/>)}</g>}
  </g>;
}

export const levelY = (pct: number) => 505 - pct * 4;

export function Landscape({ cover, ghost, intro = false, stumps = false, emptyLabel = false, memories }: { cover: number; ghost?: number | undefined; intro?: boolean; stumps?: boolean; emptyLabel?: boolean; memories?: readonly string[] | undefined }) {
  const count = Math.round(cover);
  return <svg className={`landscape ${intro ? 'landscape-intro' : ''}`} viewBox="0 0 1440 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <circle className="scene-sun" cx="1160" cy="112" r="55" />
    <g className="scene-cloud"><path d="M207 91c9-17 28-17 39-4 12-23 42-17 46 2h37c8 0 8 9 0 9H195c-8 0-7-7 1-7Z"/><path d="M932 172c10-15 28-14 35-4 12-17 34-12 38 3h24c10 0 10 8 0 8H919c-8 0-8-7 0-7Z"/></g>
    <path className="scene-hill-far" d="M0 285Q140 165 295 279Q440 341 600 284Q769 225 920 278Q1100 171 1240 262Q1361 220 1440 240V560H0Z" />
    <path className="scene-hill-near" d="M0 325Q189 250 364 343Q555 279 719 327Q916 362 1077 294Q1292 239 1440 323V560H0Z" />
    <path className="scene-earth" d="M0 370Q240 307 477 357Q730 412 932 343Q1190 306 1440 356V560H0Z" />
    <path className="scene-furrows" d="M90 445c150-28 306-26 452 2m269 13c175-37 350-35 523-7M140 520c210-34 400-27 584 8m154 0c181-24 337-24 474-2" />
    {intro && <><path className="scene-river" d="M743 351C667 385 837 393 784 423C744 454 558 480 561 560H848C783 481 918 447 842 414C761 382 775 367 787 350Z"/><path className="scene-river-light" d="M754 367c-35 18 57 24 56 42M779 445c-40 16-106 43-113 61"/></>}
    {memories && <GroundMemories list={memories} />}
    {trees.map((tree, i) => <Tree key={i} {...tree} visible={tree.rank < count} stump={stumps} />)}
    {memories && <FrontMemories list={memories} />}
    <g className="scene-birds" fill="none"><path d="m1070 150 9-4 8 5m-47-24 8-4 7 4m-796 78 8-4 8 4"/></g>
    {emptyLabel && <text className="scene-hint" x="720" y="245" textAnchor="middle">Toque abaixo para plantar sua lembrança</text>}
    {ghost !== undefined && <g className="scene-ghost"><path d={`M0 ${levelY(ghost)}H1440`} /><rect x="24" y={levelY(ghost) - 54} width="330" height="42" rx="21" /><text x="44" y={levelY(ghost) - 25}>Sua memória · {ghost}%</text></g>}
  </svg>;
}

export function Canopy({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? 'canopy filled' : 'canopy'}><path d="M12 2c-4 0-6 3-5 6-5 0-7 7-3 9 1 3 5 4 8 2 4 3 9 0 9-3 3-4-1-9-4-8 1-3-1-6-5-6Z"/><path className="canopy-stem" d="M12 21V10m0 5-4-3m4 5 4-4"/></svg>;
}
