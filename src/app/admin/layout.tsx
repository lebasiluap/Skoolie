import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminShell from './AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin-login')
  }
  if (user.email !== 'lebasiluap@gmail.com') {
    redirect('/dashboard')
  }

  const { count: openReports } = await supabase
    .from('question_reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')

  return <AdminShell openReports={openReports ?? 0}>{children}</AdminShell>
}
