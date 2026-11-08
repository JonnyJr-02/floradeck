import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

/** Line icons drawn on a 24 px grid, from the phase-2 mockups. Always decorative: label the control. */
function Icon({ children, className = 'size-[1.375rem]', ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconExplore(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3.5" />
    </Icon>
  )
}

export function IconAlbum(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </Icon>
  )
}

export function IconJournal(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 6.5c-1.8-1.3-4.3-2-7-2v13c2.7 0 5.2.7 7 2 1.8-1.3 4.3-2 7-2v-13c-2.7 0-5.2.7-7 2z" />
      <path d="M12 6.5v13" />
    </Icon>
  )
}

export function IconCouple(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 19.5s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.3c0 4.9-7 9.2-7 9.2z" />
    </Icon>
  )
}

export function IconSettings(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </Icon>
  )
}

export function IconBack(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 5.5 8.5 12l6.5 6.5" />
    </Icon>
  )
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Icon>
  )
}

/** The iOS share symbol: a square with an arrow pointing up. */
export function IconShare(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5v11M8.5 7 12 3.5 15.5 7" />
      <path d="M8 10H6.5a1 1 0 0 0-1 1v8.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V11a1 1 0 0 0-1-1H16" />
    </Icon>
  )
}

/** iOS "Add to Home Screen": a rounded square with a plus. */
export function IconAddSquare(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </Icon>
  )
}

/** Chrome's menu: three vertical dots. */
export function IconMenuDots(props: IconProps) {
  return (
    <Icon {...props} fill="currentColor" stroke="none">
      <circle cx="12" cy="5.5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="18.5" r="1.6" />
    </Icon>
  )
}

export function IconGallery(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20.5 15.5l-4.2-4.2a1.5 1.5 0 0 0-2.1 0L6.5 19.5" />
    </Icon>
  )
}

export function IconChevron(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  )
}

export function IconCamera(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </Icon>
  )
}
