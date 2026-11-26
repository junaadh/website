// The logo: a bracketed, chamfered frame around a monoline J. The same shapes
// as public/favicon.svg, drawn in currentColor so it follows the accent hue.

export function Mark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={className} fill="none">
      <path
        d="M10 1h53v52l-10 10H1V11z"
        stroke="currentColor"
        strokeOpacity=".35"
        strokeWidth="2"
      />
      <path
        d="M8 22V14l6-6h8M42 8h14v14M56 42v8l-6 6H42M22 56H8V42"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path d="M23 20h18M34 20v20a10 10 0 0 1-10 10h-1" stroke="currentColor" strokeWidth="6" />
    </svg>
  );
}
