import { useEffect, useMemo } from 'react'
import type { Species } from '../../domain/catalog'
import { formatFoundDate } from '../../domain/collection'
import type { GiftInfo } from '../../domain/share'

/** An object URL for a blob (or bytes), released when it changes or the view leaves. */
export function useObjectUrl(source: Blob | { type: string; bytes: Uint8Array } | undefined): string | undefined {
  const url = useMemo(() => {
    if (!source) return undefined
    const blob = source instanceof Blob ? source : new Blob([source.bytes.slice()], { type: source.type })
    return URL.createObjectURL(blob)
  }, [source])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  return url
}

/** A received gift before it is added: photo, who sends it, the species, the message. */
export function GiftPreview({
  gift,
  entry,
  photoUrl,
  heading,
  headingLevel = 'h2',
}: {
  gift: GiftInfo
  entry: Species
  photoUrl: string | undefined
  heading: string
  headingLevel?: 'h1' | 'h2' | 'h3'
}) {
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
