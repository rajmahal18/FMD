/** Public, versioned object keys; never store credentials or signed URLs on User. */
export function avatarUrl(key: string | null | undefined, base = process.env.AVATAR_PUBLIC_BASE_URL): string | null {
  if (!key || !base || !/^avatars\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:webp|png|jpe?g)$/.test(key) || key.length > 300) return null;
  try {
    const origin = new URL(base);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash) return null;
    return new URL(key, `${origin.href.replace(/\/$/, '')}/`).href;
  } catch { return null; }
}

export function avatarInitials(name: string): string {
  return name.trim().split(/[\s,]+/u).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase() || '?';
}
