import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await Promise.all([
      // Record page view
      supabase.from('page_views').insert({ user_id: user?.id ?? null, path }),
      // Update last_seen_at
      user ? supabase
        .from('user_profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id) : Promise.resolve(),
    ])

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
