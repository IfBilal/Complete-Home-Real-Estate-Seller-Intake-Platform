"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollReveal() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal")
    );

    elements.forEach((element) => element.classList.add("reveal-hidden"));
  }, [pathname]);

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal")
    );

    if (elements.length === 0) {
      return undefined;
    }

    const isInViewport = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    };

    if (typeof IntersectionObserver === "undefined") {
      elements.forEach((element) => {
        element.classList.remove("reveal-hidden");
        element.classList.add("in-view");
      });
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "120px 0px -10% 0px"
      }
    );

    const revealNow = () => {
      elements.forEach((element) => {
        if (isInViewport(element)) {
          element.classList.add("in-view");
        } else {
          observer.observe(element);
        }
      });
    };

    const frame = requestAnimationFrame(() => {
      const secondFrame = requestAnimationFrame(() => {
        window.setTimeout(revealNow, 60);
      });

      return () => cancelAnimationFrame(secondFrame);
    });

    window.addEventListener("load", revealNow, { once: true });

    const fallback = window.setTimeout(() => {
      elements.forEach((element) => element.classList.add("in-view"));
    }, 800);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
      window.removeEventListener("load", revealNow);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
