const oneDecimal = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })
const noDecimals = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 })

const KB = 1024
const MB = KB * 1024
const GB = MB * 1024

/** Storage sizes the Italian way: "12 kB", "1,2 MB", "3,4 GB" (with a non-breaking space). */
export function formatBytes(bytes: number): string {
  if (bytes < MB) return `${noDecimals.format(Math.max(0, bytes) / KB)} kB`
  if (bytes < GB) return `${oneDecimal.format(bytes / MB)} MB`
  return `${oneDecimal.format(bytes / GB)} GB`
}
