import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 32, showText = true, className = "" }: LogoProps) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
      <img
        src="/logo.png"
        alt="DailyDiary Logo"
        width={size}
        height={size}
        style={{ objectFit: 'contain', flexShrink: 0, borderRadius: '6px' }}
      />
      {showText && (
        <span style={{
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: `${size * 0.65}px`,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
          lineHeight: 1
        }}>
          DailyDiary<span style={{ color: '#B89047' }}>.in</span>
        </span>
      )}
    </div>
  );
}
