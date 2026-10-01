import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// lexicon.js is a plain browser script, so load it into a sandbox and pull
// its top-level functions out.
const src = readFileSync(new URL('../site/js/lexicon.js', import.meta.url), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(
  `${src}\n;globalThis.lib = { MOOD_LEXICON, hash01, seededRandom, tokenize, analyzeMood, buildPalette, hslToHex, pickGenres };`,
  ctx,
);
const lib = ctx.lib;

test('tokenize lowercases and strips punctuation', () => {
  assert.deepEqual([...lib.tokenize('Golden, RAIN!  at dusk')], ['golden', 'rain', 'at', 'dusk']);
});

test('analyzeMood picks lexicon words only', () => {
  const { matchedWords, anchors } = lib.analyzeMood('a golden sunset by the sea');
  assert.ok(matchedWords.includes('golden'));
  assert.ok(matchedWords.includes('sunset'));
  assert.ok(!matchedWords.includes('the'));
  assert.equal(anchors.length, matchedWords.length);
});

test('unknown words fall back to a deterministic hashed hue', () => {
  const a = lib.analyzeMood('zxqv plorb');
  const b = lib.analyzeMood('zxqv plorb');
  assert.equal(a.matchedWords.length, 0);
  assert.equal(a.anchors[0].h, b.anchors[0].h);
  assert.ok(a.anchors[0].h >= 0 && a.anchors[0].h < 360);
});

test('hash01 stays in [0, 1) and is stable', () => {
  for (const s of ['', 'a', 'melancholy rain', 'x'.repeat(500)]) {
    const v = lib.hash01(s);
    assert.ok(v >= 0 && v < 1, s);
    assert.equal(v, lib.hash01(s));
  }
});

test('seededRandom is reproducible per seed', () => {
  const a = lib.seededRandom('neon');
  const b = lib.seededRandom('neon');
  const c = lib.seededRandom('rain');
  const seqA = [a(), a(), a()];
  assert.deepEqual(seqA, [b(), b(), b()]);
  assert.notDeepEqual(seqA, [c(), c(), c()]);
  seqA.forEach((v) => assert.ok(v >= 0 && v < 1));
});

test('hslToHex converts known colours', () => {
  assert.equal(lib.hslToHex(0, 100, 50).toLowerCase(), '#ff0000');
  assert.equal(lib.hslToHex(120, 100, 50).toLowerCase(), '#00ff00');
  assert.equal(lib.hslToHex(0, 0, 100).toLowerCase(), '#ffffff');
});

test('buildPalette returns five valid colours', () => {
  const palette = lib.buildPalette(lib.analyzeMood('stormy midnight ocean').anchors);
  assert.equal(palette.length, 5);
  for (const c of palette) {
    assert.match(c.hex, /^#[0-9a-f]{6}$/i);
    assert.ok(c.h >= 0 && c.h < 360);
  }
});

test('hue average wraps around 0/360 instead of landing on cyan', () => {
  const [base] = lib.buildPalette([
    { h: 350, s: 50, l: 50 },
    { h: 10, s: 50, l: 50 },
  ]);
  assert.ok(base.h < 1 || base.h > 359, `expected red, got hue ${base.h}`);
});

test('every lexicon entry has a valid colour and a genre', () => {
  for (const [word, e] of Object.entries(lib.MOOD_LEXICON)) {
    assert.ok(e.h >= 0 && e.h < 360, word);
    assert.ok(e.s >= 0 && e.s <= 100, word);
    assert.ok(e.l >= 0 && e.l <= 100, word);
    assert.ok(e.genre, word);
  }
});

test('mixed warm and cool words never average out to green', () => {
  const [base] = lib.buildPalette(lib.analyzeMood('golden sunset over a quiet ocean').anchors);
  assert.ok(base.h < 60 || base.h > 330, `expected a warm base, got hue ${base.h}`);

  const [split] = lib.buildPalette([
    { h: 30, s: 70, l: 50 },
    { h: 210, s: 60, l: 50 },
  ]);
  assert.equal(split.h, 30);
});

test('near-grey words barely move the hue', () => {
  const [base] = lib.buildPalette([
    { h: 0, s: 80, l: 50 },
    { h: 90, s: 5, l: 50 },
  ]);
  assert.ok(base.h < 10 || base.h > 350, `got hue ${base.h}`);
});
