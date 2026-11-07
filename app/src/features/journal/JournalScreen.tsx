import { Link } from 'wouter'
import { EmptyState, Page, ScreenHeader } from '../../ui/Page'

export function JournalScreen() {
  return (
    <Page>
      <ScreenHeader title="Diario" />
      <EmptyState
        title="Il diario è ancora vuoto"
        action={
          <Link href="/" className="btn press">
            Inizia a esplorare
          </Link>
        }
      >
        <p>Ogni carta che trovi finisce qui, con il giorno dello scatto e, se vuoi, il posto.</p>
      </EmptyState>
    </Page>
  )
}
