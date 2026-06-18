import BottomNav from '@/components/BottomNav'

export default function BookmarksPracticeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BottomNav />
      {children}
    </>
  )
}
