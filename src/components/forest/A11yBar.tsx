import { useEffect, useState, useSyncExternalStore } from 'react';
import { Feather, Square, Volume2 } from 'lucide-react';

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

/** Barra com "Ouvir esta tela" (voz do próprio aparelho, em português) e a versão leve. */
export function A11yBar({ target }: { target: () => HTMLElement | null }) {
  const [light, setLight] = useLightMode();
  const [speaking, setSpeaking] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  useEffect(() => { setCanSpeak('speechSynthesis' in window); return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }; }, []);
  const speak = () => {
    const synth = window.speechSynthesis;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const root = target(); if (!root) return;
    const utter = new SpeechSynthesisUtterance(readableText(root));
    utter.lang = 'pt-BR'; utter.rate = 0.95;
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt-br')) ?? synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt'));
    if (voice) utter.voice = voice;
    utter.onend = () => setSpeaking(false); utter.onerror = () => setSpeaking(false);
    synth.cancel(); synth.speak(utter); setSpeaking(true);
  };
  return <div className="a11y-bar">
    {canSpeak && <button type="button" onClick={speak} aria-pressed={speaking}>{speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}{speaking ? 'Parar leitura' : 'Ouvir esta tela'}</button>}
    <button type="button" onClick={() => setLight(!light)} aria-pressed={light}><Feather aria-hidden="true" />{light ? 'Versão leve: ligada' : 'Versão leve'}</button>
  </div>;
}
