import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SearchClient, { CatalogEntry } from './SearchClient'

export const metadata = { title: 'Search — Skoolie' }

export default async function SearchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let catalog: CatalogEntry[] = []

  // Try the RPC first (fast, aggregated)
  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_search_catalog')
  if (!rpcErr && rpcData) {
    catalog = rpcData as CatalogEntry[]
  } else {
    // Fallback: fetch raw rows and group in JS
    const { data: rows } = await supabase
      .from('questions')
      .select('topic, category, subtopic, question_type')
      .in('question_type', ['mcq', 'flashcard'])
      .range(0, 99999)

    if (rows) {
      const map = new Map<string, CatalogEntry>()
      for (const row of rows) {
        if (!row.topic) continue
        const key = `${row.topic}|${row.category ?? ''}|${row.subtopic ?? ''}`
        if (!map.has(key)) {
          map.set(key, {
            topic: row.topic,
            category: row.category ?? null,
            subtopic: row.subtopic ?? null,
            mcq_count: 0,
            flashcard_count: 0,
            case_count: 0,
          })
        }
        const e = map.get(key)!
        if (row.question_type === 'mcq') e.mcq_count++
        else if (row.question_type === 'flashcard') e.flashcard_count++
      }

      // Also pull case counts
      const { data: caseRows } = await supabase
        .from('case_studies')
        .select('topic, subtopic')
        .range(0, 9999)

      if (caseRows) {
        const caseMap = new Map<string, number>()
        for (const c of caseRows) {
          const k = `${c.topic}|${c.subtopic ?? ''}`
          caseMap.set(k, (caseMap.get(k) ?? 0) + 1)
        }
        for (const entry of map.values()) {
          entry.case_count = caseMap.get(`${entry.topic}|${entry.subtopic ?? ''}`) ?? 0
        }
      }

      catalog = Array.from(map.values())
    }
  }

  return <SearchClient catalog={catalog} />
}
