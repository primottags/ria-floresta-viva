import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { canRecord, forestAt, isAdult, isPrototype, normalize, referenceYear, responseCode, type ForestData, type Municipality } from './research';

describe('regras da pesquisa', () => {
  it('compara nascidos antes de 1975 com 1985', () => { expect(referenceYear(1930)).toBe(1985); expect(referenceYear(1974)).toBe(1985); });
  it('usa nascimento mais dez a partir de 1975', () => { expect(referenceYear(1990)).toBe(2000); expect(referenceYear(2015)).toBe(2025); });
  it('permite gravar só a partir de 18 anos', () => { expect(isAdult(2008, 2026)).toBe(true); expect(isAdult(2009, 2026)).toBe(false); expect(canRecord(true, 2009, 2026, false, false)).toBe(false); });
  it('exige consentimento', () => { expect(canRecord(false, 1990, 2026, false, false)).toBe(false); expect(canRecord(true, 1990, 2026, false, false)).toBe(true); });
  it('não grava no modo explorar ou fora da Amazônia', () => { expect(canRecord(true, 1990, 2026, true, false)).toBe(false); });
  it('não grava respostas repetidas no aparelho', () => { expect(canRecord(true, 1990, 2026, false, true)).toBe(false); });
  it('desliga gravação em qualquer preview e localhost', () => { expect(isPrototype('id-preview--123.lovable.app')).toBe(true); expect(isPrototype('preview.meusite.com')).toBe(true); expect(isPrototype('localhost')).toBe(true); expect(isPrototype('floresta.lovable.app')).toBe(false); });
  it('gera XXXX-XXXX sem I, O, 0 ou 1', () => { for (let i=0; i<100; i++) expect(responseCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/); });
  it('busca ignora acentos', () => { expect(normalize('São Félix do Xingu')).toBe('sao felix do xingu'); expect(normalize('Marabá')).toBe('maraba'); });
  it('preserva as casas decimais na coleta', () => { const m: Municipality = ['Teste', 1500000, [71.05]]; expect(forestAt(m, 1985)).toBe(71.05); });
  it('mantém 540 municípios da Amazônia e 41 anos da coleção 11', () => { const data = JSON.parse(readFileSync('public/dados/amazonia.json', 'utf8')) as ForestData; expect(data.ano0).toBe(1985); expect(data.anoN).toBe(2025); expect(data.colecao).toBe('11'); expect(data.m).toHaveLength(540); expect(data.m.every(m => m[2].length === 41)).toBe(true); expect(data.m.find(m => m[0] === 'Marabá')?.[2][15]).toBe(71.05); });
});
