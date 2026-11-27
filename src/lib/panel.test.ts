import { describe, expect, it, vi } from 'vitest';
import { fetchPanel, panelHeadline, type PanelData } from './research';

const base: PanelData = { minimo: 5, total: 12, atualizado: '2026-11-26', geracoes: [], estados: [] };

describe('painel público', () => {
  it('não inventa achado sem grupos com 5 ou mais respostas', () => {
    expect(panelHeadline(base)).toBeNull();
  });
  it('escolhe a geração mais distante do satélite', () => {
    const data = { ...base, geracoes: [{ rotulo: '1960–1969', n: 6, chute: 70, real: 80, diferenca: -10.2 }, { rotulo: '1990–1999', n: 6, chute: 60, real: 58, diferenca: 2 }] };
    expect(panelHeadline(data)).toBe('Quem nasceu em 1960–1969 lembra, em média, 10 pontos a menos de paisagem nativa do que o satélite registrou.');
  });
  it('chama a função pública do banco sem credenciais', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => base });
    await expect(fetchPanel(fetcher as unknown as typeof fetch)).resolves.toEqual(base);
    expect(fetcher).toHaveBeenCalledWith('https://pdxjejfqzfgnhjsnhivs.supabase.co/rest/v1/rpc/painel_publico', expect.objectContaining({ method: 'POST', credentials: 'omit' }));
  });
});
