import { useState } from 'react'
import { plateUrl } from '../domain/plates'
import { referencePhotoUrl } from '../domain/referencePhotos'

/**
 * Someone else's photo of a species, to compare with what is in front of you. Offline, a photo never
 * seen before is not on the phone yet (runtime cache), so the botanical plate (precached) stands in;
 * with neither, the frame stays empty.
 */
export function SpeciesPicture({ speciesId, className }: { speciesId: string; className: string }) {
  const photo = referencePhotoUrl(speciesId)
  const plate = plateUrl(speciesId)
  const [src, setSrc] = useState(photo ?? plate)
  return (
    <span className={className} aria-hidden="true">
      {src ? (
        <img
          src={src}
          alt=""
          data-plate={src === plate || undefined}
          decoding="async"
          onError={() => setSrc((current) => (current !== plate ? plate : undefined))}
        />
      ) : null}
    </span>
  )
}
