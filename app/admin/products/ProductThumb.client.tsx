"use client";

import { useState } from "react";
import layoutStyles from "./products.module.css";

type ProductThumbProps = {
  imageMainUrl: string | null;
  name: string;
};

export default function ProductThumb({ imageMainUrl, name }: ProductThumbProps) {
  const [failed, setFailed] = useState(false);
  const showFallback = !imageMainUrl || failed;

  if (showFallback) {
    return (
      <div className={layoutStyles.productThumbFallback} aria-hidden>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- imageMainUrl é URL arbitrária (form); next/image exigiria remotePatterns abertos; thumb 44px com fallback e onError é adequado
    <img
      src={imageMainUrl}
      alt=""
      width={44}
      height={44}
      className={layoutStyles.productThumb}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
