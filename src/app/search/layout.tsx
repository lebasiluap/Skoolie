import BottomNav from '@/components/BottomNav'

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BottomNav />
      {children}
    </>
  )
}
