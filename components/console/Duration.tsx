// Run time, with the unit kept lowercase inside uppercase labels ("µ" would
// otherwise become the Greek capital "Μ").
export function Duration({ micros }: { micros: number }) {
  const [value, unit] = micros < 1000 ? [String(micros), "µs"] : [(micros / 1000).toFixed(1), "ms"];
  return (
    <span className="tabular-nums">
      {value} <span className="normal-case">{unit}</span>
    </span>
  );
}
