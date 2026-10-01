const els = {
  input: document.getElementById('mood-input'),
  generateBtn: document.getElementById('generate-btn'),
  swatches: document.getElementById('swatches'),
  art: document.getElementById('art'),
  tracklist: document.getElementById('tracklist'),
  moodboard: document.getElementById('moodboard'),
  matchedWords: document.getElementById('matched-words'),
  status: document.getElementById('status'),
};

function setStatus(msg) {
  els.status.textContent = msg || '';
}

function renderSwatches(colors) {
  els.swatches.innerHTML = colors
    .map(
      (c) => `
    <div class="swatch" style="background:${c.hex}">
      <span class="swatch-hex">${c.hex}</span>
    </div>
  `,
    )
    .join('');
}

function renderMatchedWords(words) {
  if (!words.length) {
    els.matchedWords.textContent =
      'No lexicon matches — using a hashed fallback color for this phrase.';
    return;
  }
  els.matchedWords.textContent = `Matched mood words: ${[...new Set(words)].join(', ')}`;
}

// generative art: a handful of soft overlapping circles, positioned and
// sized by a PRNG seeded from the input text - same text always produces
// the same art
function renderArt(colors, seedText) {
  const rand = seededRandom(seedText || 'seed');
  const w = 600,
    h = 220;
  const circles = colors
    .map((c) => {
      const r = 35 + rand() * 55;
      const cx = 40 + rand() * (w - 80);
      const cy = 40 + rand() * (h - 80);
      const opacity = 0.45 + rand() * 0.25;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${c.hex}" fill-opacity="${opacity.toFixed(2)}"/>`;
    })
    .join('');

  els.art.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Abstract generative art in the mood's color palette">
      ${circles}
    </svg>
  `;
}

async function fetchTracks(genres) {
  const query = genres.join(' ');
  try {
    const res = await fetch(`/api/spotify-search?q=${encodeURIComponent(query)}&limit=6`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    return data.tracks || [];
  } catch (err) {
    console.error('Spotify search failed', err);
    return null; // signals an error state, distinct from "zero results"
  }
}

function renderTracklist(tracks, genres) {
  if (tracks === null) {
    els.tracklist.innerHTML = `<p class="empty-note">Couldn't reach the Spotify search function. Make sure SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are set (see README), and that you're running this through <code>vercel dev</code> or a deployed instance — the API route doesn't exist on a plain static file server.</p>`;
    return;
  }
  if (tracks.length === 0) {
    els.tracklist.innerHTML = `<p class="empty-note">No tracks found for "${genres.join(', ')}". Try a different phrase.</p>`;
    return;
  }

  els.tracklist.innerHTML = tracks
    .map(
      (t) => `
    <div class="track-embed">
      <iframe
        src="https://open.spotify.com/embed/track/${t.id}?utm_source=generator&theme=0"
        width="100%" height="80" frameborder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="${t.name} by ${t.artist}"
      ></iframe>
    </div>
  `,
    )
    .join('');
}

async function fetchImages(keywords) {
  const query = keywords.slice(0, 3).join(' ');
  try {
    const res = await fetch(`/api/unsplash-search?q=${encodeURIComponent(query)}`);
    if (res.status === 503) return 'no-key';
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('Unsplash search failed', err);
    return null;
  }
}

function renderMoodboard(images) {
  if (images === 'no-key') {
    els.moodboard.innerHTML = `<p class="empty-note">Set <code>UNSPLASH_ACCESS_KEY</code> in your environment to show a photo moodboard here (free, instant signup — see README).</p>`;
    return;
  }
  if (images === null) {
    els.moodboard.innerHTML = `<p class="empty-note">Couldn't reach Unsplash. Check your access key and rate limit (demo tier: 50 requests/hour).</p>`;
    return;
  }
  if (images.length === 0) {
    els.moodboard.innerHTML = `<p class="empty-note">No images found for this mood. Try a more visual/concrete word.</p>`;
    return;
  }

  // Unsplash API guidelines require attributing the photographer AND
  // Unsplash itself, with utm_source params on both links - this isn't
  // optional decoration, it's a condition of using the free API.
  els.moodboard.innerHTML = images
    .map(
      (img) => `
    <a class="mb-tile" href="${img.links.html}?utm_source=mood_palette&utm_medium=referral" target="_blank" rel="noopener">
      <img src="${img.urls.small}" alt="${img.alt_description || 'mood photo'}" loading="lazy">
      <span class="mb-credit">
        Photo: <a href="${img.user.links.html}?utm_source=mood_palette&utm_medium=referral" target="_blank" rel="noopener">${img.user.name}</a>
        on <a href="https://unsplash.com/?utm_source=mood_palette&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>
      </span>
    </a>
  `,
    )
    .join('');
}

async function generate() {
  const text = els.input.value.trim();
  if (!text) {
    setStatus('Type a mood, a phrase, or a few words first.');
    return;
  }

  els.generateBtn.disabled = true;
  setStatus('Reading the mood…');

  const { anchors, matchedWords } = analyzeMood(text);
  const palette = buildPalette(anchors);
  const genres = pickGenres(anchors);

  renderSwatches(palette);
  renderArt(palette, text);
  renderMatchedWords(matchedWords);

  setStatus('Finding tracks…');
  els.tracklist.innerHTML = `<p class="empty-note">Loading…</p>`;
  els.moodboard.innerHTML = `<p class="empty-note">Loading…</p>`;

  const [tracks, images] = await Promise.all([
    fetchTracks(genres),
    fetchImages(matchedWords.length ? matchedWords : tokenize(text)),
  ]);

  renderTracklist(tracks, genres);
  renderMoodboard(images);

  setStatus('');
  els.generateBtn.disabled = false;
}

els.generateBtn.addEventListener('click', generate);
els.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate();
});

// generate once on load with the placeholder text so the page isn't empty
window.addEventListener('DOMContentLoaded', generate);
