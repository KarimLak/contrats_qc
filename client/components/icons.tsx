interface IconProps {
  size?: number
  color?: string
}

const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none" as const })

export function DocumentIcon({ size = 18, color = "#00786f" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3v4h4" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function CheckCircleIcon({ size = 18, color = "#16a34a" }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <path d="M8 12.5l2.5 2.5L16 9" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PinIcon({ size = 18, color = "#1d4ed8" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function TagIcon({ size = 18, color = "#a21caf" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M11.5 3H5a1 1 0 0 0-1 1v6.5a1 1 0 0 0 .3.7l9.5 9.5a1 1 0 0 0 1.4 0l6.5-6.5a1 1 0 0 0 0-1.4L12.2 3.3a1 1 0 0 0-.7-.3Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.4" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

export function SearchIcon({ size = 18, color = "#00786f" }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth="1.6" />
      <path d="M20 20l-4.5-4.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function BellIcon({ size = 18, color = "#00786f" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 10a6 6 0 0 1 12 0v4l1.6 3.2a1 1 0 0 1-.9 1.4H5.3a1 1 0 0 1-.9-1.4L6 14v-4Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 20a2 2 0 0 0 4 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function BarChartIcon({ size = 18, color = "#00786f" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 20V10M12 20V4M19 20v-7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function BookmarkIcon({ size = 18, color = "#00786f" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function LockIcon({ size = 18, color = "#009991" }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function RefreshIcon({ size = 18, color = "#009991" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 4v4.5h-4.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function FlagIcon({ size = 18, color = "#009991" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 3v18" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 4h13l-3 4 3 4H5" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function ChatIcon({ size = 18, color = "#009991" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 5h16v11H9l-4 4V5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

export function EyeOffIcon({ size = 18, color = "#8ba5a5" }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" stroke={color} strokeWidth="1.6" />
      <path d="M3.5 3.5l17 17" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function ClockIcon({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.6" />
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
