import { describe, expect, it } from 'vitest'
import { coupleColours, safeColour } from './colours'

describe('player colours', () => {
  it('lets only hex colours through', () => {
    expect(safeColour('#3d5fb8')).toBe('#3d5fb8')
    expect(safeColour('red; background: url(x)')).toBe('#a83e2b')
  })

  it('keeps the two players apart when they chose the same colour', () => {
    expect(coupleColours('#3d5fb8', '#5b7a3a')).toEqual({ me: '#3d5fb8', partner: '#5b7a3a' })
    expect(coupleColours('#a83e2b', '#A83E2B').partner).not.toBe('#a83e2b')
  })
})
