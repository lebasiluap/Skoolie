// Streaming skeleton for every /admin route. Next shows this INSTANTLY on
// navigation while the server component fetches — this is what makes moving
// between admin pages feel immediate instead of frozen.
export default function AdminLoading() {
  return (
    <div style={{ padding: 'clamp(20px,3vw,36px) clamp(16px,3vw,32px)', maxWidth: 1300, margin: '0 auto' }}>
      {/* Title */}
      <div className="sk-shimmer" style={{ width: 180, height: 28, borderRadius: 10, marginBottom: 8 }} />
      <div className="sk-shimmer" style={{ width: 260, height: 14, borderRadius: 7, marginBottom: 28 }} />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 12, marginBottom: 28 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '18px 20px' }}>
            <div className="sk-shimmer" style={{ width: '60%', height: 10, borderRadius: 5, marginBottom: 10 }} />
            <div className="sk-shimmer" style={{ width: '40%', height: 24, borderRadius: 8 }} />
          </div>
        ))}
      </div>

      {/* Content blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 18, height: 180 }}>
            <div className="sk-shimmer" style={{ width: '45%', height: 12, borderRadius: 6, marginBottom: 16 }} />
            <div className="sk-shimmer" style={{ width: '100%', height: 110, borderRadius: 12 }} />
          </div>
        ))}
      </div>

      <style>{`
        .sk-shimmer {
          background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
          background-size: 200% 100%;
          animation: sk-shimmer 1.2s ease-in-out infinite;
        }
        @keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @media (prefers-reduced-motion: reduce) { .sk-shimmer { animation: none; } }
      `}</style>
    </div>
  )
}
