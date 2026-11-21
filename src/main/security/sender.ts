export function isTrustedSender(actual: { id: number; frameIsMain: boolean; url: string }, expected: { id: number; url: string }): boolean {
  if (actual.id !== expected.id || !actual.frameIsMain) return false;
  try {
    const url = new URL(actual.url); const trusted = new URL(expected.url);
    return url.protocol === trusted.protocol && url.host === trusted.host && url.pathname === trusted.pathname && url.search === trusted.search;
  } catch { return false; }
}
