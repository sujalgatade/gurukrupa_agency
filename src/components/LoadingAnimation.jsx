"use client";

import { useEffect, useRef } from "react";

export default function LoadingAnimation({
  size = 56,
  label = "Loading",
  className = "",
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let animation;

    import("lottie-web")
      .then(({ default: lottie }) => {
        if (cancelled || !containerRef.current) return;
        animation = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          path: "/loading-animation.json",
          rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
        });
      })
      .catch((error) => console.error("Could not load the animation.", error));

    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, []);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      role="status"
      aria-label={label}
    >
      <span
        ref={containerRef}
        aria-hidden="true"
        style={{ width: size, height: size }}
      />
    </span>
  );
}
