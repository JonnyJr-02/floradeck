interface Option<T extends string> {
  value: T
  label: string
}

/** A row of pills that behaves as a native radio group (keyboard, screen readers, forms). */
export function Segmented<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  wrap = false,
}: {
  name: string
  label: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
  /** Many options: flow onto two rows instead of squeezing one. */
  wrap?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className={wrap ? 'segmented segmented--wrap' : 'segmented'}>
      {options.map((option) => (
        <label key={option.value} className="control">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
