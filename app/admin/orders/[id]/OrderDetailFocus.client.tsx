"use client";

import { useEffect } from "react";

export default function OrderDetailFocus({ targetId }: { targetId?: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReducedMotion) {
      root.style.scrollBehavior = "smooth";
    }
    return () => {
      root.style.scrollBehavior = previousBehavior;
    };
  }, []);

  useEffect(() => {
    if (!targetId) return;
    const element = document.getElementById(targetId);
    if (element) {
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  }, [targetId]);

  return null;
}
