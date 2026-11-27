import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Eye, Printer, RotateCcw, School, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RealMap } from '@/components/forest/RealMap';
import { forestAt, normalize, ufOf, type ForestData, type Municipality } from '@/lib/research';

export const Route = createFileRoute('/sala')({
  head: () => ({ meta: [
    { title: 'Modo sala de aula · A floresta da sua infância' },
    { name: 'description', content: 'Atividade para turmas: três gerações chutam quanta floresta havia no município e comparam com os dados do MapBiomas.' },
  ] }),
  component: Sala,
});

/** As três gerações da atividade: o ano em que cada uma tinha cerca de 10 anos. */
const GENERATIONS = [
  { key: 'avos', who: 'Avós', detail: 'quem nasceu por volta de 1975', year: 1985 },
  { key: 'pais', who: 'Pais e mães', detail: 'quem nasceu por volta de 1995', year: 2005 },
  { key: 'turma', who: 'A turma', detail: 'vocês, hoje', year: 2025 },
] as const;

function Sala() {
  const data = useQuery({ queryKey: ['forest-data'], queryFn: async () => { const r = await fetch('/dados_pagina.json'); if (!r.ok) throw new Error('Dados indisponíveis'); return r.json() as Promise<ForestData>; } });
  const [place, setPlace] = useState<Municipality>();
  return <div className="app-shell"><main className="question-page sala-page">
    <div className="question-top no-print"><Link to="/" className="brand-mark"><Sprout aria-hidden="true" /> A floresta da sua infância</Link><span className="step-count">Modo sala de aula</span></div>
    <p className="eyebrow no-print"><School aria-hidden="true" className="inline-icon" /> Para professoras e professores</p>
    <h1 className="no-print">Três gerações, um mesmo lugar</h1>
    <p className="reveal-sentence no-print">A turma chuta quanta floresta havia no município quando os avós, os pais e os próprios alunos tinham 10 anos. Depois, o satélite revela. <b>Nada é gravado</b>: funciona para qualquer idade e pode ser projetado na sala.</p>
    {!place ? <Chooser data={data.data} loading={data.isLoading} error={data.isError} onChoose={setPlace} /> : <Rounds place={place} reset={() => setPlace(undefined)} />}
    <Guide />
  </main></div>;
}

function Chooser({ data, loading, error, onChoose }: { data: ForestData | undefined; loading: boolean; error: boolean; onChoose: (m: Municipality) => void }) {
  const [query, setQuery] = useState('');
  const options = useMemo(() => query.trim().length < 2 ? [] : (data?.m ?? []).filter((m) => normalize(`${m[0]} ${ufOf(m[1])}`).includes(normalize(query.trim()))).slice(0, 8), [data, query]);
  return <section className="question-card no-print" aria-labelledby="sala-municipio">
    <h2 id="sala-municipio" className="sala-h2">1. Escolha o município da escola</h2>
    <label className="field-label" htmlFor="sala-busca">Nome do município</label>
    <div className="search-box"><input id="sala-busca" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: Marabá" autoComplete="off" /></div>
    {loading && <p className="help">Carregando municípios…</p>}
    {error && <p className="help error-text">Não conseguimos carregar os dados. Recarregue a página.</p>}
    {options.length > 0 && <ul className="sala-options">{options.map((m) => <li key={m[1]}><button type="button" onClick={() => onChoose(m)}>{m[0]} <small>{ufOf(m[1])}</small></button></li>)}</ul>}
    {query.trim().length >= 2 && !loading && options.length === 0 && <p className="help">Nenhum município da Amazônia com esse nome.</p>}
  </section>;
}

function Rounds({ place, reset }: { place: Municipality; reset: () => void }) {
  const [guesses, setGuesses] = useState<Record<string, number>>({ avos: 50, pais: 50, turma: 50 });
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const all = GENERATIONS.every((g) => shown[g.key]);
  const first = Math.round(forestAt(place, GENERATIONS[0].year)); const last = Math.round(forestAt(place, 2025));
  return <section className="no-print" aria-labelledby="sala-rodadas">
    <div className="sala-place"><h2 id="sala-rodadas" className="sala-h2">2. {place[0]} <small>{ufOf(place[1])}</small></h2><Button variant="quiet" onClick={reset}><RotateCcw aria-hidden="true" /> Trocar município</Button></div>
    <p className="help">Para cada geração, a turma combina um chute (pode ser a média de quem levantar a mão) e ajusta a barra. Depois clique em revelar.</p>
    <ol className="sala-rounds">{GENERATIONS.map((g) => {
      const real = Math.round(forestAt(place, g.year)); const guess = guesses[g.key] ?? 50; const open = !!shown[g.key];
      return <li key={g.key} className="sala-round">
        <div className="sala-round-head"><span className="sala-who">{g.who}</span><span className="sala-year">{g.year}</span><span className="help">{g.detail}, aos 10 anos</span></div>
        <label className="field-label" htmlFor={`chute-${g.key}`}>Chute da turma: <b>{guess / 10} de cada 10</b> pedaços eram floresta</label>
        <input id={`chute-${g.key}`} type="range" min={0} max={100} step={10} value={guess} disabled={open} onChange={(e) => setGuesses({ ...guesses, [g.key]: Number(e.target.value) })} className="sala-range" />
        {open ? <div className="sala-reveal"><RealMap cod={place[1]} year={g.year} fallback={real} /><p className="sala-real"><b>{Math.round(real / 10)} de 10</b> pedaços eram floresta no satélite ({real}%) · {guess / 10 === Math.round(real / 10) ? 'a turma acertou!' : `a turma chutou ${Math.abs(guess / 10 - Math.round(real / 10))} ${Math.abs(guess / 10 - Math.round(real / 10)) === 1 ? 'pedaço' : 'pedaços'} ${guess / 10 > Math.round(real / 10) ? 'a mais' : 'a menos'}`}</p></div>
          : <Button variant="forest" size="lg" onClick={() => setShown({ ...shown, [g.key]: true })}><Eye aria-hidden="true" /> Revelar {g.year}</Button>}
      </li>;
    })}</ol>
    {all && <div className="sala-conclusion"><h3>O que mudou de uma geração para a outra?</h3><p>Em {GENERATIONS[0].year}, {first}% de {place[0]} era floresta. Em 2025, {last}%. Cada geração cresce achando normal a floresta que viu aos 10 anos. Os cientistas chamam isso de <b>síndrome da linha de base móvel</b>.</p><p>Pergunta para a turma: o que os avós de vocês viram aqui que vocês nunca viram?</p></div>}
  </section>;
}

/** Roteiro da aula, pensado para imprimir. */
function Guide() {
  return <section className="sala-guide" aria-labelledby="sala-roteiro">
    <div className="sala-place"><h2 id="sala-roteiro" className="sala-h2">3. Roteiro da atividade</h2><Button variant="quiet" className="no-print" onClick={() => window.print()}><Printer aria-hidden="true" /> Imprimir roteiro</Button></div>
    <p className="print-only"><b>A floresta da sua infância · Modo sala de aula</b><br />Dados: Projeto MapBiomas, Coleção 11 (1985–2025).</p>
    <p>Duração: duas aulas de 50 minutos, com uma tarefa de casa entre elas. Indicado para o Ensino Fundamental II e o Ensino Médio, em Geografia, Ciências ou projetos interdisciplinares.</p>
    <h3>Aula 1: o chute e o satélite (50 min)</h3>
    <ol>
      <li><b>Conversa (10 min).</b> Pergunte: como era o lugar onde vocês moram quando os avós eram crianças? Tinha mais ou menos mata?</li>
      <li><b>Três chutes (20 min).</b> Nesta página, escolha o município da escola. Para cada geração, a turma combina um chute e revela o dado do satélite.</li>
      <li><b>Discussão (15 min).</b> A turma errou para mais ou para menos? Por que é difícil perceber uma mudança lenta? Apresente a ideia de linha de base móvel.</li>
      <li><b>Tarefa de casa (5 min).</b> Cada estudante entrevista uma pessoa mais velha da família ou da comunidade.</li>
    </ol>
    <h3>Entrevista com uma pessoa mais velha</h3>
    <ol>
      <li>Em que ano você nasceu e onde morava quando tinha 10 anos?</li>
      <li>Como era a mata perto da sua casa? Do que você brincava?</li>
      <li>Que bichos, árvores, rios ou igarapés você via e hoje não vê mais?</li>
      <li>Se o município fosse dividido em 10 pedaços, quantos você acha que eram floresta naquela época?</li>
      <li>O que você gostaria que as crianças de hoje ainda pudessem ver?</li>
    </ol>
    <p className="help">Se a pessoa entrevistada tiver 18 anos ou mais e quiser, ela pode responder a pesquisa na página principal, no próprio celular.</p>
    <h3>Aula 2: as memórias da comunidade (50 min)</h3>
    <ol>
      <li><b>Roda (20 min).</b> Os estudantes contam o que ouviram. Anote no quadro os chutes dos entrevistados.</li>
      <li><b>Comparação (15 min).</b> Compare os chutes dos mais velhos com o mapa do satélite no ano em que eles tinham 10 anos.</li>
      <li><b>Produção (15 min).</b> Cada estudante escreve um recado para uma criança que vai nascer: que floresta ele gostaria que ela encontrasse?</li>
    </ol>
    <p className="help">Esta atividade não grava nenhuma informação dos estudantes.</p>
  </section>;
}
