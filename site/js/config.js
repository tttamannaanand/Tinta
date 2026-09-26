// Unsplash's free "Demo" tier is designed to be called directly from the
// browser like this - the access key is rate-limited (50 requests/hour)
// rather than secret, which is why it's fine to keep client-side, unlike
// the Spotify credentials (see api/spotify-search.js for why those are
// different: Spotify's key is a true secret tied to write-capable scopes,
// Unsplash's demo key is a rate-limit key tied to read-only public search).
//
// This is your real Unsplash Access Key - the Secret Key you also have
// isn't used here, since it's only needed for Unsplash's OAuth flows
// (user login), not plain public search.
//
// If you later want it fully hidden too, proxy it through a second
// serverless function the same way api/spotify-search.js does - the
// pattern is identical, just swap the upstream URL.

const CONFIG = {
  UNSPLASH_ACCESS_KEY: 'MPps8xziU17U3HUR5ieo49aIp6-GYVsfnlkDZqnrVpY',
};
