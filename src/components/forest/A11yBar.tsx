import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Feather, Square, Volume2 } from 'lucide-react';
import type { NarrationKey } from '@/lib/narration';

const KEY = 'floresta_leve';
/** Versão leve: sem animações, sem mapas e paisagens desenhadas. Lembrada só neste aparelho. */
export const isLight = () => typeof document !== 'undefined' && document.documentElement.classList.contains('leve');

const listeners = new Set<() => void>();
let started = false;
function subscribe(fn: () => void) {
  if (!started) { started = true; let saved = false; try { saved = localStorage.getItem(KEY) === '1'; } catch { /* sem armazenamento, começa desligada */ } document.documentElement.classList.toggle('leve', saved); queueMicrotask(() => listeners.forEach((l) => l())); }
  listeners.add(fn); return () => { listeners.delete(fn); };
}
export function setLightMode(on: boolean) {
  document.documentElement.classList.toggle('leve', on);
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* ignora */ }
  listeners.forEach((l) => l());
}
export function useLightMode() {
  const light = useSyncExternalStore(subscribe, isLight, () => false);
  return [light, setLightMode] as const;
}

/** Texto visível da área principal, sem o que está escondido ou marcado para não ler. */
function readableText(root: HTMLElement) {
  const parts: string[] = [];
  const walk = (el: Element) => {
    if (el.closest('[aria-hidden="true"], .a11y-bar, script, style, [hidden]')) return;
    if (el instanceof HTMLElement && el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) { const t = node.textContent?.trim(); if (t) parts.push(t); }
      else if (node instanceof Element) {
        if (node.matches('input[type="range"]')) { const label = node.getAttribute('aria-valuetext') ?? (node as HTMLInputElement).value; parts.push(`${label}`); continue; }
        walk(node);
        if (/^(P|H1|H2|H3|LI|LABEL|BUTTON|FIGCAPTION|DIV)$/.test(node.tagName)) parts.push('.');
      }
    }
  };
  walk(root);
  return parts.join(' ').replace(/\s+\./g, '.').replace(/\.{2,}/g, '.').replace(/\s+/g, ' ').trim();
}

/** Lê um texto com a voz do aparelho, em português. */
function speakText(text: string, done: () => void) {
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'pt-BR'; utter.rate = 0.95;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt-br')) ?? synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt'));
  if (voice) utter.voice = voice;
  utter.onend = done; utter.onerror = done;
  synth.cancel(); synth.speak(utter);
}

/**
 * Barra com "Ouvir esta tela" e a versão leve.
 * Com `narration`, toca a fala gravada daquela tela (public/vozes/<chave>.mp3) e, se houver,
 * lê em seguida com a voz do aparelho o que muda de pessoa para pessoa (`extra`).
 * Sem gravação (ou se o áudio falhar), lê a tela inteira com a voz do aparelho.
 */
export function A11yBar({ target, narration, extra }: { target: () => HTMLElement | null; narration?: NarrationKey | undefined; extra?: (() => string | string[]) | undefined }) {
  const [light, setLight] = useLightMode();
  const [speaking, setSpeaking] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const canSynth = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
  const stop = () => { audio.current?.pause(); audio.current = null; if (canSynth()) window.speechSynthesis.cancel(); setSpeaking(false); };
  useEffect(() => { setCanSpeak(canSynth() || !!narration); return () => { audio.current?.pause(); audio.current = null; if (canSynth()) window.speechSynthesis.cancel(); }; }, [narration]);
  const readScreen = () => { const root = target(); if (!root || !canSynth()) { setSpeaking(false); return; } speakText(readableText(root), () => setSpeaking(false)); };
  const speak = () => {
    if (speaking) { stop(); return; }
    setSpeaking(true);
    if (!narration) { readScreen(); return; }
    const player = new Audio(`/vozes/${narration}.mp3`); audio.current = player;
    // Depois da fala fixa: uma lista de trechos gravados (números da revelação) ou um texto para a voz do aparelho.
    const playClips = (clips: string[]) => { const next = clips[0]; if (!next) { setSpeaking(false); return; } const p = new Audio(next); audio.current = p; const skip = () => { if (audio.current === p) playClips(clips.slice(1)); }; p.onended = skip; p.onerror = skip; p.play().catch(() => { if (audio.current === p) playClips(clips.slice(1)); }); };
    player.onended = () => { if (audio.current !== player) return; audio.current = null; const more = extra?.(); if (Array.isArray(more)) { playClips(more); return; } const text = more?.trim(); if (text && canSynth()) speakText(text, () => setSpeaking(false)); else setSpeaking(false); };
    player.onerror = () => { if (audio.current !== player) return; audio.current = null; readScreen(); };
    player.play().catch(() => { if (audio.current === player) { audio.current = null; readScreen(); } });
  };
  return <div className="a11y-bar">
    {canSpeak && <button type="button" onClick={speak} aria-pressed={speaking}>{speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}{speaking ? 'Parar leitura' : 'Ouvir esta tela'}</button>}
    <button type="button" onClick={() => setLight(!light)} aria-pressed={light}><Feather aria-hidden="true" />{light ? 'Versão leve: ligada' : 'Versão leve'}</button>
  </div>;
}
