import { describe, expect, it } from 'vitest'
import { formatBytes } from './format'

describe('formatBytes', () => {
  it('writes small sizes in kB without decimals', () => {
    expect(formatBytes(0)).toBe('0 kB')
    expect(formatBytes(12 * 1024)).toBe('12 kB')
  })

  it('writes megabytes with an Italian decimal comma', () => {
    expect(formatBytes(1.25 * 1024 * 1024)).toBe('1,3 MB')
    expect(formatBytes(20 * 1024 * 1024)).toBe('20 MB')
  })

  it('writes gigabytes', () => {
    expect(formatBytes(3.4 * 1024 ** 3)).toBe('3,4 GB')
  })
})
