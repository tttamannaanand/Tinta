// The core "understanding" in this app is a hand-curated lexicon, not a
// machine-learning sentiment model - that's an honest tradeoff worth
// stating up front (see site/about.html). Each entry maps a word people
// commonly use to describe a mood, weather, time of day, or feeling to:
//   - an HSL color anchor (what that word "looks like")
//   - a genre/style tag (what that word "sounds like", used as a Spotify
//     search term since Spotify's audio-feature/mood-matching endpoints
//     were deprecated for new apps in Nov 2024 - see api/spotify-search.js)
//
// Words not in the lexicon still produce a result: they're hashed to a
// deterministic hue instead, so any input text works, it just won't be as
// finely tuned as a lexicon hit. Same input text always produces the same
// palette/art/genre - there's no randomness, just a seeded hash.

const MOOD_LEXICON = {
  // warm / golden
  golden:      { h: 42,  s: 70, l: 55, genre: 'soul' },
  sun:         { h: 45,  s: 80, l: 60, genre: 'summer pop' },
  sunset:      { h: 18,  s: 75, l: 55, genre: 'dream pop' },
  summer:      { h: 40,  s: 70, l: 60, genre: 'indie pop' },
  warm:        { h: 30,  s: 60, l: 55, genre: 'soul' },
  fire:        { h: 12,  s: 80, l: 50, genre: 'rock' },
  amber:       { h: 35,  s: 65, l: 50, genre: 'jazz' },
  honey:       { h: 38,  s: 70, l: 58, genre: 'soul' },
  coffee:      { h: 25,  s: 40, l: 30, genre: 'jazz' },
  autumn:      { h: 28,  s: 55, l: 45, genre: 'folk' },
  desert:      { h: 33,  s: 45, l: 55, genre: 'ambient' },

  // cool / blue
  rain:        { h: 205, s: 30, l: 45, genre: 'lo-fi' },
  storm:       { h: 220, s: 35, l: 30, genre: 'post-rock' },
  ocean:       { h: 195, s: 55, l: 45, genre: 'ambient' },
  winter:      { h: 200, s: 25, l: 65, genre: 'classical' },
  snow:        { h: 200, s: 15, l: 80, genre: 'ambient' },
  ice:         { h: 190, s: 40, l: 70, genre: 'electronic' },
  cold:        { h: 210, s: 30, l: 55, genre: 'ambient' },
  blue:        { h: 215, s: 55, l: 50, genre: 'blues' },
  night:       { h: 235, s: 40, l: 20, genre: 'synthwave' },
  midnight:    { h: 245, s: 45, l: 15, genre: 'synthwave' },
  moon:        { h: 230, s: 25, l: 55, genre: 'dream pop' },
  fog:         { h: 210, s: 10, l: 65, genre: 'ambient' },

  // melancholy / muted
  melancholy:  { h: 220, s: 20, l: 40, genre: 'sad indie' },
  sad:         { h: 225, s: 25, l: 35, genre: 'sad indie' },
  lonely:      { h: 230, s: 20, l: 35, genre: 'sad indie' },
  nostalgia:   { h: 25,  s: 30, l: 55, genre: 'dream pop' },
  nostalgic:   { h: 25,  s: 30, l: 55, genre: 'dream pop' },
  grey:        { h: 220, s: 5,  l: 50, genre: 'post-rock' },
  gray:        { h: 220, s: 5,  l: 50, genre: 'post-rock' },
  quiet:       { h: 210, s: 10, l: 60, genre: 'ambient' },
  slow:        { h: 215, s: 20, l: 45, genre: 'ambient' },
  empty:       { h: 220, s: 8,  l: 45, genre: 'post-rock' },
  tired:       { h: 235, s: 15, l: 35, genre: 'lo-fi' },

  // energetic / bright
  energetic:   { h: 5,   s: 80, l: 55, genre: 'dance pop' },
  excited:     { h: 340, s: 75, l: 60, genre: 'pop' },
  happy:       { h: 50,  s: 80, l: 60, genre: 'pop' },
  joy:         { h: 48,  s: 85, l: 62, genre: 'funk' },
  party:       { h: 320, s: 75, l: 55, genre: 'dance' },
  dance:       { h: 300, s: 65, l: 55, genre: 'dance' },
  electric:    { h: 285, s: 80, l: 55, genre: 'electronic' },
  neon:        { h: 300, s: 90, l: 55, genre: 'synthwave' },
  fast:        { h: 10,  s: 75, l: 55, genre: 'punk' },
  wild:        { h: 350, s: 70, l: 50, genre: 'rock' },

  // calm / soft
  calm:        { h: 160, s: 30, l: 55, genre: 'ambient' },
  peaceful:    { h: 150, s: 25, l: 60, genre: 'classical' },
  soft:        { h: 340, s: 30, l: 75, genre: 'dream pop' },
  gentle:      { h: 160, s: 25, l: 65, genre: 'folk' },
  dreamy:      { h: 270, s: 35, l: 70, genre: 'dream pop' },
  hazy:        { h: 30,  s: 25, l: 70, genre: 'dream pop' },
  soothing:    { h: 170, s: 25, l: 60, genre: 'ambient' },
  meditation:  { h: 165, s: 20, l: 55, genre: 'ambient' },

  // nature / green
  forest:      { h: 130, s: 40, l: 30, genre: 'folk' },
  green:       { h: 120, s: 45, l: 40, genre: 'folk' },
  garden:      { h: 100, s: 40, l: 45, genre: 'acoustic' },
  earth:       { h: 30,  s: 35, l: 35, genre: 'folk' },
  moss:        { h: 100, s: 30, l: 30, genre: 'ambient' },
  spring:      { h: 90,  s: 50, l: 55, genre: 'indie folk' },

  // dark / intense
  dark:        { h: 260, s: 30, l: 15, genre: 'dark ambient' },
  shadow:      { h: 250, s: 25, l: 20, genre: 'post-rock' },
  intense:     { h: 0,   s: 70, l: 35, genre: 'metal' },
  anger:       { h: 0,   s: 75, l: 40, genre: 'rock' },
  angry:       { h: 0,   s: 75, l: 40, genre: 'rock' },
  chaos:       { h: 15,  s: 65, l: 35, genre: 'punk' },

  // romantic
  love:        { h: 350, s: 60, l: 55, genre: 'rnb' },
  romantic:    { h: 340, s: 55, l: 60, genre: 'rnb' },
  heartbreak:  { h: 230, s: 40, l: 35, genre: 'sad indie' },
  longing:     { h: 250, s: 30, l: 40, genre: 'rnb' },

  // misc common palette-request words
  purple:      { h: 270, s: 50, l: 50, genre: 'dream pop' },
  pink:        { h: 330, s: 60, l: 65, genre: 'pop' },
  red:         { h: 355, s: 65, l: 45, genre: 'rock' },
  orange:      { h: 25,  s: 75, l: 55, genre: 'funk' },
  yellow:      { h: 50,  s: 80, l: 60, genre: 'pop' },
  black:       { h: 0,   s: 0,  l: 12, genre: 'post-rock' },
  white:       { h: 0,   s: 0,  l: 92, genre: 'classical' },
};

// deterministic djb2-ish string hash -> [0, 1)
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// seeded PRNG (mulberry32) so the generative art is reproducible per input
function seededRandom(seedStr) {
  let a = 0;
  for (let i = 0; i < seedStr.length; i++) a = (a * 31 + seedStr.charCodeAt(i)) >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function analyzeMood(text) {
  const tokens = tokenize(text);
  const matched = tokens
    .map((t) => MOOD_LEXICON[t])
    .filter(Boolean);

  if (matched.length === 0) {
    // fallback: hash the whole phrase into one anchor color, moderate
    // saturation/lightness so it stays usable as a base
    const hue = Math.floor(hash01(text || 'mood') * 360);
    return {
      anchors: [{ h: hue, s: 45, l: 50, genre: 'indie' }],
      matchedWords: [],
    };
  }

  return { anchors: matched, matchedWords: tokens.filter((t) => MOOD_LEXICON[t]) };
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// blend anchors into a cohesive 5-color palette: a base, a couple of
// tonal variants, one accent, and one near-neutral - all derived from the
// same hue family so it reads as "one palette" rather than five random
// colors
function buildPalette(anchors) {
  // average hue via circular mean (hues wrap at 360)
  let sinSum = 0, cosSum = 0;
  anchors.forEach((a) => {
    const rad = (a.h * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  });
  const baseHue = ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
  const avgSat = anchors.reduce((s, a) => s + a.s, 0) / anchors.length;
  const avgLight = anchors.reduce((s, a) => s + a.l, 0) / anchors.length;

  const colors = [
    { h: baseHue, s: clamp(avgSat, 10, 85), l: clamp(avgLight, 15, 80) },
    { h: (baseHue + 12) % 360, s: clamp(avgSat - 15, 10, 85), l: clamp(avgLight - 20, 8, 75) },
    { h: (baseHue - 18 + 360) % 360, s: clamp(avgSat + 5, 10, 85), l: clamp(avgLight + 15, 15, 85) },
    { h: (baseHue + 150) % 360, s: clamp(avgSat - 25, 5, 70), l: clamp(avgLight - 5, 15, 80) }, // accent
    { h: baseHue, s: clamp(avgSat - 55, 0, 25), l: clamp(avgLight + 30, 60, 92) }, // near-neutral
  ];

  return colors.map((c) => ({ ...c, hex: hslToHex(c.h, c.s, c.l) }));
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// pick up to 2 distinct genre tags from matched lexicon entries,
// preserving the order they were matched in
function pickGenres(anchors) {
  const seen = [];
  for (const a of anchors) {
    if (a.genre && !seen.includes(a.genre)) seen.push(a.genre);
    if (seen.length === 2) break;
  }
  return seen.length ? seen : ['indie'];
}
