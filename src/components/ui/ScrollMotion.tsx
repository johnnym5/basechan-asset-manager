"use client";

import React, { useEffect } from "react";

export const ScrollMotion: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const targets = new Set<Element>();
    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer?.unobserve(entry.target);
            }
          });
        }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" })
    }

    const scan = () => {
      document.querySelectorAll("[data-scroll-motion-root] > *").forEach((element) => {
        if (targets.has(element)) return;
        targets.add(element);
        element.classList.add("scroll-reveal");
        if (observer) observer.observe(element);
        else element.classList.add("is-visible");
      });
    };

    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      observer?.disconnect();
    };
  }, []);

  return <>{children}</>;
};
