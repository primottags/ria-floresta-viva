import { useQuery } from '@tanstack/react-query';
import { IsoPlot } from '@/components/forest/IsoPlot';

/** Mapa real do MapBiomas do município no ano dado (tira com 41 quadros, 1985–2025). Sem mapa (ou com show=false), mostra o bloco 3D.
 * Os mapas existentes pintam só floresta, então fora do tema Amazônia ficam desligados. */
export function RealMap({ cod, year, fallback, show = true }: { cod: number; year: number; fallback: number; show?: boolean }) {
  const index = useQuery({ queryKey: ['map-index'], queryFn: async () => { const r = await fetch('/mapas/indice.json'); if (!r.ok) return {} as Record<string, [number, number]>; return r.json() as Promise<Record<string, [number, number]>>; }, staleTime: Infinity });
  const size = index.data?.[String(cod)];
  if (!size || !show) return <IsoPlot cover={fallback} />;
  const frames = 41; const frame = Math.max(0, Math.min(frames - 1, year - 1985));
  return <div className="real-map" style={{ aspectRatio: `${size[0]} / ${size[1]}`, backgroundImage: `url(/mapas/${cod}.png)`, backgroundSize: `100% ${frames * 100}%`, backgroundPositionY: `${(frame / (frames - 1)) * 100}%` }}><span className="map-legend"><span><i className="lg-forest" />floresta</span><span><i className="lg-other" />outros usos</span><span><i className="lg-water" />água</span></span></div>;
}
