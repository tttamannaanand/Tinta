// Vercel serverless function: GET /api/unsplash-search?q=<query>
//
// Keeps the Unsplash access key on the server, the same pattern as
// api/spotify-search.js. The key is only a rate-limit key, but keeping it
// out of the page stops anyone else from burning the 50 requests/hour.
//
// Required environment variable: UNSPLASH_ACCESS_KEY
// (free at https://unsplash.com/developers - the Access Key, not the Secret)

export default async function handler(req, res) {
  const query = (req.query.q || '').toString().trim();
  if (!query) {
    res.status(400).json({ error: 'missing required query param: q' });
    return;
  }

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    res.status(503).json({ error: 'UNSPLASH_ACCESS_KEY is not set' });
    return;
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=8&content_filter=high`;
    const resp = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
    if (!resp.ok) {
      res.status(resp.status).json({ error: `Unsplash search failed: ${resp.status}` });
      return;
    }

    const data = await resp.json();
    // Only pass through the fields the moodboard renders.
    const results = (data.results || []).map((p) => ({
      alt_description: p.alt_description,
      urls: { small: p.urls?.small },
      links: { html: p.links?.html },
      user: { name: p.user?.name, links: { html: p.user?.links?.html } },
    }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ query, results });
  } catch (err) {
    res.status(500).json({ error: 'search failed', detail: String(err.message || err) });
  }
}
