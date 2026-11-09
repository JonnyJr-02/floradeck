import { useEffect, useMemo } from 'react'
import type { Species } from '../../domain/catalog'
import { formatFoundDate } from '../../domain/collection'
import type { Gift } from '../../domain/share'

/** An object URL for a gift's photo bytes, released when the gift changes or the view leaves. */
export function useGiftPhotoUrl(gift: Gift | undefined): string | undefined {
  const url = useMemo(
    () => (gift ? URL.createObjectURL(new Blob([gift.photo.bytes.slice()], { type: gift.photo.type })) : undefined),
    [gift],
  )
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  return url
}

/** Only a plain hex colour from another phone reaches a style attribute. */
export function safeColour(colour: string | undefined, fallback = 'var(--p-accent)'): string {
  return colour && /^#[0-9a-f]{6}$/i.test(colour) ? colour : fallback
}

/** The gift as both phones see it: photo, who sends it, the species, the message. */
export function GiftPreview({
  gift,
  entry,
  heading,
  headingLevel = 'h2',
}: {
  gift: Gift
  entry: Species
  heading: string
  headingLevel?: 'h1' | 'h2'
}) {
  const photoUrl = useGiftPhotoUrl(gift)
  const Title = headingLevel
  return (
    <article className="gift" aria-labelledby="gift-title">
      <div className="gift__photo">
        {photoUrl ? <img src={photoUrl} alt={`La foto del regalo: ${entry.commonNameIt}`} /> : null}
      </div>
      <div className="gift__body">
        <p className="text-[0.875rem] font-semibold text-accent">{heading}</p>
        <Title id="gift-title" className="mt-1 text-[1.75rem] leading-[1.05]">
          {entry.commonNameIt}
        </Title>
        <p className="mt-1 text-[0.875rem] italic text-muted">{entry.scientificName}</p>
        {gift.message ? <blockquote className="gift__message">«{gift.message}»</blockquote> : null}
        {gift.foundAt ? (
          <p className="mt-3 text-[0.8125rem] text-muted">Trovata il {formatFoundDate(gift.foundAt)}</p>
        ) : null}
      </div>
    </article>
  )
}
