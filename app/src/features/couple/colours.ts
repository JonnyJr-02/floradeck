import { PROFILE_COLOURS } from '../../db/couple'

/** Only a plain hex colour from another phone reaches a style attribute. */
export function safeColour(colour: string | undefined, fallback: string = PROFILE_COLOURS[0]): string {
  return colour && /^#[0-9a-f]{6}$/i.test(colour) ? colour : fallback
}

/** The two players' colours; when both picked the same one, the partner's dots take another. */
export function coupleColours(mine: string | undefined, theirs: string | undefined): { me: string; partner: string } {
  const me = safeColour(mine)
  const partner = safeColour(theirs, PROFILE_COLOURS[2])
  if (partner.toLowerCase() !== me.toLowerCase()) return { me, partner }
  return { me, partner: PROFILE_COLOURS.find((colour) => colour !== me) ?? PROFILE_COLOURS[2] }
}
