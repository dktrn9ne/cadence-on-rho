const SANDBOX = 'https://rhoapi-sandbox.rho.co/api/v1';
const PRODUCTION = 'https://rhoapi.rho.co/api/v1';

export async function loadRhoSnapshot({ env = process.env, fetcher = fetch, local = false } = {}) {
  const mode = env.RHO_MODE || 'sandbox';
  if (!['sandbox', 'production'].includes(mode)) throw new Error('Unsupported Rho mode.');
  // Live business data is available only on the loopback development server.
  // A hosted live integration needs application authentication before enabling it.
  if (mode === 'production' && (!local || !env.RHO_API_TOKEN)) throw new Error('Live Rho access requires the local server and a server-side token.');
  const base = mode === 'sandbox' ? SANDBOX : PRODUCTION;
  const headers = { Authorization: `Bearer ${mode === 'sandbox' ? 'sandbox' : env.RHO_API_TOKEN}`, Accept: 'application/json' };
  const read = async (resource, key) => {
    const rows = new Map();
    let cursor;
    const cursors = new Set();
    for (let page = 0; page < 25; page++) {
      const url = new URL(`${base}/${resource}`);
      url.searchParams.set('page_size', '100');
      if (cursor) url.searchParams.set('page_token', cursor);
      const response = await fetcher(url, { headers, signal: AbortSignal.timeout(12000), redirect: 'error' });
      if (!response.ok) throw new Error(`Rho ${resource} request failed (${response.status}).`);
      const body = await response.json();
      if (!Array.isArray(body[key])) throw new Error('Rho returned an unexpected response.');
      for (const row of body[key]) {
        if (!row.id) throw new Error('Rho returned a record without an identifier.');
        rows.set(row.id, row);
      }
      cursor = body.page?.next_page_token;
      if (!cursor) return [...rows.values()];
      if (cursors.has(cursor)) throw new Error('Rho pagination did not advance.');
      cursors.add(cursor);
    }
    throw new Error('Rho returned too many pages; snapshot is incomplete.');
  };
  const [accounts, transactions] = await Promise.all([read('accounts', 'accounts'), read('transactions', 'transactions')]);
  const money = value => {
    if (!value || !Number.isSafeInteger(value.amount) || typeof value.currency !== 'string') throw new Error('Rho returned an invalid money amount.');
    return { amount: value.amount, currency: value.currency };
  };
  return {
    mode, fetchedAt: new Date().toISOString(),
    accounts: accounts.map(a => ({ id: a.id, name: a.account_name, type: a.account_type, last4: a.account_number_last_4, balance: money(a.balance) })),
    transactions: transactions.map(t => ({ id: t.id, accountId: t.account_id, counterparty: t.counterparty_name, status: t.status, amount: money(t.amount), date: t.posted_at || t.initiated_at })),
  };
}

export async function rhoResponse(req, res, options = {}) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ error: 'Read-only endpoint.' })); return; }
  try {
    const snapshot = await loadRhoSnapshot(options);
    res.statusCode = 200;
    res.end(JSON.stringify(snapshot));
  } catch {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'Rho snapshot unavailable. Check the server configuration and connection, then refresh.' }));
  }
}

export function rhoDevPlugin(env) {
  return { name: 'cadence-rho-readiness', configureServer(server) {
    server.middlewares.use('/api/rho-readiness', (req, res) => {
      const remote = req.socket.remoteAddress;
      const allowed = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
      const host = req.headers.host;
      let originOK = !req.headers.origin;
      try { if (req.headers.origin) originOK = new URL(req.headers.origin).host === host; } catch { /* reject */ }
      if (!allowed.has(remote) || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host || '') || !originOK || req.headers['sec-fetch-site'] === 'cross-site') {
        res.statusCode = 403; res.end(); return;
      }
      return rhoResponse(req, res, { env, local: true });
    });
  } };
}
