import gsap from "gsap";

export function isReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export const EASINGS = {
  SPRING_OUT: "back.out(1.5)",
  SMOOTH_OUT: "power3.out",
  EXPO_OUT: "expo.out",
};

/**
 * Page / Tab entrance animation
 */
export function animatePageEntrance(target: HTMLElement | string) {
  if (isReducedMotion() || typeof window === "undefined") return;
  gsap.fromTo(
    target,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.35, ease: EASINGS.SMOOTH_OUT, clearProps: "transform" }
  );
}

/**
 * Liquid GSAP spring pop-in for modals and dialogs
 */
export function animateModalPopIn(modalEl: HTMLElement | null, backdropEl?: HTMLElement | null) {
  if (typeof window === "undefined" || !modalEl) return;

  if (isReducedMotion()) {
    if (backdropEl) gsap.set(backdropEl, { opacity: 1 });
    gsap.set(modalEl, { opacity: 1, scale: 1, y: 0 });
    return;
  }

  if (backdropEl) {
    gsap.fromTo(backdropEl, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" });
  }

  gsap.fromTo(
    modalEl,
    { opacity: 0, scale: 0.94, y: 12 },
    { opacity: 1, scale: 1, y: 0, duration: 0.32, ease: EASINGS.SPRING_OUT }
  );
}

/**
 * Liquid GSAP pop-out exit animation for modals
 */
export function animateModalPopOut(
  modalEl: HTMLElement | null,
  backdropEl: HTMLElement | null | undefined,
  onComplete: () => void
) {
  if (typeof window === "undefined" || !modalEl) {
    onComplete();
    return;
  }

  if (isReducedMotion()) {
    onComplete();
    return;
  }

  const tl = gsap.timeline({ onComplete });
  if (backdropEl) {
    tl.to(backdropEl, { opacity: 0, duration: 0.15, ease: "power2.in" }, 0);
  }
  tl.to(modalEl, { opacity: 0, scale: 0.95, y: 8, duration: 0.15, ease: "power2.in" }, 0);
}

/**
 * Mobile Drawer Slide-In Animation
 */
export function animateDrawerSlideIn(drawerEl: HTMLElement | null) {
  if (typeof window === "undefined" || !drawerEl) return;
  if (isReducedMotion()) {
    gsap.set(drawerEl, { yPercent: 0, opacity: 1 });
    return;
  }
  gsap.fromTo(
    drawerEl,
    { yPercent: 100, opacity: 0.8 },
    { yPercent: 0, opacity: 1, duration: 0.28, ease: EASINGS.SMOOTH_OUT }
  );
}

/**
 * Staggered Card Entrance Animation
 */
export function animateStaggerCards(
  targets: HTMLElement[] | NodeListOf<HTMLElement> | string
) {
  if (typeof window === "undefined" || isReducedMotion()) return;
  gsap.fromTo(
    targets,
    { opacity: 0, y: 14, scale: 0.98 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.3,
      stagger: 0.04,
      ease: EASINGS.SMOOTH_OUT,
      clearProps: "transform",
    }
  );
}
