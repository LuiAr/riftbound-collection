"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

export default function CardArtwork({ src, alt, lazy = false }: { src: string | null | undefined; alt: string; lazy?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return src && failedSource !== src
    ? <img src={src} alt={alt} loading={lazy ? "lazy" : "eager"} onError={() => setFailedSource(src)} />
    : <span className="card-artwork-fallback"><ImageOff aria-hidden="true" /><span>Image unavailable</span></span>;
}
