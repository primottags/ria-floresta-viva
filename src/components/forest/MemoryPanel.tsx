import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { fetchPanel, panelHeadline, type PanelData, type PanelGroup } from '@/lib/research';

const UF_NAME: Record<string, string> = { AC: 'Acre', AM: 'Amazonas', AP: 'Amapá', MA: 'Maranhão', MT: 'Mato Grosso', PA: 'Pará', RO: 'Rondônia', RR: 'Roraima', TO: 'Tocantins' };

/** Uma linha do painel: a lembrança média e o satélite na mesma régua de 0 a 100%. */
function Row({ label, group }: { label: string; group: PanelGroup }) {
  const lo = Math.min(group.chute, group.real); const hi = Math.max(group.chute, group.real);
  const pts = Math.round(group.diferenca);
  const verdict = pts === 0 ? 'igual ao satélite' : `${Math.abs(pts)} ${Math.abs(pts) === 1 ? 'ponto' : 'pontos'} ${pts > 0 ? 'a mais' : 'a menos'}`;
  return <li className="panel-row">
    <div className="panel-row-head"><span className="panel-label">{label}</span><span className="panel-n">{group.n} {group.n === 1 ? 'pessoa' : 'pessoas'}</span></div>
    <div className="panel-track" role="img" aria-label={`${label}: lembrança média ${Math.round(group.chute)}%, satélite ${Math.round(group.real)}%, ${verdict}.`}>
      <span className="panel-gap" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
      <span className="panel-dot panel-dot-real" style={{ left: `${group.real}%` }} />
      <span className="panel-dot panel-dot-memory" style={{ left: `${group.chute}%` }} />
    </div>
    <p className="panel-verdict"><b>{Math.round(group.chute)}%</b> lembrado · <b>{Math.round(group.real)}%</b> no satélite · <span className={pts > 0 ? 'panel-more' : pts < 0 ? 'panel-less' : ''}>{verdict}</span></p>
  </li>;
}

export function PanelView({ data }: { data: PanelData }) {
  const headline = panelHeadline(data);
  const waiting = !data.geracoes.length && !data.estados.length;
  return <div className="memory-panel">
    <p className="panel-total"><Users aria-hidden="true" /> <b>{data.total.toLocaleString('pt-BR')}</b> {data.total === 1 ? 'lembrança registrada' : 'lembranças registradas'} até agora</p>
    {headline && <p className="panel-headline">{headline}</p>}
    {waiting && <p className="panel-waiting">Ainda estamos juntando lembranças. Cada grupo aparece aqui quando tiver pelo menos {data.minimo} respostas, para que ninguém possa ser identificado.</p>}
    {!waiting && <div className="panel-key"><span><i className="panel-dot-memory" />Lembrança média</span><span><i className="panel-dot-real" />Satélite (MapBiomas)</span></div>}
    {data.geracoes.length > 0 && <section aria-labelledby="painel-geracoes"><h2 id="painel-geracoes" className="panel-title">Por geração <small>ano de nascimento · lembrança aos 10 anos</small></h2><div className="panel-axis" aria-hidden="true"><span>0%</span><span>50%</span><span>100% de floresta</span></div><ol className="panel-list">{data.geracoes.map((g) => <Row key={g.rotulo} label={g.rotulo} group={g} />)}</ol></section>}
    {data.estados.length > 0 && <section aria-labelledby="painel-estados"><h2 id="painel-estados" className="panel-title">Por estado <small>onde fica o município lembrado</small></h2><div className="panel-axis" aria-hidden="true"><span>0%</span><span>50%</span><span>100% de floresta</span></div><ol className="panel-list">{data.estados.map((g) => <Row key={g.uf} label={UF_NAME[g.uf] ?? g.uf} group={g} />)}</ol></section>}
    <p className="method-note">Médias das respostas anônimas, comparadas com a floresta medida pelo MapBiomas (Coleção 11) no mesmo município e ano. Grupos com menos de {data.minimo} respostas ficam de fora. Os dados são de quem quis participar, não de uma amostra sorteada.</p>
  </div>;
}

export function MemoryPanel() {
  const panel = useQuery({ queryKey: ['painel'], queryFn: () => fetchPanel(), staleTime: 60_000 });
  if (panel.isLoading) return <p className="help">Carregando o painel…</p>;
  if (panel.isError || !panel.data) return <p className="help">Não conseguimos carregar o painel agora. Tente de novo em instantes.</p>;
  return <PanelView data={panel.data} />;
}
