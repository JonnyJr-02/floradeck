import { Link, useLocation } from 'wouter'
import { IconAlbum, IconCouple, IconExplore, IconJournal } from './icons'

const TABS = [
  { href: '/', label: 'Esplora', Icon: IconExplore },
  { href: '/album', label: 'Album', Icon: IconAlbum },
  { href: '/diario', label: 'Diario', Icon: IconJournal },
  { href: '/coppia', label: 'Coppia', Icon: IconCouple },
] as const

/** Bottom navigation of the four sections; hidden on secondary screens, which have Back. */
export function TabBar() {
  const [location] = useLocation()
  // An album's own page stays under the Album tab.
  const current = TABS.find((tab) => tab.href === location || (tab.href !== '/' && location.startsWith(`${tab.href}/`)))
  if (!current) return null
  return (
    <nav aria-label="Sezioni" className={location === '/' ? 'tabbar tabbar--camera' : 'tabbar'}>
      {TABS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="tab press" aria-current={current.href === href ? 'page' : undefined}>
          <span className="tab__icon">
            <Icon />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  )
}
