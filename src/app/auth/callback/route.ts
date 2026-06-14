import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Password reset flow
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      // Email verification after signup
      if (type === 'signup') {
        return NextResponse.redirect(`${origin}/verified`)
      }

      // OAuth (Google etc.) or explicit next param
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Default: check if user has a profile, send to onboarding or dashboard
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        return NextResponse.redirect(`${origin}${profile ? '/dashboard' : '/onboarding'}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
