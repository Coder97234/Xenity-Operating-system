const lineIcons = {
  chevronLeft: <path d="M12.5 4 6 10l6.5 6" />,
  chevronRight: <path d="M7.5 4 14 10l-6.5 6" />,
  chevronUp: <path d="M4 12.5 10 6l6 6.5" />,
  chevronDown: <path d="M4 7.5 10 14l6-6.5" />,
  plus: <path d="M10 4v12M4 10h12" />,
  x: <path d="M5 5l10 10M15 5 5 15" />,
  minus: <path d="M4 10h12" />,
  search: (
    <>
      <circle cx="9" cy="9" r="5" />
      <path d="M13 13l4 4" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1.4" />
      <rect x="11" y="3.5" width="5.5" height="5.5" rx="1.4" />
      <rect x="3.5" y="11" width="5.5" height="5.5" rx="1.4" />
      <rect x="11" y="11" width="5.5" height="5.5" rx="1.4" />
    </>
  ),
  folder: <path d="M3 6.4A1.4 1.4 0 0 1 4.4 5h3.1l1.5 2h6.6A1.4 1.4 0 0 1 17 8.4v6.2A1.4 1.4 0 0 1 15.6 16H4.4A1.4 1.4 0 0 1 3 14.6z" />,
  file: (
    <>
      <path d="M5.5 3h5.2L15 7.3V16a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M10.5 3v4.5H15" />
    </>
  ),
  trash: (
    <>
      <path d="M4 6h12" />
      <path d="M8 6V4h4v2" />
      <path d="M5.5 6l.7 9.1a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9L14.5 6" />
    </>
  ),
  gear: (
    <>
      <circle cx="10" cy="10" r="2.4" />
      <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.1 5.1 6.5 6.5M13.5 13.5l1.4 1.4M14.9 5.1 13.5 6.5M6.5 13.5 5.1 14.9" />
    </>
  ),
  refresh: (
    <>
      <path d="M16.5 10a6.5 6.5 0 1 1-2-4.7" />
      <path d="M16.6 3.2v4.2h-4.2" />
    </>
  ),
  check: <path d="M4 10.6 8 14.5 16 5.5" />,
  power: (
    <>
      <path d="M10 3v6.5" />
      <path d="M6.2 5.6a6 6 0 1 0 7.6 0" />
    </>
  ),
  wifi: (
    <>
      <path d="M3.5 7.5a10 10 0 0 1 13 0" />
      <path d="M6.2 10.6a6.3 6.3 0 0 1 7.6 0" />
      <path d="M8.6 13.6a2.6 2.6 0 0 1 2.8 0" />
      <circle cx="10" cy="16" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  battery: (
    <>
      <rect x="2.5" y="6.5" width="13" height="7" rx="2" />
      <path d="M17.5 9v2" />
      <rect x="4.5" y="8.5" width="8" height="3" rx="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  sliders: (
    <>
      <path d="M3 6h4M11 6h6M3 10h8M15 10h2M3 14h3M9 14h8" />
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="13" cy="10" r="1.6" />
      <circle cx="7" cy="14" r="1.6" />
    </>
  ),
  globe: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10h14" />
      <ellipse cx="10" cy="10" rx="3.2" ry="7" />
    </>
  ),
  terminal: (
    <>
      <path d="M4 6l3.6 4L4 14" />
      <path d="M10.5 14h5.5" />
    </>
  ),
  download: (
    <>
      <path d="M10 3v9" />
      <path d="M6.4 9.2 10 12.8l3.6-3.6" />
      <path d="M4 16h12" />
    </>
  ),
  clock: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4.3l2.8 1.8" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="9" width="11" height="8" rx="2" />
      <path d="M7 9V6.8a3 3 0 0 1 6 0V9" />
    </>
  ),
  drive: (
    <>
      <rect x="2.5" y="5" width="15" height="10" rx="2.5" />
      <path d="M2.5 10.5h15" />
      <circle cx="6" cy="12.6" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  star: <path d="M10 3l2.2 4.5 5 .7-3.6 3.5.9 4.9-4.5-2.4-4.5 2.4.9-4.9L2.8 8.2l5-.7z" />,
  sidebar: (
    <>
      <rect x="3" y="4" width="14" height="12" rx="2.5" />
      <path d="M8 4v12" />
    </>
  ),
  list: <path d="M6 5h11M6 10h11M6 15h11M3 5h.01M3 10h.01M3 15h.01" />,
  edit: (
    <>
      <path d="M12.5 4.2 15.8 7.5 7.6 15.7l-3.9.7.7-3.9z" />
      <path d="M11 5.7l3.3 3.3" />
    </>
  ),
  user: (
    <>
      <circle cx="10" cy="6.8" r="3.2" />
      <path d="M4 16.6a6 6 0 0 1 12 0" />
    </>
  ),
  monitor: (
    <>
      <rect x="2.5" y="4" width="15" height="9.5" rx="1.8" />
      <path d="M7.5 17h5M10 13.5V17" />
    </>
  ),
  volume: (
    <>
      <path d="M4 8h2.6L10.5 5v10L6.6 12H4z" />
      <path d="M13 8a3 3 0 0 1 0 4M15 6a6 6 0 0 1 0 8" />
    </>
  ),
  moon: <path d="M16 12.5A6.5 6.5 0 0 1 7.5 4a7 7 0 1 0 8.5 8.5z" />,
  key: (
    <>
      <circle cx="7" cy="13" r="3" />
      <path d="M9.2 10.8 16.4 3.6M14 6l2 2M15.6 4.4l2 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 10S5.5 4.8 10 4.8 17.5 10 17.5 10 14.5 15.2 10 15.2 2.5 10 2.5 10z" />
      <circle cx="10" cy="10" r="2.3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l12 12" />
      <path d="M7.6 6.1A8.6 8.6 0 0 1 10 5.6c4.5 0 7.5 5.2 7.5 5.2a14 14 0 0 1-2.3 2.9M12.6 14.9a7 7 0 0 1-2.6.5c-4.5 0-7.5-5.2-7.5-5.2a14 14 0 0 1 3.1-3.5" />
    </>
  ),
  copy: (
    <>
      <rect x="7" y="7" width="9" height="10" rx="2" />
      <path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4h6" />
    </>
  ),
  shield: (
    <>
      <path d="M10 3l6 2.2v5.1c0 3.2-2.4 5.6-6 6.7-3.6-1.1-6-3.5-6-6.7V5.2z" />
      <path d="M7.6 9.8 9.4 11.6l3.2-3.4" />
    </>
  ),
  box: (
    <>
      <path d="M10 3.2 16.5 6.6v6.8L10 16.8 3.5 13.4V6.6z" />
      <path d="M3.7 6.7 10 10l6.3-3.3M10 10v6.7" />
    </>
  ),
  logout: (
    <>
      <path d="M12.5 6.5V4.8A1.8 1.8 0 0 0 10.7 3H5.3a1.8 1.8 0 0 0-1.8 1.8v10.4A1.8 1.8 0 0 0 5.3 17h5.4a1.8 1.8 0 0 0 1.8-1.8v-1.7" />
      <path d="M8.5 10h8M14 7.2 16.8 10 14 12.8" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4.5" width="14" height="11" rx="2" />
      <circle cx="7.4" cy="8.2" r="1.3" />
      <path d="M4 13.6 8 10l3 2.6 2.4-2 2.6 2.6" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a4 4 0 0 1 8 0c0 4 1.4 5 1.4 5H4.6S6 13 6 9z" />
      <path d="M8.5 16.2a1.8 1.8 0 0 0 3 0" />
    </>
  ),
  info: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 9v5M10 6.4h.01" />
    </>
  ),
}

export function Icon({ name, size = 18, strokeWidth = 1.7, className = '' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {lineIcons[name] || null}
    </svg>
  )
}

const appGlyphs = {
  finder: (
    <>
      <rect x="8.5" y="14" width="2.4" height="8" rx="1.2" fill="#fff" />
      <rect x="21.1" y="14" width="2.4" height="8" rx="1.2" fill="#fff" />
      <path d="M10 27c2 2.2 4.4 3.2 6 3.2s4-1 6-3.2" stroke="#fff" strokeWidth="2.1" fill="none" strokeLinecap="round" />
    </>
  ),
  browser: (
    <>
      <circle cx="16" cy="16" r="9.5" stroke="#fff" strokeWidth="2.2" fill="none" />
      <path d="M20.6 11.4 13.9 14.4 11.4 20.6 18.1 17.6z" fill="#fff" />
    </>
  ),
  terminal: (
    <>
      <path d="M9 12.5 14 16l-5 3.5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 20h6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  store: (
    <>
      <path d="M10.5 11h11l1.2 12a2 2 0 0 1-2 2.2H11.3a2 2 0 0 1-2-2.2z" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
      <path d="M13 12.6V10a3 3 0 0 1 6 0v2.6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </>
  ),
  settings: (
    <>
      <circle cx="16" cy="16" r="3.6" stroke="#fff" strokeWidth="2.2" fill="none" />
      <path d="M16 7v3M16 22v3M7 16h3M22 16h3M9.6 9.6l2.1 2.1M20.3 20.3l2.1 2.1M22.4 9.6l-2.1 2.1M11.7 20.3l-2.1 2.1" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  calculator: (
    <>
      <rect x="9" y="9" width="14" height="6" rx="2" fill="#fff" opacity=".9" />
      <circle cx="11.5" cy="19.5" r="1.6" fill="#fff" />
      <circle cx="16" cy="19.5" r="1.6" fill="#fff" />
      <circle cx="20.5" cy="19.5" r="1.6" fill="#fff" />
      <circle cx="11.5" cy="24.5" r="1.6" fill="#fff" />
      <circle cx="16" cy="24.5" r="1.6" fill="#fff" />
      <circle cx="20.5" cy="24.5" r="1.6" fill="#fff" />
    </>
  ),
  notes: (
    <>
      <rect x="9" y="8" width="14" height="16" rx="2.5" fill="#fff" opacity=".95" />
      <path d="M12 13h8M12 17h8M12 21h5" stroke="#e0a500" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  weather: (
    <>
      <circle cx="13" cy="13" r="4" fill="#fff" />
      <path d="M13 5.5V7M13 19v1.5M5.5 13H7M19 13h1.5M7.7 7.7l1 1M17.3 17.3l1 1M18.3 7.7l-1 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13.5 24a4.2 4.2 0 0 1 .4-8.4 5 5 0 0 1 9.4 1.6A3.4 3.4 0 0 1 22.8 24z" fill="#fff" />
    </>
  ),
  editor: (
    <>
      <path d="M10 7h7l5 5v13H10z" fill="#fff" opacity=".95" />
      <path d="M13 15h7M13 19h7M13 23h4" stroke="#8e8e93" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  passwords: (
    <>
      <circle cx="12" cy="20.6" r="4.4" stroke="#fff" strokeWidth="2.2" fill="none" />
      <path d="M15.2 17.4 24 8.6M21.2 11.4l2.6 2.6M23 9.6l2.6 2.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>
  ),
  flatpak: (
    <>
      <path d="M16 5.5 25.4 10.7v10.6L16 26.5 6.6 21.3V10.7z" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
      <path d="M6.9 10.8 16 16l9.1-5.2M16 16v10.2" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
    </>
  ),
}

export function AppGlyph({ appId, size = 52, className = '', color, letter }) {
  const tint = color
    ? {
        background: `radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0) 62%), linear-gradient(165deg, ${color}, ${color})`,
      }
    : undefined
  return (
    <span className={`app-glyph ${className}`} data-app={appId} style={{ width: size, height: size, ...tint }}>
      {tint && letter ? (
        <span className="glyph-letter" style={{ fontSize: size * 0.42 }}>
          {letter}
        </span>
      ) : (
        <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} aria-hidden="true">
          {appGlyphs[appId] || appGlyphs.editor}
        </svg>
      )}
    </span>
  )
}

export function XenityMark({ size = 15, className = '' }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true">
      <path d="M8 8l16 16M24 8 8 24" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  )
}
