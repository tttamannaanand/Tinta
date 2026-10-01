import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import unsplash from '../api/unsplash-search.js';

function mockRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  res.setHeader = (k, v) => (res.headers[k] = v);
  return res;
}

const realFetch = globalThis.fetch;
let calls;
beforeEach(() => {
  calls = [];
  process.env.UNSPLASH_ACCESS_KEY = 'test-key';
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.UNSPLASH_ACCESS_KEY;
});

test('unsplash: 400 without a query', async () => {
  const res = mockRes();
  await unsplash({ query: {} }, res);
  assert.equal(res.statusCode, 400);
});

test('unsplash: 503 when the key is not configured', async () => {
  delete process.env.UNSPLASH_ACCESS_KEY;
  const res = mockRes();
  await unsplash({ query: { q: 'rain' } }, res);
  assert.equal(res.statusCode, 503);
});

test('unsplash: sends key in a header, never to the browser', async () => {
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true,
      json: async () => ({
        results: [
          {
            alt_description: 'wet street',
            urls: { small: 's.jpg', full: 'f.jpg' },
            links: { html: 'h' },
            user: { name: 'Ana', links: { html: 'u' }, email: 'secret@example.com' },
          },
        ],
      }),
    };
  };
  const res = mockRes();
  await unsplash({ query: { q: 'rain city' } }, res);

  assert.equal(res.statusCode, 200);
  assert.ok(!calls[0].url.includes('test-key'));
  assert.equal(calls[0].opts.headers.Authorization, 'Client-ID test-key');
  assert.ok(!JSON.stringify(res.body).includes('test-key'));
  assert.deepEqual(res.body.results[0], {
    alt_description: 'wet street',
    urls: { small: 's.jpg' },
    links: { html: 'h' },
    user: { name: 'Ana', links: { html: 'u' } },
  });
});

test('unsplash: passes upstream errors through', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 429 });
  const res = mockRes();
  await unsplash({ query: { q: 'rain' } }, res);
  assert.equal(res.statusCode, 429);
});
