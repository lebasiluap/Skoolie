import BottomNav from '@/components/BottomNav'

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BottomNav />
      {children}
    </>
  )
}
