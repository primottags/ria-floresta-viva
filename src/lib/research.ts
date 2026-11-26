export type Municipality = [string, number, number[]];
export interface ForestData { ano0: number; anoN: number; colecao: string; m: Municipality[] }
export type Residence = 'sim' | 'visita' | 'saiu';
export const CONSENT = 'Esta página faz parte de uma pesquisa sobre como cada geração lembra a floresta do Pará. Se você concordar, guardamos seu município, seu ano de nascimento e seus chutes. Não pedimos nome, e-mail ou telefone, e não gravamos seu IP junto da resposta. As respostas só aparecem somadas, em gráficos e tabelas. Participar é voluntário e só vale para maiores de 18 anos.';
export const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
export const referenceYear = (birth: number) => Math.max(1985, birth + 10);
export const isAdult = (birth: number, currentYear: number) => currentYear - birth >= 18;
export const isPrototype = (host: string) => host.includes('preview') || host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
export const canRecord = (consent: boolean, birth: number, year: number, exploring: boolean, duplicate: boolean) => consent && isAdult(birth, year) && !exploring && !duplicate;
export function responseCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(bytes, n => chars[n % chars.length]).join('');
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
export function forestAt(municipality: Municipality, year: number) {
  const value = municipality[2][year - 1985];
  if (value === undefined) throw new Error('Ano fora da série disponível.');
  return value;
}
const ENDPOINT = 'https://pdxjejfqzfgnhjsnhivs.supabase.co/rest/v1';
export async function insertResearch(table: 'respostas' | 'compartilhamentos', payload: object) {
  if (isPrototype(window.location.hostname)) throw new Error('Gravação desativada no protótipo.');
  const res = await fetch(`${ENDPOINT}/${table}`, {
    method: 'POST', credentials: 'omit',
    headers: { apikey: 'sb_publishable_mYiltuNt9dPS6vVWoWCQtQ_jdmqLb0E', 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Não foi possível guardar sua resposta.');
}
