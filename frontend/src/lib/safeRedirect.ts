// Guard for post-login "?redirect=" targets. Only a same-site path is allowed.
// `startsWith('/')` alone is NOT enough: "//evil.com" and "/\evil.com" also
// start with "/" and browsers send those off-site (protocol-relative, or the
// backslash gets normalised to "/"). Returns the path, or null if unsafe.
export function safePath(redirect: string | null | undefined): string | null {
  if (!redirect || redirect[0] !== '/') return null;
  // A second char that is "/", "\" or whitespace can turn it into a host.
  const c = redirect[1];
  if (c === '/' || c === '\\' || (c !== undefined && /\s/.test(c))) return null;
  return redirect;
}
