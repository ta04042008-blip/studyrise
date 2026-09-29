import { useState } from 'react';

export interface GameImageProps {
  /** Runtime art path, typically from a `resolve*ArtPath`/`resolve*BackgroundPath` call in `studyRiseAssets.ts`. `undefined` means "no art registered for this id yet" (manifest §13) — renders nothing. */
  src: string | undefined;
  alt: string;
  className?: string;
}

/**
 * Presentation-only `<img>` wrapper (Phase C-1,
 * docs/StudyRise_AssetManifest_v0.1.md §13's fallback rules). No
 * Engine/Save/Definition dependency — this file only ever receives a
 * plain path string (or `undefined`) from its caller.
 *
 * Renders nothing (`null`) when `src` is `undefined`, and nothing once
 * that same `src` has failed to load — a missing/corrupt image file
 * never throws or otherwise breaks the surrounding UI (CLAUDE.md §19).
 * The caller is responsible for whatever fallback markup should show
 * through in either case (this component just declines to render an
 * `<img>`); it never invents a placeholder box itself.
 *
 * Sizing/cropping (width, height, object-fit, etc.) is left entirely to
 * the caller's own CSS via `className` — this component sets no game-
 * logic-derived dimensions and does not alter/validate `src` (no
 * external-URL allow-listing or rewriting).
 */
export function GameImage({ src, alt, className }: GameImageProps) {
  const [erroredSrc, setErroredSrc] = useState<string | undefined>(undefined);
  // Render-phase state adjustment (React's documented pattern for
  // resetting state when a prop changes, without an extra post-mount
  // render via useEffect): whenever `src` itself changes — including
  // back to a value that failed before — the error state is dropped so
  // that src gets a fresh load attempt.
  const [trackedSrc, setTrackedSrc] = useState(src);
  if (trackedSrc !== src) {
    setTrackedSrc(src);
    setErroredSrc(undefined);
  }

  if (src === undefined || src === erroredSrc) {
    return null;
  }

  return <img src={src} alt={alt} className={className} onError={() => setErroredSrc(src)} />;
}
