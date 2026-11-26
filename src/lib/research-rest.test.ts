import { afterEach, describe, expect, it, vi } from 'vitest';
import { insertResearch } from './research';
afterEach(() => vi.unstubAllGlobals());
describe('gravação por INSERT', () => {
  it('não faz requisição na prévia nem localhost', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    for (const hostname of ['localhost', 'id-preview--123.lovable.app']) {
      vi.stubGlobal('window', { location: { hostname } });
      await expect(insertResearch('respostas', {})).rejects.toThrow('Gravação desativada');
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('envia apenas POST anônimo, sem cookies e sem pedir retorno', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetcher); vi.stubGlobal('window', { location: { hostname: 'floresta.exemplo.br' } });
    const payload = { id_resposta: 'ABCD-2345', real_infancia_pct: 71.05 };
    await insertResearch('respostas', payload);
    expect(fetcher).toHaveBeenCalledWith('https://pdxjejfqzfgnhjsnhivs.supabase.co/rest/v1/respostas', expect.objectContaining({ method: 'POST', credentials: 'omit', body: JSON.stringify(payload), headers: expect.objectContaining({ Prefer: 'return=minimal', 'Content-Type': 'application/json' }) }));
  });
  it('registra o cartão baixado com rede download e o código da resposta', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('window', { location: { hostname: 'floresta.exemplo.br' } });
    await insertResearch('compartilhamentos', { id_resposta: 'ABCD-2345', rede: 'download' });
    expect(fetcher).toHaveBeenCalledWith('https://pdxjejfqzfgnhjsnhivs.supabase.co/rest/v1/compartilhamentos', expect.objectContaining({ method: 'POST', body: JSON.stringify({ id_resposta: 'ABCD-2345', rede: 'download' }) }));
  });
  it('sinaliza falha em vez de dizer que gravou', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false })); vi.stubGlobal('window', { location: { hostname: 'floresta.exemplo.br' } });
    await expect(insertResearch('respostas', {})).rejects.toThrow('Não foi possível guardar');
  });
});
