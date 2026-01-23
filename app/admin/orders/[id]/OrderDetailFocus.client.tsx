"use client";

import { useEffect } from "react";

export default function OrderDetailFocus({ targetId }: { targetId?: string }) {
  useEffect(() => {
    if (!targetId) return;
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [targetId]);

  return null;
}
