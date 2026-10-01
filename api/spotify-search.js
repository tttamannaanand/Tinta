// Vercel serverless function: POST/GET /api/spotify-search?q=<query>&limit=<n>
//
// This exists for one reason: Spotify's client-credentials flow requires a
// client SECRET, and secrets can never live in frontend JS (anyone could
// read it from the page source and use your quota, or worse). This
// function does the token exchange server-side, caches the token in
// memory for the life of the warm serverless instance, and only ever
// exposes track search results to the browser - never the credentials.
//
// Note on scope: Spotify deprecated the /recommendations and
// /audio-features endpoints for new apps in Nov 2024, so this does NOT do
// audio-feature (valence/energy) matching - that data source no longer
// exists for new developer apps. Instead, the frontend maps mood keywords
// to genre/style search terms (see site/js/lexicon.js) and this function
// just proxies a plain keyword search to Spotify's still-fully-supported
// /v1/search endpoint.
//
// Further note (Feb-Mar 2026 Dev Mode changes): Spotify overhauled
// Development Mode - the app owner's account must have Premium, one
// Client ID per developer, and Spotify signaled they're moving away from
// client-credentials for some metadata endpoints. Plain track search has
// held up in community reports so far, but if this starts returning 403s,
// that policy tightening is the first thing to check.
//
// Required environment variables (set in Vercel project settings, or a
// local .env for `vercel dev`):
//   SPOTIFY_CLIENT_ID
//   SPOTIFY_CLIENT_SECRET
// Get both free at https://developer.spotify.com/dashboard (Premium
// required on the owning account as of the 2026 policy change).

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken;
  }

  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not set');
  }

  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) {
    throw new Error(`Spotify token request failed: ${resp.status}`);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  // refresh a minute early to be safe
  cachedTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  const query = (req.query.q || '').toString().trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 6, 10); // Spotify capped new-app search at 10/request in the Feb 2026 changes

  if (!query) {
    res.status(400).json({ error: 'missing required query param: q' });
    return;
  }

  try {
    const token = await getAccessToken();
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`;
    const searchResp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!searchResp.ok) {
      res.status(searchResp.status).json({ error: `Spotify search failed: ${searchResp.status}` });
      return;
    }

    const data = await searchResp.json();
    const tracks = (data.tracks?.items || []).map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
      album: t.album?.name,
      image: t.album?.images?.[t.album.images.length > 2 ? 2 : 0]?.url || null,
      spotify_url: t.external_urls?.spotify,
    }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ query, tracks });
  } catch (err) {
    res.status(500).json({ error: 'search failed', detail: String(err.message || err) });
  }
}
