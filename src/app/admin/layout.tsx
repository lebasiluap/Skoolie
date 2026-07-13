import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminShell from './AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Run the auth check and the badge count concurrently — this layout renders
  // on every admin navigation, so sequential round trips (Vercel ↔ Supabase)
  // were the main source of sluggish page changes. RLS keeps the count safe
  // even before the user check resolves.
  const [{ data: { user } }, { count: openReports }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('question_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
  ])

  if (!user) {
    redirect('/admin-login')
  }
  if (user.email !== 'lebasiluap@gmail.com') {
    redirect('/dashboard')
  }

  return <AdminShell openReports={openReports ?? 0}>{children}</AdminShell>
}
