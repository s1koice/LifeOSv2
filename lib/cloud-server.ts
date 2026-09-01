export function cloudStorageConfigured() {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.SUPABASE_SECRET_KEY,
  );
}

export function supabaseServerConfig() {
  const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  // Extract the Supabase host and rebuild the URL. This also repairs values
  // copied as `ttps://...`, with quotes, or as `SUPABASE_URL=https://...`.
  const supabaseHost = rawUrl.match(/[a-z0-9-]+\.supabase\.co/i)?.[0];
  const cleanedUrl = rawUrl.trim().replace(/^['"]|['"]$/g, "").replace(/^ttps:\/\//i, "https://");
  const url = (supabaseHost ? `https://${supabaseHost}` : cleanedUrl).replace(/\/$/, "");
  const rawKey = process.env.SUPABASE_SECRET_KEY || "";
  // Accept either the value itself or a copied `SUPABASE_SECRET_KEY=value` line.
  const modernKey = rawKey.match(/sb_secret_[A-Za-z0-9._-]+/)?.[0];
  const legacyJwt = rawKey.match(/eyJ[A-Za-z0-9._-]+/)?.[0];
  const key = modernKey || legacyJwt || rawKey.trim().replace(/^['"]|['"]$/g, "");
  return { url, key };
}
