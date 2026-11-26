import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowRight, ChevronDown, MapPin, RotateCcw, Share2, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Landscape, MEMORY_OPTIONS } from '@/components/forest/Landscape';
import { IsoPlot } from '@/components/forest/IsoPlot';
import { CONSENT, canRecord, forestAt, insertResearch, isAdult, isPrototype, normalize, referenceYear, responseCode, type ForestData, type Municipality, type Residence, ufOf } from '@/lib/research';
import { createShareCard } from '@/lib/share-card';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'A floresta da sua infância · Amazônia' },
    { name: 'description', content: 'Lembre quanta floresta havia no seu município da Amazônia quando você tinha 10 anos e compare com os dados do MapBiomas.' },
    { property: 'og:title', content: 'A floresta da sua infância' },
    { property: 'og:description', content: 'Quanta floresta você viu crescendo? Faça seu chute e descubra os dados do MapBiomas.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Index,
});

type Step = 'start' | 'place' | 'birth' | 'memory' | 'guess' | 'today' | 'future' | 'residence' | 'reveal';
const years = Array.from({ length: 86 }, (_, i) => 1930 + i);

function Index() {
  const [step, setStep] = useState<Step>('start');
  const [agreed, setAgreed] = useState(false);
  const [consented, setConsented] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [place, setPlace] = useState<Municipality>();
  const [birth, setBirth] = useState<number>();
  const [guess, setGuess] = useState<number>();
  const [todayGuess, setTodayGuess] = useState<number | null>(null);
  const [futureGuess, setFutureGuess] = useState<number | null>(null);
  const [residence, setResidence] = useState<Residence | null>(null);
  const [memories, setMemories] = useState<string[]>([]);
  const [prototype, setPrototype] = useState(true);
  const main = useRef<HTMLElement>(null);
  const data = useQuery({ queryKey: ['forest-data'], queryFn: async () => { const r = await fetch('/dados_pagina.json'); if (!r.ok) throw new Error('Dados indisponíveis'); return r.json() as Promise<ForestData>; } });
  useEffect(() => setPrototype(isPrototype(window.location.hostname)), []);
  useEffect(() => { main.current?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);
  const go = (next: Step) => setStep(next);
  const startExplore = () => { setExploring(true); setPlace(undefined); setGuess(undefined); setTodayGuess(null); setFutureGuess(null); setResidence(null); setMemories([]); go('place'); };

  return <div className="app-shell">
    {prototype && <div className="prototype-strip" role="status">Protótipo para testes: nenhuma resposta é gravada</div>}
    <main ref={main} tabIndex={-1} className="outline-none">
      {step === 'start' && <Start agreed={agreed} setAgreed={setAgreed} begin={() => { setConsented(true); setExploring(false); go('place'); }} explore={() => { setConsented(false); startExplore(); }} />}
      {step !== 'start' && <QuestionFrame step={step} exploring={exploring}>
        {step === 'place' && <PlaceQuestion data={data.data} loading={data.isLoading} error={data.isError} exploring={exploring} onChoose={(m) => { setPlace(m); go(birth ? 'guess' : 'birth'); }} onOutside={() => { setExploring(true); }} />}
        {step === 'birth' && place && <BirthQuestion birth={birth} consented={consented && !exploring} onNext={(y) => { setBirth(y); go('memory'); }} />}
        {step === 'memory' && place && birth && <MemoryWalk name={place[0]} year={referenceYear(birth)} initial={memories} onNext={(list) => { setMemories(list); go('guess'); }} />}
        {step === 'guess' && place && birth && <GuessQuestion key="childhood" title={<>Feche os olhos e lembre de <b>{place[0]}</b> em <b>{referenceYear(birth)}</b>, quando você tinha {referenceYear(birth) - birth} anos. De cada 100 pedaços de terra do município, quantos você acha que eram floresta?</>} help="Vale mata de terra firme, de várzea e mangue. Não vale pasto, roça, cidade nem campo natural. Não tem resposta errada: queremos saber o que você lembra." action="Confirmar meu chute" photo={{ name: place[0], year: referenceYear(birth), memories }} onConfirm={(v) => { setGuess(v); go('today'); }} />}
        {step === 'today' && place && <GuessQuestion key="today" title={<>E hoje, quanto de <b>{place[0]}</b> você acha que ainda é floresta?</>} help="Esta pergunta é opcional." action="Confirmar" skip={() => { setTodayGuess(null); go('future'); }} onConfirm={(v) => { setTodayGuess(v); go('future'); }} />}
        {step === 'future' && place && <GuessQuestion key="future" title={<>Uma criança que nasce hoje em <b>{place[0]}</b> vai ter 10 anos em {new Date().getFullYear() + 10}. Quanto do município você gostaria que ainda fosse floresta nessa época?</>} help="Esta pergunta é opcional. Não é uma previsão: é o que você acha que deveria ficar para ela." action="Confirmar" skip={() => { setFutureGuess(null); go('residence'); }} onConfirm={(v) => { setFutureGuess(v); go('residence'); }} />}
        {step === 'residence' && place && <ResidenceQuestion name={place[0]} onAnswer={(r) => { setResidence(r); go('reveal'); }} />}
        {step === 'reveal' && place && birth !== undefined && guess !== undefined && <Reveal place={place} birth={birth} guess={guess} memories={memories} todayGuess={todayGuess} futureGuess={futureGuess} residence={residence} consented={consented} exploring={exploring} prototype={prototype} again={startExplore} />}
      </QuestionFrame>}
    </main>
    <footer className="site-footer"><p>Fonte: Projeto MapBiomas, Coleção 11 da Série Anual de Mapas de Cobertura e Uso da Terra do Brasil (1985 a 2025).</p><p>Pesquisa de Priscila Motta Gadelha Silva, engenheira cartógrafa e agrimensora. Trabalho inscrito no 9º Prêmio MapBiomas.</p></footer>
  </div>;
}

function Start({ agreed, setAgreed, begin, explore }: { agreed: boolean; setAgreed: (v: boolean) => void; begin: () => void; explore: () => void }) {
  const terms = useQuery({ queryKey: ['terms'], queryFn: async () => { const r = await fetch('/termo_v1.json'); if (!r.ok) throw new Error('Termo indisponível'); return r.json() as Promise<string[]>; } });
  return <section className="start-page" aria-labelledby="title">
    <div className="hero-scene"><header className="start-top"><div className="wordmark"><Sprout aria-hidden="true" /><span>A floresta da<br />sua infância</span></div><div className="award-mark"><strong>9º Prêmio MapBiomas</strong>Categoria Comunicação</div></header><Landscape cover={100} intro /><div className="hero-copy"><p className="eyebrow">Amazônia · Memória · Paisagem</p><h1 id="title">Quanta floresta você viu crescendo?</h1><p>Uma viagem curta entre o que você lembra e o que os satélites registraram na Amazônia.</p></div><span className="hero-caption">9 estados · 41 anos de história · a sua memória</span></div>
    <div className="consent-panel">
      <p className="consent-text">{CONSENT}</p>
      <details className="terms"><summary>Ler o termo completo <ChevronDown aria-hidden="true" /></summary><div>{terms.isLoading && <p>Carregando o termo…</p>}{terms.isError && <p>Não conseguimos carregar o termo agora. Tente recarregar a página.</p>}{terms.data?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></details>
      <label className="check-row"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>Tenho 18 anos ou mais, li o termo e concordo em participar.</span></label>
      <Button variant="forest" size="xl" disabled={!agreed} onClick={begin}>Começar <ArrowRight aria-hidden="true" /></Button>
      <Button variant="link" className="text-link" onClick={explore}>Ver só os dados, sem participar</Button>
    </div>
  </section>;
}

function QuestionFrame({ step, exploring, children }: { step: Step; exploring: boolean; children: React.ReactNode }) {
  const order: Step[] = ['place', 'birth', 'memory', 'guess', 'today', 'future', 'residence', 'reveal'];
  return <section className="question-page"><div className="question-top"><span className="brand-mark"><Sprout aria-hidden="true" /> A floresta da sua infância</span><span className="step-count">{step === 'reveal' ? 'Revelação' : `Etapa ${order.indexOf(step) + 1} de ${order.length - 1}`}</span></div>{exploring && <p className="explore-note" role="status">Modo explorar: esta rodada não será gravada.</p>}{children}</section>;
}

function PlaceQuestion({ data, loading, error, exploring, onChoose, onOutside }: { data: ForestData | undefined; loading: boolean; error: boolean; exploring: boolean; onChoose: (m: Municipality) => void; onOutside: () => void }) {
  const [query, setQuery] = useState(''); const [active, setActive] = useState(0);
  const options = useMemo(() => (data?.m ?? []).filter((m) => normalize(`${m[0]} ${ufOf(m[1])}`).includes(normalize(query.trim()))), [data, query]);
  const total = options.length + (exploring ? 0 : 1);
  const choose = (i: number) => { const m = options[i]; if (m) onChoose(m); else if (!exploring) { onOutside(); setQuery(''); setActive(0); } };
  const keys = (e: KeyboardEvent) => { if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(total - 1, a + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); } if (e.key === 'Enter') { e.preventDefault(); choose(active); } };
  return <div className="question-card"><h1>{exploring ? 'Qual município da Amazônia você quer explorar?' : 'Em que município da Amazônia você morava quando tinha 10 anos?'}</h1><p className="help">{exploring ? 'Escolha qualquer município da Amazônia, de qualquer um dos 9 estados.' : 'Se mudou muito, escolha o lugar que você mais lembra daquela época.'}</p>
    <label className="field-label" htmlFor="municipio">Digite o nome do município</label><div className="search-box"><MapPin aria-hidden="true" /><input id="municipio" role="combobox" aria-expanded="true" aria-controls="municipios" aria-activedescendant={`opt-${active}`} autoComplete="off" value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={keys} placeholder="Ex.: Maraba" /></div>
    {loading && <p className="help">Carregando municípios…</p>}{error && <p className="error-text">Não conseguimos carregar os dados. Verifique a internet e tente de novo.</p>}
    <ul id="municipios" role="listbox" className="option-list" aria-label="Municípios da Amazônia">{options.map((m, i) => <li id={`opt-${i}`} role="option" aria-selected={i === active} key={m[1]} onMouseEnter={() => setActive(i)} onClick={() => choose(i)}>{m[0]} <span className="option-uf">{ufOf(m[1])}</span></li>)}{!exploring && <li id={`opt-${options.length}`} role="option" aria-selected={active === options.length} className="outside-option" onClick={() => choose(options.length)}>Eu não morava na Amazônia aos 10 anos</li>}</ul>
    {!loading && options.length === 0 && <p className="help">Nenhum município encontrado com esse nome.</p>}
  </div>;
}

function BirthQuestion({ birth, consented, onNext }: { birth: number | undefined; consented: boolean; onNext: (y: number) => void }) {
  const [year, setYear] = useState(birth ? String(birth) : ''); const y = Number(year); const current = new Date().getFullYear();
  return <div className="question-card"><h1>Em que ano você nasceu?</h1><label className="field-label" htmlFor="nascimento">Ano de nascimento</label><select id="nascimento" className="year-select" value={year} onChange={(e) => setYear(e.target.value)}><option value="">Escolha o ano</option>{years.map((v) => <option key={v}>{v}</option>)}</select>
    {year && y + 10 < 1985 && <p className="notice">O MapBiomas começa em 1985. Vamos comparar seu chute com o retrato mais antigo que existe, quando você tinha {1985 - y} anos.</p>}
    {year && consented && !isAdult(y, current) && <p className="notice">Você pode jogar normalmente, mas como a pesquisa é só para maiores de 18 anos, sua resposta não será gravada.</p>}
    <Button variant="forest" size="xl" disabled={!year} onClick={() => onNext(y)}>Continuar <ArrowRight aria-hidden="true" /></Button></div>;
}

function GuessQuestion({ title, help, action, onConfirm, skip, photo }: { title: React.ReactNode; help: string; action: string; onConfirm: (v: number) => void; skip?: () => void; photo?: { name: string; year: number; memories: string[] } }) {
  const [value, setValue] = useState<number>(); const track = useRef<HTMLDivElement>(null);
  const update = (e: PointerEvent<HTMLDivElement>) => { if (e.type === 'pointermove' && e.buttons !== 1) return; const box = track.current?.getBoundingClientRect(); if (!box) return; setValue(Math.round(Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * 100)); };
  const key = (e: KeyboardEvent) => { const change: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }; if (e.key === 'Home') setValue(0); else if (e.key === 'End') setValue(100); else if (change[e.key] !== undefined) setValue((v) => Math.max(0, Math.min(100, (v ?? 0) + (change[e.key] ?? 0)))); else return; e.preventDefault(); };
  const scene = <div className="iso-stage"><IsoPlot cover={value ?? 0} empty={value === undefined} /><div className="guess-number" aria-hidden="true">{value === undefined ? <strong className="guess-empty">?</strong> : <><strong>{value}</strong><span>de 100</span></>}</div><div className="iso-legend" aria-hidden="true"><span><i className="lg-forest" />floresta</span><span><i className="lg-other" />pasto, roça, cidade e outros usos</span></div></div>;
  const slider = <div className="planting-control"><div ref={track} className="planting-track" role="slider" tabIndex={0} aria-label="Quantos de cada 100 pedaços eram floresta" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={value === undefined ? 'Ainda sem resposta' : `${value} de cada 100 pedaços eram floresta`} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); update(e); }} onPointerMove={update} onKeyDown={key}><span className="track-fill" style={{ width: `${value ?? 0}%` }} /><span className={`track-thumb ${value === undefined ? 'track-thumb-idle' : ''}`} style={{ left: `${value ?? 50}%` }}><Sprout aria-hidden="true" /></span></div><div className="track-labels" aria-hidden="true"><span>nenhuma floresta</span><span>toda floresta</span></div></div>;
  return <div className="guess-layout"><div className="question-card guess-copy"><h1>{title}</h1><p className="help">{help}</p></div>
    {scene}{photo && <p className="iso-place">{photo.name}, {photo.year}</p>}{slider}
    <div className="guess-actions"><p className="guess-caption" aria-live="polite">{value === undefined ? 'Arraste a muda para plantar a floresta que você lembra.' : `${value} de cada 100 pedaços de terra eram floresta.`}</p>
      <details className="number-alt"><summary>Prefiro digitar o número</summary><label>De 0 a 100<input inputMode="numeric" type="number" min="0" max="100" value={value ?? ''} onChange={(e) => setValue(e.target.value === '' ? undefined : Math.max(0, Math.min(100, Math.round(Number(e.target.value)))))} /></label></details>
      <Button variant="memory" size="xl" disabled={value === undefined} onClick={() => value !== undefined && onConfirm(value)}>{action}</Button>{skip && <Button variant="quiet" size="xl" onClick={skip}>Pular</Button>}</div></div>;
}

function ResidenceQuestion({ name, onAnswer }: { name: string; onAnswer: (r: Residence | null) => void }) {
  const options: [Residence, string][] = [['sim', 'Sim, moro lá'], ['visita', 'Não, mas visito'], ['saiu', 'Não, saí de lá']];
  return <div className="question-card"><h1>Você ainda mora em {name}?</h1><p className="help">Esta pergunta é opcional.</p><div className="choice-stack">{options.map(([v, label]) => <Button key={v} variant="choice" size="xl" onClick={() => onAnswer(v)}>{label}</Button>)}<Button variant="quiet" size="xl" onClick={() => onAnswer(null)}>Pular</Button></div></div>;
}

function Reveal({ place, birth, guess, memories, todayGuess, futureGuess, residence, consented, exploring, prototype, again }: { place: Municipality; birth: number; guess: number; memories: string[]; todayGuess: number | null; futureGuess: number | null; residence: Residence | null; consented: boolean; exploring: boolean; prototype: boolean; again: () => void }) {
  const ref = referenceYear(birth); const past = forestAt(place, ref); const today = forestAt(place, 2025);
  const [year, setYear] = useState(ref); const [done, setDone] = useState(false); const [code, setCode] = useState<string>(); const [record, setRecord] = useState<'checking' | 'saved' | 'duplicate' | 'off' | 'prototype' | 'error'>('checking'); const [shareStatus, setShareStatus] = useState(''); const [message, setMessage] = useState(''); const sent = useRef(false);
  useEffect(() => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || ref === 2025) { setYear(2025); setDone(true); return; } const start = performance.now(); const duration = Math.min(7000, Math.max(2200, (2025 - ref) * 180)); let frame = 0; const tick = (now: number) => { const t = Math.min(1, (now - start) / duration); setYear(Math.round(ref + (2025 - ref) * t)); if (t < 1) frame = requestAnimationFrame(tick); else setDone(true); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [ref]);
  useEffect(() => { if (sent.current) return; sent.current = true; let duplicate = true; try { duplicate = localStorage.getItem('floresta_respondeu') !== null; } catch { /* Without storage, fail closed to avoid duplicate collection. */ } const eligible = canRecord(consented, birth, new Date().getFullYear(), exploring, duplicate); const id = responseCode(); setCode(id); if (!eligible) { setRecord(duplicate && consented && !exploring && isAdult(birth, new Date().getFullYear()) ? 'duplicate' : 'off'); return; } if (prototype) { setRecord('prototype'); return; } const origin = new URLSearchParams(window.location.search).get('utm_source') || 'direto'; insertResearch('respostas', { id_resposta: id, versao_questionario: 'v1', cod_ibge_municipio: place[1], ano_nascimento: birth, ano_referencia: ref, chute_infancia_pct: guess, chute_hoje_pct: todayGuess, chute_futuro_pct: futureGuess, ainda_mora: residence, real_infancia_pct: past, real_hoje_pct: today, colecao_mapbiomas: '11', origem: origin }).then(() => { try { localStorage.setItem('floresta_respondeu', '1'); } catch { /* The response already reached the service; do not retry. */ } setRecord('saved'); }).catch(() => setRecord('error')); }, []);
  const diff = guess - Math.round(past); const diffText = diff === 0 ? 'Seu chute acertou em cheio.' : `Seu chute ficou ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'ponto' : 'pontos'} ${diff > 0 ? 'acima' : 'abaixo'}.`;
  const share = async () => { try { setShareStatus('Preparando seu cartão…'); const file = await createShareCard(place[0], ref, guess, past, today, message.trim()); if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'A floresta da sua infância', text: 'E você, quanta floresta lembra?' }); setShareStatus('Cartão compartilhado.'); if (!prototype && consented && !exploring && isAdult(birth, new Date().getFullYear()) && (record === 'saved' || record === 'error')) await insertResearch('compartilhamentos', { id_resposta: record === 'saved' ? code : null, rede: 'web-share' }).catch(() => undefined); } else { const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url); setShareStatus('A imagem foi baixada.'); if (!prototype && consented && !exploring && isAdult(birth, new Date().getFullYear()) && (record === 'saved' || record === 'error')) await insertResearch('compartilhamentos', { id_resposta: record === 'saved' ? code : null, rede: 'download' }).catch(() => undefined); } } catch (e) { setShareStatus(e instanceof DOMException && e.name === 'AbortError' ? '' : 'Não foi possível preparar o cartão agora.'); } };
  return <div className="reveal-page"><div className="compare-panels" aria-hidden="true"><figure className="compare-panel panel-memory"><figcaption><span>Sua lembrança</span><strong>{guess}%</strong><small>{place[0]}, {ref}</small></figcaption><IsoPlot cover={guess} /></figure><figure className="compare-panel panel-real"><figcaption><span>Satélite · {year}</span><strong>{Math.round(forestAt(place, year))}%</strong><small>floresta medida pelo MapBiomas</small></figcaption><RealMap cod={place[1]} year={year} fallback={forestAt(place, year)} /></figure></div>
    <div className="reveal-copy"><p className="eyebrow">Memória x satélite</p><h1 aria-live="polite">{done ? `Em ${ref}, ${Math.round(past)}% de ${place[0]} era floresta.` : `Viajando de ${ref} até 2025…`}</h1>{done && <><p className="reveal-sentence">{diffText} Hoje são {Math.round(today)}%.</p><div className="stat-row"><Stat label="Sua lembrança" value={guess} tone="memory" /><Stat label={`Real em ${ref}`} value={past} tone="forest" /><Stat label="Real em 2025" value={today} tone="earth" /></div><Reflection place={place} birth={birth} ref={ref} memories={memories} futureGuess={futureGuess} message={message} setMessage={setMessage} /><p className="method-note">Os dados usam os limites atuais do município. Se ele foi criado depois de 1985, mostramos o mesmo território antes da emancipação.</p><RecordNotice status={record} code={code} /><SeriesChart series={place[2]} guess={guess} ref={ref} todayGuess={todayGuess} /><div className="action-stack"><Button variant="forest" size="xl" onClick={share}><Share2 aria-hidden="true" /> Compartilhar cartão</Button><Button variant="quiet" size="xl" onClick={again}><RotateCcw aria-hidden="true" /> Explorar outro município</Button><p role="status" className="help">{shareStatus}</p></div></>}</div></div>;
}

/** Mapa real do MapBiomas (tira com um quadro por ano, gerada por pesquisa/mapas/gerar_mapas.py). Sem mapa, mostra o bloco 3D com o valor medido. */
function RealMap({ cod, year, fallback }: { cod: number; year: number; fallback: number }) {
  const index = useQuery({ queryKey: ['map-index'], queryFn: async () => { const r = await fetch('/mapas/indice.json'); if (!r.ok) return {} as Record<string, [number, number]>; return r.json() as Promise<Record<string, [number, number]>>; }, staleTime: Infinity });
  const size = index.data?.[String(cod)];
  if (!size) return <IsoPlot cover={fallback} />;
  const frames = 41; const frame = Math.max(0, Math.min(frames - 1, year - 1985));
  return <div className="real-map" style={{ aspectRatio: `${size[0]} / ${size[1]}`, backgroundImage: `url(/mapas/${cod}.png)`, backgroundSize: `100% ${frames * 100}%`, backgroundPositionY: `${(frame / (frames - 1)) * 100}%` }}><span className="map-legend"><span><i className="lg-forest" />floresta</span><span><i className="lg-other" />outros usos</span><span><i className="lg-water" />água</span></span></div>;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className={`stat stat-${tone}`}><span>{label}</span><strong>{Math.round(value)}%</strong></div>; }
function RecordNotice({ status, code }: { status: string; code: string | undefined }) {
  if (status === 'saved') return <p className="record-box">Seu código de resposta é <strong>{code}</strong>. Guarde se quiser pedir a exclusão depois.</p>;
  if (status === 'prototype') return <p className="record-box">No site oficial esta resposta seria gravada com o código <strong>{code}</strong>.</p>;
  if (status === 'duplicate') return <p className="record-box">Você já respondeu neste aparelho, então esta rodada não foi gravada.</p>;
  if (status === 'error') return <p className="record-box error-text">Não conseguimos guardar sua resposta agora. Você ainda pode ver e compartilhar seu resultado.</p>;
  if (status === 'off') return <p className="record-box">Esta rodada não foi gravada.</p>;
  return null;
}
function SeriesChart({ series, guess, ref, todayGuess }: { series: number[]; guess: number; ref: number; todayGuess: number | null }) {
  const x = (year: number) => 38 + (year - 1985) * 7.6; const y = (v: number) => 205 - v * 1.75; const line = series.map((v, i) => `${i ? 'L' : 'M'}${x(1985 + i)} ${y(v)}`).join(' ');
  return <figure className="series-chart"><figcaption>Floresta medida de 1985 a 2025</figcaption><svg viewBox="0 0 360 240" role="img" aria-label={`Gráfico da floresta medida. Em 1985, ${Math.round(series[0] ?? 0)}%. Em ${ref}, ${Math.round(series[ref - 1985] ?? 0)}%. Em 2025, ${Math.round(series[40] ?? 0)}%. Seu chute foi ${guess}%.`}>{[0, 50, 100].map((v) => <g key={v}><path className="chart-grid" d={`M38 ${y(v)}H342`} /><text className="chart-label" x="4" y={y(v) + 5}>{v}%</text></g>)}<path className="chart-area" d={`${line} L342 205 L38 205Z`} /><path className="chart-line" d={line} /><circle className="chart-real" cx={x(ref)} cy={y(series[ref - 1985] ?? 0)} r="7" /><circle className="chart-guess" cx={x(ref)} cy={y(guess)} r="8" /><circle className="chart-now" cx={x(2025)} cy={y(series[40] ?? 0)} r="7" />{todayGuess !== null && <circle className="chart-guess-hollow" cx={x(2025)} cy={y(todayGuess)} r="7" />}<text className="chart-label" x="38" y="232">1985</text><text className="chart-label" x="302" y="232">2025</text></svg><div className="chart-legend"><span><i className="legend-guess" />Seu chute</span><span><i className="legend-real" />Real</span><span><i className="legend-now" />Hoje</span></div></figure>;
}


/** Momento de lembrar antes do chute. As escolhas ficam só no aparelho: não vão para o banco. */
function MemoryWalk({ name, year, initial, onNext }: { name: string; year: number; initial: string[]; onNext: (list: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const toggle = (item: string) => setPicked((list) => list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  return <div className="question-card"><h1>Antes do chute, volte para {name} em {year}.</h1><p className="help">Lembre do caminho de casa até a escola, ou do lugar onde você brincava. O que tinha nele? Toque em tudo que vier à memória.</p>
    <div className="memory-chips" role="group" aria-label="Lembranças da infância">{MEMORY_OPTIONS.map((item) => <button type="button" key={item} className="memory-chip" aria-pressed={picked.includes(item)} onClick={() => toggle(item)}>{item}</button>)}</div>
    <p className="help small-note">Essas lembranças não são gravadas. Elas só aparecem de novo para você no final.</p>
    <div className="choice-stack"><Button variant="forest" size="xl" onClick={() => onNext(picked)}>{picked.length ? 'Continuar' : 'Não lembro, continuar'} <ArrowRight aria-hidden="true" /></Button></div></div>;
}

const joinList = (items: string[]) => items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;

/** Reflexão depois da revelação: três gerações, a linha de base móvel e um recado que vai só para o cartão. */
function Reflection({ place, birth, ref, memories, futureGuess, message, setMessage }: { place: Municipality; birth: number; ref: number; memories: string[]; futureGuess: number | null; message: string; setMessage: (v: string) => void }) {
  const series = place[2]; const at = (y: number) => Math.round(series[y - 1985] ?? 0);
  const middle = 2025 - ref >= 10 ? Math.round((ref + 2025) / 2) : null;
  const generations = [
    { year: ref, who: birth + 10 < 1985 ? `Você, em ${ref}` : `Você, aos 10 anos` },
    ...(middle ? [{ year: middle, who: `Quem nasceu em ${middle - 10}, aos 10 anos` }] : []),
    { year: 2025, who: 'Uma criança de 10 anos hoje' },
  ];
  const first = at(1985); const last = at(2025);
  return <section className="reflection" aria-labelledby="reflexao-titulo">
    {memories.length > 0 && <p className="memory-echo">Você lembrou de: <strong>{joinList(memories.map((m) => m.toLowerCase()))}</strong>. Quanto disso ainda existe em {place[0]}?</p>}
    <h2 id="reflexao-titulo">Três crianças, um mesmo lugar</h2>
    <p className="help">Cada geração cresce achando normal a floresta que viu aos 10 anos.</p>
    <ol className="generations">{generations.map((g) => <li key={g.year}><span className="gen-who">{g.who}</span><span className="gen-year">{g.year}</span><span className="gen-bar" aria-hidden="true"><i style={{ width: `${at(g.year)}%` }} /></span><strong>{at(g.year)}% de floresta</strong><span className="gen-note">era o normal</span></li>)}</ol>
    {futureGuess !== null && <p className="future-echo">Para a criança que nasce hoje, você gostaria de <strong>{futureGuess}% de floresta</strong> quando ela tiver 10 anos. {futureGuess > last ? `É mais do que os ${last}% de agora: seria preciso recuperar floresta.` : futureGuess === last ? `É o que existe hoje: seria preciso parar a perda.` : `É menos do que os ${last}% de agora.`}</p>}
    <h2>Por que a gente esquece?</h2>
    <div className="why-cards">
      <article><h3>A régua é a infância</h3><p>A gente mede o mundo pelo que viu quando era criança. Os cientistas chamam isso de síndrome da linha de base móvel: a cada geração, o ponto de partida fica mais baixo, e a perda deixa de parecer perda.</p></article>
      <article><h3>A perda some de vista</h3><p>{first - last >= 1 ? <>Em 1985, {first}% de {place[0]} era floresta. Em 2025, {last}%. Quem nasceu depois de 2015 nunca viu os {first}%: para essa criança, {last}% é o normal.</> : <>Em {place[0]}, a floresta medida ficou perto de {last}% entre 1985 e 2025. Em muitos municípios vizinhos não foi assim: explore outro para comparar.</>}</p></article>
      <article><h3>O que fica para quem vem depois?</h3><p>Pense numa criança de 10 anos de {place[0]} hoje. O que você viu e ela nunca vai ver?</p>
        <label className="field-label" htmlFor="recado">Escreva um recado para ela (opcional)</label>
        <textarea id="recado" className="message-box" maxLength={120} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Quando eu tinha 10 anos, aqui tinha…" />
        <p className="help small-note">{message.length}/120. O recado vai só para o seu cartão de compartilhar. Não guardamos esse texto.</p></article>
    </div>
  </section>;
}
