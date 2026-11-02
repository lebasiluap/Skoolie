/** Diagnostic labels only, never credentials, device IDs or route parameters. */
export function reportContext(input: {platform: string; version?: unknown; build?: unknown; os?: unknown; screen?: string}) {
  const label = (value: unknown) => (typeof value === 'string' || typeof value === 'number')
    ? String(value).replace(/[\r\n\x00-\x1f]/g, ' ').slice(0, 80) : 'unknown'
  return { platform: ['ios','android','web'].includes(input.platform) ? input.platform : 'unknown',
    app_version: label(input.version), app_build: label(input.build), os_version: label(input.os),
    app_screen: ['dashboard','practice','mcq','flashcards','rapid-fire','cases','progress','insights','leaderboard','profile','settings','history','bookmarks','other'].includes(input.screen ?? '') ? input.screen! : 'unknown' }
}
