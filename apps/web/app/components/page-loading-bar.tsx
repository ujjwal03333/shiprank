"use client";

import { useEffect, useState, useRef } from "react";

export function PageLoadingBar() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    function startLoading() {
      setLoading(true);
      setProgress(0);
      if (timer.current) clearInterval(timer.current);
      let p = 0;
      timer.current = setInterval(() => {
        p += (90 - p) * 0.08;
        setProgress(p);
      }, 100);
    }

    function stopLoading() {
      if (timer.current) clearInterval(timer.current);
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }

    history.pushState = function (...args) {
      stopLoading();
      return originalPushState(...args);
    };
    history.replaceState = function (...args) {
      stopLoading();
      return originalReplaceState(...args);
    };

    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (
        anchor &&
        anchor.href &&
        anchor.origin === location.origin &&
        !anchor.target &&
        !anchor.download &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        anchor.pathname !== location.pathname
      ) {
        startLoading();
      }
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", stopLoading);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", stopLoading);
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 z-50 h-[2px] bg-brand transition-all duration-200 ease-out"
      style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
    />
  );
}
