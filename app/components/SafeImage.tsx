"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

const FALLBACK = "images/default-placeholder.webp";

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement>;

function initialSrc(src: SafeImageProps["src"]): string {
  return typeof src === "string" && src.trim() ? src : FALLBACK;
}

export default function SafeImage({
  src,
  alt = "",
  onError,
  ...rest
}: SafeImageProps) {
  const [current, setCurrent] = useState<string>(initialSrc(src));
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrent(initialSrc(src));
  }, [src]);

  // Static export: the pre-rendered <img> can fail before hydration attaches onError.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0 && current !== FALLBACK) {
      setCurrent(FALLBACK);
    }
  }, [current]);

  return (
    <img
      {...rest}
      ref={ref}
      src={current || FALLBACK}
      alt={alt}
      onError={(event) => {
        if (current !== FALLBACK) {
          setCurrent(FALLBACK);
        }
        onError?.(event);
      }}
    />
  );
}
