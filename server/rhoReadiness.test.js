import { describe, expect, it, vi } from 'vitest';
import { loadRhoSnapshot, rhoResponse } from './rhoReadiness.js';

const account = { id: 'a', account_name: 'Checking', account_type: 'checking', balance: { amount: 10000, currency: 'USD' } };
const response = body => ({ ok: true, json: async () => body });

describe('Rho read adapter', () => {
  it('follows cursors, deduplicates records, and returns no bearer token', async () => {
    const fetcher = vi.fn(async (url, options) => {
      expect(options.headers.Authorization).toBe('Bearer sandbox');
      if (url.pathname.endsWith('/accounts')) return response({ accounts: [account], page: { next_page_token: null } });
      const tx = { id: 't', account_id: 'a', amount: { amount: -100, currency: 'USD' }, status: 'settled' };
      return response({ transactions: [tx], page: { next_page_token: url.searchParams.has('page_token') ? null : 'opaque-cursor' } });
    });
    const result = await loadRhoSnapshot({ env: {}, fetcher });
    expect(result.mode).toBe('sandbox');
    expect(result.transactions).toHaveLength(1);
    expect(fetcher.mock.calls.some(([url]) => url.searchParams.get('page_token') === 'opaque-cursor')).toBe(true);
    expect(JSON.stringify(result)).not.toContain('Bearer');
  });
  it('does not allow hosted live business access or arbitrary upstreams', async () => {
    const fetcher = vi.fn();
    await expect(loadRhoSnapshot({ env: { RHO_MODE: 'production', RHO_API_TOKEN: 'private' }, fetcher })).rejects.toThrow('local server');
    await expect(loadRhoSnapshot({ env: { RHO_MODE: 'https://evil.example' }, fetcher })).rejects.toThrow('Unsupported');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects repeated cursors and malformed money instead of giving a partial snapshot', async () => {
    await expect(loadRhoSnapshot({ env: {}, fetcher: async url => response(url.pathname.endsWith('/accounts') ? { accounts: [account], page: { next_page_token: 'same' } } : { transactions: [] }) })).rejects.toThrow('pagination');
    await expect(loadRhoSnapshot({ env: {}, fetcher: async url => response(url.pathname.endsWith('/accounts') ? { accounts: [{ ...account, balance: { amount: 1.5, currency: 'USD' } }] } : { transactions: [] }) })).rejects.toThrow('money');
  });
  it('redacts upstream errors and refuses writes', async () => {
    const res = { setHeader: vi.fn(), end: vi.fn() };
    await rhoResponse({ method: 'GET' }, res, { env: {}, fetcher: async () => { throw new Error('secret-token'); } });
    expect(res.statusCode).toBe(503);
    expect(res.end.mock.calls[0][0]).not.toContain('secret-token');
    await rhoResponse({ method: 'POST' }, res);
    expect(res.statusCode).toBe(405);
  });
});
