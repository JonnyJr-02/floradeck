import type { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { IconBack, IconSettings } from './icons'

/** History state set on in-app links, so Back knows it can step back instead of leaving. */
export const IN_APP = { inApp: true } as const

export function Page({ children, plain = false }: { children: ReactNode; plain?: boolean }) {
  return <main className={plain ? 'page page--plain' : 'page'}>{children}</main>
}

export function SettingsLink({ className = 'round-btn press' }: { className?: string }) {
  return (
    <Link href="/impostazioni" state={IN_APP} className={className} aria-label="Impostazioni">
      <IconSettings />
    </Link>
  )
}

/** Title row of a tab screen: the big serif title and the settings button. */
export function ScreenHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[2rem] leading-[1.05]">{title}</h1>
        {children}
      </div>
      <SettingsLink />
    </header>
  )
}

/** Title row of a secondary screen, with Back. */
export function BackHeader({ title }: { title: string }) {
  const [, navigate] = useLocation()
  const goBack = () => {
    const state = window.history.state as { inApp?: boolean } | null
    if (state?.inApp) window.history.back()
    else navigate('/', { replace: true })
  }
  return (
    <header className="flex items-center gap-3">
      <button type="button" className="round-btn press" onClick={goBack} aria-label="Indietro">
        <IconBack />
      </button>
      <h1 className="text-[1.75rem] leading-tight">{title}</h1>
    </header>
  )
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="card mt-6 grid gap-3 px-5 py-6">
      <h2 className="text-[1.375rem] leading-tight">{title}</h2>
      <div className="text-muted">{children}</div>
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  )
}
