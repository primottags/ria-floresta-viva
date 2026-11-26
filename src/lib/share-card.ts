export async function createShareCard(name: string, year: number, guess: number, past: number, today: number) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Não foi possível criar a imagem.');
  const css = getComputedStyle(document.documentElement);
  const color = (token: string) => css.getPropertyValue(token).trim();
  ctx.fillStyle = color('--share-background'); ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = color('--share-forest'); ctx.font = '600 29px "Atkinson Hyperlegible"'; ctx.fillText('A FLORESTA DA SUA INFÂNCIA', 80, 115);
  ctx.font = '700 76px "Bricolage Grotesque"';
  const words = name.split(' '); let line = ''; let top = 240;
  for (const word of words) { const next = `${line}${word} `; if (ctx.measureText(next).width > 920) { ctx.fillText(line.trim(), 80, top); top += 88; line = `${word} `; } else line = next; }
  ctx.fillText(line.trim(), 80, top);
  const values = [[`Minha lembrança de ${year}`, guess, '--share-memory'], [`A floresta em ${year}`, Math.round(past), '--share-forest'], ['A floresta em 2025', Math.round(today), '--share-earth']] as const;
  values.forEach(([label, value, token], i) => { const y = top + 130 + i * 174; ctx.fillStyle = color('--share-forest'); ctx.font = '32px "Atkinson Hyperlegible"'; ctx.fillText(label, 80, y); ctx.fillStyle = color(token); ctx.font = '700 94px "Bricolage Grotesque"'; ctx.fillText(`${value}%`, 80, y + 100); ctx.fillRect(370, y + 35, value * 6, 50); });
  ctx.fillStyle = color('--share-forest'); ctx.font = '700 48px "Bricolage Grotesque"'; ctx.fillText('E você, quanta floresta lembra?', 80, 1110);
  ctx.font = '25px "Atkinson Hyperlegible"'; ctx.fillText('Fonte: Projeto MapBiomas · Coleção 11 · 1985–2025', 80, 1180); ctx.fillText('Pesquisa de Priscila Motta Gadelha Silva', 80, 1220);
  return new Promise<File>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(new File([blob], 'a-floresta-da-sua-infancia.png', { type: 'image/png' })) : reject(new Error('Não foi possível criar a imagem.')), 'image/png'));
}
