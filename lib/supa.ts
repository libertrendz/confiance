// lib/flags.ts
export type FlagMap = Record<string, boolean>

export async function getFlags(): Promise<FlagMap> {
  const res = await fetch('/api/flags', { cache: 'no-store' })
  if (!res.ok) return {}
  const data = (await res.json()) as { key: string; enabled: boolean }[]
  return Object.fromEntries(data.map((f) => [f.key, f.enabled]))
}
