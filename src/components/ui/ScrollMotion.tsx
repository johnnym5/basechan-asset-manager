"use client";

import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { animatePageEntrance, animateStaggerCards, isReducedMotion } from "@/lib/motion";

export const ScrollMotion: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (isReducedMotion() || typeof window === "undefined") return;

      const pageRoots = document.querySelectorAll("[data-scroll-motion-root]");
      pageRoots.forEach((root) => {
        animatePageEntrance(root as HTMLElement);
        const directChildren = root.querySelectorAll(":scope > article, :scope > div, :scope > section");
        if (directChildren.length > 0) {
          animateStaggerCards(directChildren as NodeListOf<HTMLElement>);
        }
      });
    },
    { scope: containerRef }
  );

  return <div ref={containerRef}>{children}</div>;
};
