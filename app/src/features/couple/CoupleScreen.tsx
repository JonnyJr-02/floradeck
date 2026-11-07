import { EmptyState, Page, ScreenHeader } from '../../ui/Page'

export function CoupleScreen() {
  return (
    <Page>
      <ScreenHeader title="Coppia" />
      <EmptyState title="FloraDeck si gioca in due">
        <p>
          Qui vedrete i progressi di tutti e due e potrete regalarvi le carte doppie. Arriva con uno dei prossimi
          aggiornamenti.
        </p>
      </EmptyState>
    </Page>
  )
}
