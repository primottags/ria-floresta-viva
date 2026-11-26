type Ctx = CanvasRenderingContext2D;

/** Quebra o texto em linhas que caibam na largura dada. */
function wrap(ctx: Ctx, text: string, width: number) {
  const lines: string[] = []; let current = '';
  for (const word of text.split(' ')) { const next = current ? `${current} ${word}` : word; if (ctx.measureText(next).width > width && current) { lines.push(current); current = word; } else current = next; }
  if (current) lines.push(current);
  return lines;
}

/** Carrega o mapa do MapBiomas do município (tira vertical com um quadro por ano, 1985–2025). */
async function loadMap(cod: number) {
  try {
    const index = await fetch('/mapas/indice.json').then(r => r.ok ? r.json() as Promise<Record<string, [number, number]>> : null);
    const size = index?.[String(cod)]; if (!size) return null;
    const img = new Image(); img.src = `/mapas/${cod}.png`; await img.decode();
    return { img, w: size[0], h: size[1] };
  } catch { return null; }
}

/**
 * Cartão 1080×1350 para compartilhar: "eu lembrava X%, era Y%", com o mapa real do
 * MapBiomas no ano da lembrança e em 2025. Sem mapa, mostra barras.
 */
export async function createShareCard(name: string, year: number, guess: number, past: number, today: number, message = '', cod?: number) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Não foi possível criar a imagem.');
  const css = getComputedStyle(document.documentElement);
  const color = (token: string) => css.getPropertyValue(token).trim();
  const forest = color('--share-forest'); const memory = color('--share-memory'); const earth = color('--share-earth');
  ctx.fillStyle = color('--share-background'); ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = forest; ctx.font = '600 29px "Atkinson Hyperlegible"'; ctx.fillText('A FLORESTA DA SUA INFÂNCIA', 80, 110);
  ctx.font = '700 72px "Bricolage Grotesque"';
  let y = 195;
  const nameLines = wrap(ctx, name, 920).slice(0, 2);
  for (const line of nameLines) { ctx.fillText(line, 80, y); y += 80; }

  // A frase principal: lembrança x satélite.
  y += 10;
  ctx.font = '700 50px "Bricolage Grotesque"';
  ctx.fillStyle = forest;
  ctx.fillText('Eu lembrava ', 80, y); let x = 80 + ctx.measureText('Eu lembrava ').width;
  ctx.fillStyle = memory; ctx.fillText(`${guess}%`, x, y); x += ctx.measureText(`${guess}%`).width;
  ctx.fillStyle = forest; ctx.fillText(` de floresta.`, x, y);
  y += 62;
  ctx.font = '36px "Atkinson Hyperlegible"';
  ctx.fillText(`O satélite mostra ${Math.round(past)}% em ${year} e ${Math.round(today)}% hoje.`, 80, y);

  const map = cod ? await loadMap(cod) : null;
  y += 60;
  if (map) {
    // Dois quadros lado a lado: o ano da lembrança e 2025.
    const box = nameLines.length > 1 ? 380 : 440; const gap = 40;
    const scale = Math.min(box / map.w, box / map.h); const dw = map.w * scale; const dh = map.h * scale;
    ctx.imageSmoothingEnabled = false;
    [[year, past, forest], [2025, today, earth]].forEach(([yr, value, tone], i) => {
      const left = 80 + i * (box + gap);
      ctx.fillStyle = forest; ctx.font = '700 34px "Bricolage Grotesque"'; ctx.fillText(String(yr), left, y);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(left, y + 18, box, box);
      const frame = Math.max(0, Math.min(40, (yr as number) - 1985));
      ctx.drawImage(map.img, 0, frame * map.h, map.w, map.h, left + (box - dw) / 2, y + 18 + (box - dh) / 2, dw, dh);
      ctx.fillStyle = tone as string; ctx.font = '700 46px "Bricolage Grotesque"'; ctx.fillText(`${Math.round(value as number)}% floresta`, left, y + 18 + box + 58);
    });
    y += 18 + box + 58;
    ctx.font = '22px "Atkinson Hyperlegible"'; ctx.fillStyle = forest;
    const legend: [string, string][] = [['#1f8d49', 'Floresta'], ['#edde8e', 'Outros usos'], ['#2e7dd7', 'Água']];
    let lx = 80; y += 44;
    for (const [c, label] of legend) { ctx.fillStyle = c; ctx.fillRect(lx, y - 18, 22, 22); ctx.fillStyle = forest; ctx.fillText(label, lx + 32, y); lx += 32 + ctx.measureText(label).width + 36; }
  } else {
    const values = [[`Minha lembrança de ${year}`, guess, memory], [`A floresta em ${year}`, Math.round(past), forest], ['A floresta em 2025', Math.round(today), earth]] as const;
    values.forEach(([label, value, tone], i) => { const top = y + i * 150; ctx.fillStyle = forest; ctx.font = '32px "Atkinson Hyperlegible"'; ctx.fillText(label, 80, top); ctx.fillStyle = tone; ctx.font = '700 80px "Bricolage Grotesque"'; ctx.fillText(`${value}%`, 80, top + 86); ctx.fillRect(330, top + 30, value * 6.7, 50); });
    y += 3 * 150;
  }

  if (message) {
    // Recado opcional da pessoa: até 2 linhas antes da chamada final.
    ctx.fillStyle = forest; ctx.font = 'italic 34px "Atkinson Hyperlegible"';
    y += 56;
    for (const line of wrap(ctx, `“${message}”`, 920).slice(0, 2)) { ctx.fillText(line, 80, y); y += 44; }
  }
  ctx.fillStyle = forest; ctx.font = '700 44px "Bricolage Grotesque"'; ctx.fillText('E você, quanta floresta lembra?', 80, Math.max(y + 60, 1180));
  ctx.font = '24px "Atkinson Hyperlegible"'; ctx.fillText('Fonte: Projeto MapBiomas · Coleção 11 · 1985–2025', 80, 1260); ctx.fillText('Pesquisa de Priscila Motta Gadelha Silva', 80, 1296);
  return new Promise<File>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(new File([blob], 'a-floresta-da-sua-infancia.png', { type: 'image/png' })) : reject(new Error('Não foi possível criar a imagem.')), 'image/png'));
}
