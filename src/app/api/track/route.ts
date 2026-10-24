import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json()
    if (typeof path !== 'string' || !path.startsWith('/') || path.length > 300 || /[\r\n?#]/.test(path)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const replies = await Promise.all([
      // Record page view
      supabase.from('page_views').insert({ user_id: user?.id ?? null, path }),
      // Update last_seen_at
      user ? supabase
        .from('user_profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id)
        .or(`last_seen_at.is.null,last_seen_at.lt.${new Date(Date.now()-60000).toISOString()}`) : Promise.resolve(),
    ])

    if (replies.some(reply => reply?.error)) return NextResponse.json({ ok: false }, { status: 503 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
