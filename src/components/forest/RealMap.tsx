import { useQuery } from '@tanstack/react-query';
import { IsoPlot } from '@/components/forest/IsoPlot';
import { DEFAULT_BIOME, type Biome } from '@/lib/biomes';

/** Mapa real do MapBiomas do município no ano dado (tira com 41 quadros, 1985–2025). Sem mapa, mostra o bloco 3D.
 * Amazônia e Mata Atlântica usam os mapas de floresta (public/mapas); os outros biomas, os de vegetação nativa
 * (public/mapas-nativa), para o mapa pintar o mesmo que a porcentagem mede. */
export function RealMap({ cod, year, fallback, biome = DEFAULT_BIOME }: { cod: number; year: number; fallback: number; biome?: Biome }) {
  const folder = biome.indicator === 'floresta' ? 'mapas' : 'mapas-nativa';
  const index = useQuery({ queryKey: ['map-index', folder], queryFn: async () => { const r = await fetch(`/${folder}/indice.json`); if (!r.ok) return {} as Record<string, [number, number]>; return r.json() as Promise<Record<string, [number, number]>>; }, staleTime: Infinity });
  const size = index.data?.[String(cod)];
  if (!size) return <IsoPlot cover={fallback} />;
  const frames = 41; const frame = Math.max(0, Math.min(frames - 1, year - 1985));
  return <div className="real-map" style={{ aspectRatio: `${size[0]} / ${size[1]}`, backgroundImage: `url(/${folder}/${cod}.png)`, backgroundSize: `100% ${frames * 100}%`, backgroundPositionY: `${(frame / (frames - 1)) * 100}%` }}><span className="map-legend"><span><i className="lg-forest" />{biome.legend}</span><span><i className="lg-other" />outros usos</span><span><i className="lg-water" />água</span></span></div>;
}
