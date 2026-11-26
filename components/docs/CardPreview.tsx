/* oxlint-disable nextjs/no-img-element -- an SVG data URL: nothing to optimise */

/** A card drawn at build time with the real renderer, for the bundled sample profile. */
export function CardPreview({
  src,
  alt,
  caption = "Sample profile",
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  return (
    <div className="my-4 min-w-0 border border-line bg-void/60 p-3">
      <div className="grid place-items-start overflow-x-auto">
        <img src={src} alt={alt} className="h-auto max-w-full" />
      </div>
      <p className="label mt-2">{caption}</p>
    </div>
  );
}
