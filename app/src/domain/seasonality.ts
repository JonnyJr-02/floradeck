const MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
] as const

function monthName(month: number): string {
  return MONTHS[(month - 1 + 12) % 12] ?? ''
}

/**
 * Group months (1–12) into runs, wrapping around the new year: [1, 2, 3, 12] is one run from
 * December to March.
 */
export function monthRuns(months: readonly number[]): Array<[number, number]> {
  const set = new Set(months.filter((m) => m >= 1 && m <= 12))
  if (set.size === 0) return []
  if (set.size === 12) return [[1, 12]]
  // Start right after a month that is missing, so a run across the new year stays whole.
  let start = 1
  while (set.has(start === 1 ? 12 : start - 1) || !set.has(start)) start = (start % 12) + 1
  const runs: Array<[number, number]> = []
  let runStart: number | null = null
  let previous = 0
  for (let step = 0; step < 12; step++) {
    const month = ((start - 1 + step) % 12) + 1
    if (set.has(month)) {
      if (runStart === null) runStart = month
      previous = month
    } else if (runStart !== null) {
      runs.push([runStart, previous])
      runStart = null
    }
  }
  if (runStart !== null) runs.push([runStart, previous])
  return runs
}

/** "da marzo a giugno", "aprile e da luglio a settembre", "tutto l'anno". */
export function formatMonths(months: readonly number[]): string {
  const runs = monthRuns(months)
  if (runs.length === 0) return ''
  if (runs.length === 1 && runs[0]?.[0] === 1 && runs[0][1] === 12) return "tutto l'anno"
  const parts = runs.map(([from, to]) => (from === to ? monthName(from) : `da ${monthName(from)} a ${monthName(to)}`))
  return parts.length === 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`
}
