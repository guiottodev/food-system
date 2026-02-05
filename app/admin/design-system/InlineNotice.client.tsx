"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "../_styles/adminPrimitives.module.css";

type NoticeTone = "info" | "success" | "warning" | "error";

function toneClass(tone: NoticeTone) {
  if (tone === "success") return styles.noticeSuccess;
  if (tone === "warning") return styles.noticeWarning;
  if (tone === "error") return styles.noticeError;
  return "";
}

export function InlineNotice({
  tone = "info",
  dismissAfterMs = 6000,
  clearQueryKeys = [],
  children,
}: {
  tone?: NoticeTone;
  dismissAfterMs?: number;
  clearQueryKeys?: string[];
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "warning"
      ? AlertTriangle
      : tone === "error"
      ? XCircle
      : Info;

  const clearHref = useMemo(() => {
    if (clearQueryKeys.length === 0) return null;
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    for (const key of clearQueryKeys) next.delete(key);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [clearQueryKeys, pathname, searchParams]);

  function dismiss() {
    setVisible(false);
  }

  useEffect(() => {
    if (!dismissAfterMs || dismissAfterMs <= 0) return;
    const t = window.setTimeout(() => setVisible(false), dismissAfterMs);
    return () => window.clearTimeout(t);
  }, [dismissAfterMs]);

  useEffect(() => {
    if (visible) return;
    if (clearHref) router.replace(clearHref);
  }, [clearHref, router, visible]);

  if (!visible) return null;

  return (
    <div className={`${styles.notice} ${toneClass(tone)}`}>
      <span className={styles.noticeIcon} aria-hidden>
        <Icon size={16} />
      </span>
      <div className={styles.noticeContent}>{children}</div>
      <button
        type="button"
        className={styles.noticeDismiss}
        onClick={dismiss}
        aria-label="Fechar aviso"
      >
        <X size={16} />
      </button>
    </div>
  );
}
