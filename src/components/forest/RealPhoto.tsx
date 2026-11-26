import { useQuery } from '@tanstack/react-query';

/** Anos das fotos de satélite (tira JPEG por município, um quadro por ano, de cima para baixo). */
export const PHOTO_YEARS = [1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025];

/** Ano de foto mais próximo do ano pedido. */
export function nearestPhotoYear(year: number) {
  return PHOTO_YEARS.reduce((best, y) => (Math.abs(y - year) < Math.abs(best - year) ? y : best), PHOTO_YEARS[0] ?? 1985);
}

export function usePhotoIndex() {
  return useQuery({ queryKey: ['photo-index'], queryFn: async () => { const r = await fetch('/fotos/indice.json'); if (!r.ok) return {} as Record<string, [number, number]>; return r.json() as Promise<Record<string, [number, number]>>; }, staleTime: Infinity });
}

/** Foto de satélite em cores naturais (Landsat) do município, no ano de foto mais próximo. */
export function RealPhoto({ cod, year, size }: { cod: number; year: number; size: [number, number] }) {
  const frames = PHOTO_YEARS.length; const frame = Math.max(0, PHOTO_YEARS.indexOf(nearestPhotoYear(year)));
  return <div className="real-photo" role="img" aria-label={`Foto de satélite do município em ${nearestPhotoYear(year)}`} style={{ aspectRatio: `${size[0]} / ${size[1]}`, backgroundImage: `url(/fotos/${cod}.jpg)`, backgroundSize: `100% ${frames * 100}%`, backgroundPositionY: `${(frame / (frames - 1)) * 100}%` }} />;
}

/** Bloco da revelação: a foto do ano da lembrança ao lado da foto de 2025. Some se não houver foto. */
export function PhotoPair({ cod, year, name }: { cod: number; year: number; name: string }) {
  const index = usePhotoIndex(); const size = index.data?.[String(cod)];
  if (!size) return null;
  const then = nearestPhotoYear(year);
  return <section className="photo-pair" aria-labelledby="fotos-titulo">
    <h2 id="fotos-titulo" className="photo-pair-title">Do alto, como uma foto</h2>
    <p className="help">{name} visto pelo satélite Landsat, em cores naturais. Verde-escuro é mata; bege e marrom são pasto, roça e solo exposto. A linha branca é o limite do município.</p>
    <div className="photo-pair-grid">
      <figure><RealPhoto cod={cod} year={then} size={size} /><figcaption>{then}{then !== year ? <small> (foto mais próxima de {year})</small> : null}</figcaption></figure>
      <figure><RealPhoto cod={cod} year={2025} size={size} /><figcaption>2025</figcaption></figure>
    </div>
    <p className="method-note">Imagens: Landsat 5, 7, 8 e 9 (USGS/NASA), mediana da estação seca sem nuvens, processadas no Google Earth Engine. Os percentuais vêm do MapBiomas.</p>
  </section>;
}
