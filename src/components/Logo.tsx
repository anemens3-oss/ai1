export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#151518" stroke="rgba(255,255,255,0.12)" />
        <path d="M8 10h16v3.2h-6.4V24h-3.2V13.2H8V10z" fill="url(#lg)" />
        <defs>
          <linearGradient id="lg" x1="8" y1="10" x2="24" y2="24">
            <stop stopColor="#7c6cf0" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: size * 0.62,
          letterSpacing: '0.04em',
        }}
      >
        SITECRAFT
      </span>
    </span>
  );
}
