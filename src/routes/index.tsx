import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowRight, ChevronDown, MapPin, RotateCcw, Share2, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Landscape, MEMORY_OPTIONS } from '@/components/forest/Landscape';
import { SatTerrain } from '@/components/forest/SatTerrain';
import { PhotoPair } from '@/components/forest/RealPhoto';
import type { NarrationKey } from '@/lib/narration';
import { RealMap } from '@/components/forest/RealMap';
import { A11yBar, isLight, useLightMode } from '@/components/forest/A11yBar';
import { CONSENT, birthDecade, canRecord, countUse, forestAt, insertResearch, isAdult, isPrototype, normalize, referenceYear, responseCode, type ForestData, type Municipality, type Residence, ufOf } from '@/lib/research';
import { createShareCard } from '@/lib/share-card';
import { BIOMES, DEFAULT_BIOME, biomeBySlug, type Biome } from '@/lib/biomes';

const BiomeContext = createContext<Biome>(DEFAULT_BIOME);
const useBiome = () => useContext(BiomeContext);

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'A floresta da sua infância · Brasil' },
    { name: 'description', content: 'Lembre quanta floresta, mata, cerrado, caatinga ou campo havia no seu município quando você tinha 10 anos e compare com os dados do MapBiomas.' },
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
  const [biome, setBiome] = useState<Biome>(DEFAULT_BIOME);
  const main = useRef<HTMLElement>(null);
  const data = useQuery({ queryKey: ['forest-data', biome.slug], queryFn: async () => { const r = await fetch(`/dados/${biome.slug}.json`); if (!r.ok) throw new Error('Dados indisponíveis'); return r.json() as Promise<ForestData>; } });
  useEffect(() => { setPrototype(isPrototype(window.location.hostname)); const chosen = biomeBySlug(new URLSearchParams(window.location.search).get('bioma')); if (chosen) setBiome(chosen); }, []);
  useEffect(() => { if (!isPrototype(window.location.hostname)) void countUse('inicio'); }, []);
  useEffect(() => { main.current?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);
  const go = (next: Step) => setStep(next);
  const startExplore = () => { setExploring(true); setPlace(undefined); setGuess(undefined); setTodayGuess(null); setFutureGuess(null); setResidence(null); setMemories([]); go('place'); };

  return <BiomeContext.Provider value={biome}><div className={`app-shell bioma-${biome.slug}`}>
    {prototype && <div className="prototype-strip" role="status">Protótipo para testes: nenhuma resposta é gravada</div>}
    <main ref={main} tabIndex={-1} className="outline-none">
      {step === 'start' && <Start biome={biome} setBiome={setBiome} agreed={agreed} setAgreed={setAgreed} begin={() => { setConsented(true); setExploring(false); go('place'); }} explore={() => { setConsented(false); startExplore(); }} />}
      {step !== 'start' && <QuestionFrame step={step} exploring={exploring}>
        {step === 'place' && <PlaceQuestion data={data.data} loading={data.isLoading} error={data.isError} exploring={exploring} onChoose={(m) => { setPlace(m); go(birth ? 'guess' : 'birth'); }} onOutside={() => go('start')} />}
        {step === 'birth' && place && <BirthQuestion birth={birth} consented={consented && !exploring} onNext={(y) => { setBirth(y); go('memory'); }} />}
        {step === 'memory' && place && birth && <MemoryWalk name={place[0]} year={referenceYear(birth)} initial={memories} onNext={(list) => { setMemories(list); go('guess'); }} />}
        {step === 'guess' && place && birth && <GuessQuestion key="childhood" title={<>Feche os olhos e lembre de <b>{place[0]}</b> em <b>{referenceYear(birth)}</b>, quando você tinha {referenceYear(birth) - birth} anos. Imagine o município dividido em 10 pedaços iguais. Quantos desses 10 você acha que eram {biome.noun}?</>} help={`${biome.help} Não tem resposta errada: queremos saber o que você lembra.`} action="Confirmar meu chute" photo={{ name: place[0], year: referenceYear(birth), memories }} onConfirm={(v) => { setGuess(v); go('today'); }} />}
        {step === 'today' && place && <GuessQuestion key="today" title={<>E hoje? Dos mesmos 10 pedaços de <b>{place[0]}</b>, quantos você acha que ainda são {biome.noun}?</>} help="Esta pergunta é opcional." action="Confirmar" skip={() => { setTodayGuess(null); go('future'); }} onConfirm={(v) => { setTodayGuess(v); go('future'); }} />}
        {step === 'future' && place && <GuessQuestion key="future" title={<>Uma criança que nasce hoje em <b>{place[0]}</b> vai ter 10 anos em {new Date().getFullYear() + 10}. Dos 10 pedaços do município, quantos você gostaria que ainda fossem {biome.noun} nessa época?</>} help="Esta pergunta é opcional. Não é uma previsão: é o que você acha que deveria ficar para ela." action="Confirmar" skip={() => { setFutureGuess(null); go('residence'); }} onConfirm={(v) => { setFutureGuess(v); go('residence'); }} />}
        {step === 'residence' && place && <ResidenceQuestion name={place[0]} onAnswer={(r) => { setResidence(r); go('reveal'); }} />}
        {step === 'reveal' && place && birth !== undefined && guess !== undefined && <Reveal place={place} birth={birth} guess={guess} memories={memories} todayGuess={todayGuess} futureGuess={futureGuess} residence={residence} biome={biome} consented={consented} exploring={exploring} prototype={prototype} again={startExplore} />}
      </QuestionFrame>}
    </main>
    <footer className="site-footer"><p>Fonte: Projeto MapBiomas, Coleção 11 da Série Anual de Mapas de Cobertura e Uso da Terra do Brasil (1985 a 2025).</p><p>Pesquisa de Priscila Motta Gadelha Silva, engenheira cartógrafa e agrimensora. Trabalho inscrito no 9º Prêmio MapBiomas.</p></footer>
  </div></BiomeContext.Provider>;
}

function Start({ biome, setBiome, agreed, setAgreed, begin, explore }: { biome: Biome; setBiome: (b: Biome) => void; agreed: boolean; setAgreed: (v: boolean) => void; begin: () => void; explore: () => void }) {
  const terms = useQuery({ queryKey: ['terms'], queryFn: async () => { const r = await fetch('/termo_v1.json'); if (!r.ok) throw new Error('Termo indisponível'); return r.json() as Promise<string[]>; } });
  return <section className="start-page" aria-labelledby="title">
    <div className="hero-scene"><header className="start-top"><div className="wordmark"><Sprout aria-hidden="true" /><span>{biome.title[0]}<br />{biome.title[1]}</span></div><div className="award-mark"><strong>9º Prêmio MapBiomas</strong>Categoria Comunicação</div></header><Landscape cover={100} intro biome={biome.slug} /><div className="hero-copy"><p className="eyebrow">{biome.name} · Memória · Paisagem</p><h1 id="title">{biome.hook}</h1><p>Uma viagem curta entre o que você lembra e o que os satélites registraram {biome.inName}.</p></div><span className="hero-caption">6 biomas · 41 anos de história · a sua memória</span></div>
    <section className="biome-picker" aria-labelledby="bioma-titulo"><h2 id="bioma-titulo">Em que bioma você passou a infância?</h2><p className="help">Se não souber, escolha pela paisagem que você lembra. Dá para trocar depois.</p><div className="biome-grid" role="radiogroup" aria-labelledby="bioma-titulo">{BIOMES.map((b) => <button key={b.slug} type="button" role="radio" aria-checked={b.slug === biome.slug} className={`biome-card biome-${b.slug}`} onClick={() => setBiome(b)}><strong>{b.name}</strong><span>{b.card}</span></button>)}</div></section>
    <div className="consent-panel"><A11yBar target={() => document.querySelector('main')} narration="inicio" />
      <p className="consent-text">{CONSENT}</p>
      <details className="terms"><summary>Ler o termo completo <ChevronDown aria-hidden="true" /></summary><div>{terms.isLoading && <p>Carregando o termo…</p>}{terms.isError && <p>Não conseguimos carregar o termo agora. Tente recarregar a página.</p>}{terms.data?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></details>
      <label className="check-row"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span>Tenho 18 anos ou mais, li o termo e concordo em participar.</span></label>
      <Button variant="forest" size="xl" disabled={!agreed} onClick={begin}>Começar <ArrowRight aria-hidden="true" /></Button>
      <Button variant="link" className="text-link" onClick={explore}>Ver só os dados, sem participar</Button>
      <Link to="/painel" className="text-link panel-link">O que o Brasil lembra: ver o painel</Link>
      <Link to="/sala" className="text-link">Sou professor(a): modo sala de aula</Link>
    </div>
  </section>;
}

/** Fala gravada de cada etapa (ver src/lib/narration.ts). */
function narrationFor(step: Step, exploring: boolean, biome: Biome): NarrationKey | undefined {
  const map: Partial<Record<Step, NarrationKey>> = { place: exploring ? 'explorar' : 'municipio', birth: 'nascimento', memory: 'lembrancas', guess: biome.slug === 'amazonia' ? 'chute' : `chute-${biome.slug}`, today: 'hoje', future: 'futuro', residence: 'moradia', reveal: 'revelacao' };
  return map[step];
}
/** Na revelação, depois da fala gravada, tocam os números da pessoa, também gravados (public/vozes/numeros). */
const revealSummary = () => { const el = document.querySelector<HTMLElement>('.reveal-sentence'); const n = (k: string) => el?.dataset[k]; const clip = (kind: string, v: string | undefined) => v === undefined ? [] : [`/vozes/numeros/${kind}-${v}.mp3`]; return [...clip('lembrou', n('lembrou')), ...clip('satelite', n('satelite')), ...clip('hoje', n('hoje')), ...clip('chutou', n('chutou'))]; };

function QuestionFrame({ step, exploring, children }: { step: Step; exploring: boolean; children: React.ReactNode }) {
  const order: Step[] = ['place', 'birth', 'memory', 'guess', 'today', 'future', 'residence', 'reveal'];
  return <section className="question-page"><div className="question-top"><span className="brand-mark"><Sprout aria-hidden="true" /> {useBiome().title.join(' ')}</span><span className="step-count">{step === 'reveal' ? 'Revelação' : `Etapa ${order.indexOf(step) + 1} de ${order.length - 1}`}</span></div><A11yBar key={step} target={() => document.querySelector('main')} narration={narrationFor(step, exploring, useBiome())} extra={step === 'reveal' ? revealSummary : undefined} />{exploring && <p className="explore-note" role="status">Modo explorar: esta rodada não será gravada.</p>}{children}</section>;
}

function PlaceQuestion({ data, loading, error, exploring, onChoose, onOutside }: { data: ForestData | undefined; loading: boolean; error: boolean; exploring: boolean; onChoose: (m: Municipality) => void; onOutside: () => void }) {
  const b = useBiome();
  const [query, setQuery] = useState(''); const [active, setActive] = useState(0);
  const options = useMemo(() => (data?.m ?? []).filter((m) => normalize(`${m[0]} ${ufOf(m[1])}`).includes(normalize(query.trim()))), [data, query]);
  const total = options.length + (exploring ? 0 : 1);
  const choose = (i: number) => { const m = options[i]; if (m) onChoose(m); else if (!exploring) { onOutside(); setQuery(''); setActive(0); } };
  const keys = (e: KeyboardEvent) => { if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(total - 1, a + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); } if (e.key === 'Enter') { e.preventDefault(); choose(active); } };
  return <div className="question-card"><h1>{exploring ? `Qual município ${b.ofName} você quer explorar?` : `Em que município ${b.ofName} você morava quando tinha 10 anos?`}</h1><p className="help">{exploring ? `Escolha qualquer município com pelo menos 10% da área ${b.inName}.` : 'Se mudou muito, escolha o lugar que você mais lembra daquela época.'}</p>
    <label className="field-label" htmlFor="municipio">Digite o nome do município</label><div className="search-box"><MapPin aria-hidden="true" /><input id="municipio" role="combobox" aria-expanded="true" aria-controls="municipios" aria-activedescendant={`opt-${active}`} autoComplete="off" value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={keys} placeholder="Ex.: Maraba" /></div>
    {loading && <p className="help">Carregando municípios…</p>}{error && <p className="error-text">Não conseguimos carregar os dados. Verifique a internet e tente de novo.</p>}
    <ul id="municipios" role="listbox" className="option-list" aria-label={`Municípios ${b.ofName}`}>{options.map((m, i) => <li id={`opt-${i}`} role="option" aria-selected={i === active} key={m[1]} onMouseEnter={() => setActive(i)} onClick={() => choose(i)}>{m[0]} <span className="option-uf">{ufOf(m[1])}</span></li>)}{!exploring && <li id={`opt-${options.length}`} role="option" aria-selected={active === options.length} className="outside-option" onClick={() => choose(options.length)}>Meu município não está aqui: escolher outro bioma</li>}</ul>
    {!loading && options.length === 0 && <p className="help">Nenhum município encontrado com esse nome.</p>}
  </div>;
}

function BirthQuestion({ birth, consented, onNext }: { birth: number | undefined; consented: boolean; onNext: (y: number) => void }) {
  const b = useBiome();
  const [year, setYear] = useState(birth ? String(birth) : ''); const y = Number(year); const current = new Date().getFullYear();
  return <div className="question-card"><h1>Em que ano você nasceu?</h1><ol className="how-steps" aria-label="Como funciona"><li><b>Seu ano</b> mostra em que ano você tinha 10 anos.</li><li><b>Seu chute:</b> você lembra quanto havia de {b.noun} no município nessa época.</li><li><b>O satélite</b> mostra quanto havia de verdade, e quanto há hoje.</li></ol><label className="field-label" htmlFor="nascimento">Ano de nascimento</label><select id="nascimento" className="year-select" value={year} onChange={(e) => setYear(e.target.value)}><option value="">Escolha o ano</option>{years.map((v) => <option key={v}>{v}</option>)}</select>
    {year && y + 10 >= 1985 && <p className="help">Você tinha 10 anos em <b>{referenceYear(y)}</b>. É desse ano que vamos pedir para você lembrar.</p>}
    {year && y + 10 < 1985 && <p className="notice">O MapBiomas começa em 1985. Vamos comparar seu chute com o retrato mais antigo que existe, quando você tinha {1985 - y} anos.</p>}
    {year && consented && !isAdult(y, current) && <p className="notice">Você pode jogar normalmente, mas como a pesquisa é só para maiores de 18 anos, sua resposta não será gravada.</p>}
    <Button variant="forest" size="xl" disabled={!year} onClick={() => onNext(y)}>Continuar <ArrowRight aria-hidden="true" /></Button></div>;
}

function GuessQuestion({ title, help, action, onConfirm, skip, photo }: { title: React.ReactNode; help: string; action: string; onConfirm: (v: number) => void; skip?: () => void; photo?: { name: string; year: number; memories: string[] } }) {
  const b = useBiome();
  const [value, setValue] = useState<number>(); const track = useRef<HTMLDivElement>(null);
  const update = (e: PointerEvent<HTMLDivElement>) => { if (e.type === 'pointermove' && e.buttons !== 1) return; const box = track.current?.getBoundingClientRect(); if (!box) return; setValue(Math.round(Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * 10) * 10); };
  const key = (e: KeyboardEvent) => { const change: Record<string, number> = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10, PageUp: 10, PageDown: -10 }; if (e.key === 'Home') setValue(0); else if (e.key === 'End') setValue(100); else if (change[e.key] !== undefined) setValue((v) => Math.max(0, Math.min(100, (v ?? 0) + (change[e.key] ?? 0)))); else return; e.preventDefault(); };
  const scene = <div className="iso-stage"><SatTerrain cover={value ?? 0} empty={value === undefined} biome={b.slug} /><div className="guess-number" aria-hidden="true">{value === undefined ? <strong className="guess-empty">?</strong> : <><strong>{value / 10}</strong><span>de 10</span></>}</div><div className="iso-legend" aria-hidden="true"><span><i className="lg-forest" />{b.legend}</span><span><i className="lg-other" />pasto, roça, cidade e outros usos</span></div></div>;
  const slider = <div className="planting-control"><div ref={track} className="planting-track" role="slider" tabIndex={0} aria-label={`Quantos de cada 10 pedaços eram ${b.noun}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={value === undefined ? 'Ainda sem resposta' : `${value / 10} de cada 10 pedaços eram ${b.noun}`} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); update(e); }} onPointerMove={update} onKeyDown={key}><span className="track-fill" style={{ width: `${value ?? 0}%` }} /><span className={`track-thumb ${value === undefined ? 'track-thumb-idle' : ''}`} style={{ left: `${value ?? 50}%` }}><Sprout aria-hidden="true" /></span></div><div className="track-labels" aria-hidden="true"><span>nenhuma floresta</span><span>toda floresta</span></div></div>;
  return <div className="guess-layout"><div className="question-card guess-copy"><h1>{title}</h1><p className="help">{help}</p></div>
    {scene}{photo && <p className="iso-place">{photo.name}, {photo.year}</p>}{slider}
    <div className="guess-actions"><p className="guess-caption" aria-live="polite">{value === undefined ? `Arraste a muda até a paisagem ficar parecida com a que você lembra.` : `${value / 10} de cada 10 pedaços de terra eram ${b.noun}.`}</p>
      <details className="number-alt"><summary>Prefiro digitar o número</summary><label>De 0 a 10<input inputMode="numeric" type="number" min="0" max="10" value={value === undefined ? '' : value / 10} onChange={(e) => setValue(e.target.value === '' ? undefined : Math.max(0, Math.min(10, Math.round(Number(e.target.value)))) * 10)} /></label></details>
      <Button variant="memory" size="xl" disabled={value === undefined} onClick={() => value !== undefined && onConfirm(value)}>{action}</Button>{skip && <Button variant="quiet" size="xl" onClick={skip}>Pular</Button>}</div></div>;
}

function ResidenceQuestion({ name, onAnswer }: { name: string; onAnswer: (r: Residence | null) => void }) {
  const options: [Residence, string][] = [['sim', 'Sim, moro lá'], ['visita', 'Não, mas visito'], ['saiu', 'Não, saí de lá']];
  return <div className="question-card"><h1>Você ainda mora em {name}?</h1><p className="help">Esta pergunta é opcional.</p><div className="choice-stack">{options.map(([v, label]) => <Button key={v} variant="choice" size="xl" onClick={() => onAnswer(v)}>{label}</Button>)}<Button variant="quiet" size="xl" onClick={() => onAnswer(null)}>Pular</Button></div></div>;
}

function Reveal({ place, birth, guess, memories, todayGuess, futureGuess, residence, biome, consented, exploring, prototype, again }: { place: Municipality; birth: number; guess: number; memories: string[]; todayGuess: number | null; futureGuess: number | null; residence: Residence | null; biome: Biome; consented: boolean; exploring: boolean; prototype: boolean; again: () => void }) {
  const ref = referenceYear(birth); const past = forestAt(place, ref); const today = forestAt(place, 2025);
  const [year, setYear] = useState(ref); const [done, setDone] = useState(false); const [view, setView] = useState<'then' | 'now'>('then'); const [replay, setReplay] = useState(0); const [code, setCode] = useState<string>(); const [record, setRecord] = useState<'checking' | 'saved' | 'duplicate' | 'off' | 'prototype' | 'error'>('checking'); const [shareStatus, setShareStatus] = useState(''); const [message, setMessage] = useState(''); const sent = useRef(false);
  // Para primeiro no ano da infância (lembrança x satélite lado a lado), depois viaja até 2025 e volta para a comparação.
  useEffect(() => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || isLight() || ref === 2025) { setYear(ref); setView('then'); setDone(true); return; } setYear(ref); const hold = replay ? 1200 : 3500; const duration = Math.min(9000, Math.max(3500, (2025 - ref) * 240)); let frame = 0; let start = 0; const tick = (now: number) => { if (!start) start = now; const t = Math.min(1, (now - start) / duration); setYear(Math.round(ref + (2025 - ref) * t)); if (t < 1) frame = requestAnimationFrame(tick); else { setView('then'); setDone(true); } }; const wait = window.setTimeout(() => { frame = requestAnimationFrame(tick); }, hold); return () => { window.clearTimeout(wait); cancelAnimationFrame(frame); }; }, [ref, replay]);
  const shownYear = done ? (view === 'then' ? ref : 2025) : year; const memoryValue = done && view === 'now' && todayGuess !== null ? todayGuess : guess; const memoryLabel = done && view === 'now' ? (todayGuess !== null ? 'Seu chute para hoje' : 'Sua lembrança') : 'Sua lembrança'; const memoryYear = done && view === 'now' && todayGuess !== null ? 2025 : ref;
  useEffect(() => { if (sent.current) return; sent.current = true; let duplicate = true; try { duplicate = localStorage.getItem('floresta_respondeu') !== null; } catch { /* Without storage, fail closed to avoid duplicate collection. */ } const eligible = canRecord(consented, birth, new Date().getFullYear(), exploring, duplicate); const id = responseCode(); setCode(id); if (!eligible) { setRecord(duplicate && consented && !exploring && isAdult(birth, new Date().getFullYear()) ? 'duplicate' : 'off'); return; } if (prototype) { setRecord('prototype'); return; } const origin = new URLSearchParams(window.location.search).get('utm_source') || 'direto'; insertResearch('respostas', { id_resposta: id, versao_questionario: 'v1', cod_ibge_municipio: place[1], ano_nascimento: birth, ano_referencia: ref, chute_infancia_pct: guess, chute_hoje_pct: todayGuess, chute_futuro_pct: futureGuess, ainda_mora: residence, bioma: biome.slug, real_infancia_pct: past, real_hoje_pct: today, colecao_mapbiomas: '11', origem: origin }).then(() => { try { localStorage.setItem('floresta_respondeu', '1'); } catch { /* The response already reached the service; do not retry. */ } setRecord('saved'); }).catch(() => setRecord('error')); }, []);
  const [light] = useLightMode();
  const counted = useRef(false);
  useEffect(() => { if (!done || counted.current || prototype) return; counted.current = true; void countUse('revelacao', consented && !exploring ? 'participou' : 'explorou'); }, [done, prototype, consented, exploring]);
  const diff = guess / 10 - tenths(past); const diffText = diff === 0 ? 'Seu chute bateu com o satélite.' : `O satélite viu ${tenths(past)} de 10, ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'pedaço' : 'pedaços'} ${diff > 0 ? 'a menos' : 'a mais'} do que você lembrou.`;
  const share = async () => { try { setShareStatus('Preparando seu cartão…'); const file = await createShareCard(place[0], ref, guess, past, today, message.trim(), place[1], { title: biome.title.join(' '), noun: biome.noun, legend: biome.legend, ask: `E você, ${biome.hook.replace(' você viu crescendo?', '').toLowerCase()} lembra?` }, biome.indicator === 'floresta' ? 'mapas' : 'mapas-nativa'); if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: biome.title.join(' '), text: `E você, ${biome.hook.replace(' você viu crescendo?', '').toLowerCase()} lembra?` }); setShareStatus('Cartão compartilhado.'); if (!prototype && consented && !exploring && isAdult(birth, new Date().getFullYear()) && (record === 'saved' || record === 'error')) await insertResearch('compartilhamentos', { id_resposta: record === 'saved' ? code : null, rede: 'web-share' }).catch(() => undefined); } else { const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); URL.revokeObjectURL(url); setShareStatus('A imagem foi baixada.'); if (!prototype && consented && !exploring && isAdult(birth, new Date().getFullYear()) && (record === 'saved' || record === 'error')) await insertResearch('compartilhamentos', { id_resposta: record === 'saved' ? code : null, rede: 'download' }).catch(() => undefined); } } catch (e) { setShareStatus(e instanceof DOMException && e.name === 'AbortError' ? '' : 'Não foi possível preparar o cartão agora.'); } };
  return <div className="reveal-page">{!light && <div className="compare-panels" aria-hidden="true"><figure className="compare-panel panel-memory"><figcaption><span>{memoryLabel}</span><strong>{memoryValue / 10} de 10</strong><small>{place[0]}, {memoryYear}</small></figcaption><SatTerrain cover={memoryValue} flat biome={biome.slug} /></figure><figure className="compare-panel panel-real"><figcaption><span>Satélite · {shownYear}</span><strong>{tenths(forestAt(place, shownYear))} de 10</strong><small>{Math.round(forestAt(place, shownYear))}% de {biome.noun}, pelo MapBiomas</small></figcaption><RealMap cod={place[1]} year={shownYear} fallback={forestAt(place, shownYear)} biome={biome} /></figure></div>}
    {!light && !done && year === ref && <p className="compare-hold" role="status">Em {ref}: você lembrou <b>{guess / 10} de 10</b>. O satélite viu <b>{tenths(past)} de 10</b>.</p>}
    {!light && done && <div className="compare-switch" role="group" aria-label="Escolha o que comparar"><button type="button" aria-pressed={view === 'then'} onClick={() => setView('then')}>{ref}: lembrança × satélite</button><button type="button" aria-pressed={view === 'now'} onClick={() => setView('now')}>Hoje{todayGuess !== null ? ': seu chute × satélite' : ''}</button>{ref !== 2025 && <button type="button" className="compare-replay" onClick={() => { setDone(false); setReplay((r) => r + 1); }}>Ver a viagem de novo</button>}</div>}
    <div className="reveal-copy"><p className="eyebrow">Memória x satélite</p><h1 aria-live="polite">{done ? `Em ${ref}, ${Math.round(past)}% de ${place[0]} era ${biome.noun}.` : `Viajando de ${ref} até 2025…`}</h1>{done && <><p className="reveal-sentence" data-lembrou={guess / 10} data-satelite={tenths(past)} data-hoje={tenths(today)} data-chutou={todayGuess === null ? undefined : todayGuess / 10}>Você lembrou {guess / 10} de cada 10 pedaços. {diffText} Hoje são {Math.round(today)}%, cerca de {tenths(today)} de cada 10.{todayGuess !== null && <> Para hoje, você chutou {todayGuess / 10} de 10: {todayText(todayGuess, today)}</>}</p>{!light && <PhotoPair cod={place[1]} year={ref} name={place[0]} />}<div className="stat-row"><Stat label="Sua lembrança" value={guess} tone="memory" /><Stat label={`Real em ${ref}`} value={past} tone="forest" /><Stat label="Real em 2025" value={today} tone="earth" /></div><Reflection place={place} birth={birth} ref={ref} memories={memories} futureGuess={futureGuess} message={message} setMessage={setMessage} /><p className="method-note">Os dados usam os limites atuais do município. Se ele foi criado depois de 1985, mostramos o mesmo território antes da emancipação.</p><RecordNotice status={record} code={code} />{(record === 'saved' || record === 'prototype') && <Testimony uf={ufOf(place[1])} decade={birthDecade(birth)} prototype={record === 'prototype'} />}<SeriesChart series={place[2]} guess={guess} ref={ref} todayGuess={todayGuess} /><Link to="/painel" className="panel-teaser"><b>O que o Brasil lembra</b><span>Veja como cada geração lembra a paisagem, somando todas as respostas.</span><ArrowRight aria-hidden="true" /></Link><div className="action-stack"><Button variant="forest" size="xl" onClick={share}><Share2 aria-hidden="true" /> Compartilhar cartão</Button><Button variant="quiet" size="xl" onClick={again}><RotateCcw aria-hidden="true" /> Explorar outro município</Button><p role="status" className="help">{shareStatus}</p></div></>}</div></div>;
}

/** Mapa real do MapBiomas (tira com um quadro por ano, gerada por pesquisa/mapas/gerar_mapas.py). Sem mapa, mostra o bloco 3D com o valor medido. */

/** Percentual arredondado para pedaços de 10. */
function tenths(pct: number) { return Math.round(pct / 10); }
function todayText(chute: number, real: number) { const d = chute / 10 - tenths(real); return d === 0 ? 'acertou.' : `o satélite mostra ${Math.abs(d)} ${Math.abs(d) === 1 ? 'pedaço' : 'pedaços'} ${d > 0 ? 'a menos' : 'a mais'}.`; }

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className={`stat stat-${tone}`}><span>{label}</span><strong>{Math.round(value)}%</strong></div>; }
/** Depoimento opcional, guardado sem ligação com a resposta (só texto, estado e década de nascimento). */
function Testimony({ uf, decade, prototype }: { uf: string; decade: number; prototype: boolean }) {
  const [text, setText] = useState(''); const [quote, setQuote] = useState(false); const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const send = async () => { if (prototype) { setStatus('sent'); return; } setStatus('sending'); try { await insertResearch('depoimentos', { texto: text.trim(), pode_citar: quote, uf: uf || null, decada_nascimento: decade }); setStatus('sent'); } catch { setStatus('error'); } };
  if (status === 'sent') return <p className="record-box testimony-done">{prototype ? 'No site oficial, seu depoimento seria enviado agora.' : 'Obrigada! Seu depoimento foi enviado.'}</p>;
  return <section className="testimony" aria-labelledby="depoimento-titulo">
    <h2 id="depoimento-titulo">Quer contar o que sentiu?</h2>
    <p className="help">Opcional. Os depoimentos ajudam a mostrar o que esta comparação provoca nas pessoas.</p>
    <label className="field-label" htmlFor="depoimento">Seu depoimento</label>
    <textarea id="depoimento" className="message-box" maxLength={280} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ver o mapa me fez lembrar…" />
    <p className="help small-note">{text.length}/280. Não escreva nomes, telefones ou endereços. Guardamos só o texto, o seu estado e a década em que você nasceu, separados das suas outras respostas.</p>
    <label className="check-row"><input type="checkbox" checked={quote} onChange={(e) => setQuote(e.target.checked)} /><span>Pode citar meu depoimento, sem meu nome, em textos e apresentações desta pesquisa.</span></label>
    <Button variant="forest" size="lg" disabled={text.trim().length < 10 || status === 'sending'} onClick={send}>{status === 'sending' ? 'Enviando…' : 'Enviar depoimento'}</Button>
    {status === 'error' && <p className="help error-text" role="status">Não conseguimos enviar agora. Tente de novo em instantes.</p>}
  </section>;
}
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
  return <figure className="series-chart"><figcaption>Floresta medida de 1985 a 2025</figcaption><svg viewBox="0 0 360 240" role="img" aria-label={`Gráfico de ${useBiome().noun} medido. Em 1985, ${Math.round(series[0] ?? 0)}%. Em ${ref}, ${Math.round(series[ref - 1985] ?? 0)}%. Em 2025, ${Math.round(series[40] ?? 0)}%. Seu chute foi ${guess}%.`}>{[0, 50, 100].map((v) => <g key={v}><path className="chart-grid" d={`M38 ${y(v)}H342`} /><text className="chart-label" x="4" y={y(v) + 5}>{v}%</text></g>)}<path className="chart-area" d={`${line} L342 205 L38 205Z`} /><path className="chart-line" d={line} /><circle className="chart-real" cx={x(ref)} cy={y(series[ref - 1985] ?? 0)} r="7" /><circle className="chart-guess" cx={x(ref)} cy={y(guess)} r="8" /><circle className="chart-now" cx={x(2025)} cy={y(series[40] ?? 0)} r="7" />{todayGuess !== null && <circle className="chart-guess-hollow" cx={x(2025)} cy={y(todayGuess)} r="7" />}<text className="chart-label" x="38" y="232">1985</text><text className="chart-label" x="302" y="232">2025</text></svg><div className="chart-legend"><span><i className="legend-guess" />Seu chute</span><span><i className="legend-real" />Real</span><span><i className="legend-now" />Hoje</span></div></figure>;
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
  const b = useBiome();
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
    <p className="help">Cada geração cresce achando normal a paisagem que viu aos 10 anos.</p>
    <ol className="generations">{generations.map((g) => <li key={g.year}><span className="gen-who">{g.who}</span><span className="gen-year">{g.year}</span><span className="gen-bar" aria-hidden="true"><i style={{ width: `${at(g.year)}%` }} /></span><strong>{at(g.year)}% de {b.noun}</strong><span className="gen-note">era o normal</span></li>)}</ol>
    {futureGuess !== null && <p className="future-echo">Para a criança que nasce hoje, você gostaria de <strong>{futureGuess}% de {b.noun}</strong> quando ela tiver 10 anos. {futureGuess > last ? `É mais do que os ${last}% de agora: seria preciso recuperar ${b.noun}.` : futureGuess === last ? `É o que existe hoje: seria preciso parar a perda.` : `É menos do que os ${last}% de agora.`}</p>}
    <h2>Por que a gente esquece?</h2>
    <div className="why-cards">
      <article><h3>A régua é a infância</h3><p>A gente mede o mundo pelo que viu quando era criança. Os cientistas chamam isso de síndrome da linha de base móvel: a cada geração, o ponto de partida fica mais baixo, e a perda deixa de parecer perda.</p></article>
      <article><h3>A perda some de vista</h3><p>{first - last >= 1 ? <>Em 1985, {first}% de {place[0]} era {b.noun}. Em 2025, {last}%. Quem nasceu depois de 2015 nunca viu os {first}%: para essa criança, {last}% é o normal.</> : <>Em {place[0]}, o que o satélite mediu de {b.noun} ficou perto de {last}% entre 1985 e 2025. Em muitos municípios vizinhos não foi assim: explore outro para comparar.</>}</p></article>
      <article><h3>O que fica para quem vem depois?</h3><p>Pense numa criança de 10 anos de {place[0]} hoje. O que você viu e ela nunca vai ver?</p>
        <label className="field-label" htmlFor="recado">Escreva um recado para ela (opcional)</label>
        <textarea id="recado" className="message-box" maxLength={120} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Quando eu tinha 10 anos, aqui tinha…" />
        <p className="help small-note">{message.length}/120. O recado vai só para o seu cartão de compartilhar. Não guardamos esse texto.</p></article>
    </div>
  </section>;
}
