export type Municipality = [string, number, number[]];
export interface ForestData { ano0: number; anoN: number; colecao: string; m: Municipality[] }
export type Residence = 'sim' | 'visita' | 'saiu';
export const CONSENT = 'Esta página faz parte de uma pesquisa sobre como cada geração lembra a floresta da Amazônia. Se você concordar, guardamos seu município, seu ano de nascimento e seus chutes. Não pedimos nome, e-mail ou telefone, e não gravamos seu IP junto da resposta. As respostas só aparecem somadas, em gráficos e tabelas. Participar é voluntário e só vale para maiores de 18 anos.';
const UF: Record<string, string> = { '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO', '21': 'MA', '51': 'MT' };
/** Sigla do estado a partir dos dois primeiros dígitos do código IBGE. */
export const ufOf = (cod: number) => UF[String(cod).slice(0, 2)] ?? '';
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

export interface PanelGroup { n: number; chute: number; real: number; diferenca: number }
export interface PanelData { minimo: number; total: number; atualizado: string; geracoes: (PanelGroup & { rotulo: string })[]; estados: (PanelGroup & { uf: string })[] }
/** Médias públicas da pesquisa (só grupos com pelo menos `minimo` respostas, calculadas no banco). */
export async function fetchPanel(fetcher: typeof fetch = fetch): Promise<PanelData> {
  const res = await fetcher(`${ENDPOINT}/rpc/painel_publico`, {
    method: 'POST', credentials: 'omit',
    headers: { apikey: 'sb_publishable_mYiltuNt9dPS6vVWoWCQtQ_jdmqLb0E', 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error('Painel indisponível.');
  return res.json();
}
/** Frase do achado principal: a geração que mais se afasta do satélite. */
export function panelHeadline(data: PanelData) {
  const top = [...data.geracoes].sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca))[0];
  if (!top) return null;
  const pts = Math.abs(Math.round(top.diferenca));
  if (pts === 0) return `Quem nasceu em ${top.rotulo} lembra a floresta quase exatamente como o satélite registrou.`;
  return `Quem nasceu em ${top.rotulo} lembra, em média, ${pts} ${pts === 1 ? 'ponto' : 'pontos'} ${top.diferenca > 0 ? 'a mais' : 'a menos'} de floresta do que o satélite registrou.`;
}
