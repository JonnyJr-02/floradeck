import { useEffect, useMemo } from 'react'
import { photoBlob } from '../db/collection'
import type { PhotoRecord } from '../db/db'

/** An object URL for a stored photo, revoked when the photo changes or the component leaves. */
export function usePhotoUrl(photo: PhotoRecord | undefined, size: 'image' | 'thumbnail' = 'image'): string | undefined {
  const url = useMemo(() => (photo ? URL.createObjectURL(photoBlob(photo, size)) : undefined), [photo, size])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  return url
}

export function PhotoThumb({ photo, alt, className }: { photo: PhotoRecord | undefined; alt: string; className?: string }) {
  const url = usePhotoUrl(photo, 'thumbnail')
  return url ? <img src={url} alt={alt} className={className} decoding="async" /> : null
}
