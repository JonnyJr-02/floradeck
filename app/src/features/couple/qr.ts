import qrcode from 'qrcode-generator'

/** A QR code as an SVG path of its dark modules (1 unit per module), plus its size in modules. */
export function qrPath(text: string): { size: number; path: string } {
  // Level M survives a scratched or glare-washed screen and still fits a progress link easily.
  const code = qrcode(0, 'M')
  code.addData(text, 'Byte')
  code.make()
  const size = code.getModuleCount()
  let path = ''
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (code.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`
    }
  }
  return { size, path }
}

/** Dark/light module grid, for tests and for decoding checks. */
export function qrModules(text: string): boolean[][] {
  const code = qrcode(0, 'M')
  code.addData(text, 'Byte')
  code.make()
  const size = code.getModuleCount()
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => code.isDark(row, col)))
}
