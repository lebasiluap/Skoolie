'use client'

import { useState, useEffect } from 'react'

export default function GreetingText({ name }: { name: string }) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')
  }, [])

  return (
    <>
      <p style={{ margin: '0 0 3px', fontSize: 15, color: 'var(--text-soft)', fontWeight: 600 }}>{greeting},</p>
      <h1 style={{ margin: 0, fontSize: 'clamp(26px,3vw,32px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em' }}>
        {name} 👋
      </h1>
    </>
  )
}
