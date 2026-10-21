import { describe, expect, it } from "vitest";
import { EASINGS, isReducedMotion } from "../src/lib/motion";

describe("motionUtils", () => {
  it("exports standardized GSAP easings", () => {
    expect(EASINGS.SPRING_OUT).toBe("back.out(1.5)");
    expect(EASINGS.SMOOTH_OUT).toBe("power3.out");
    expect(EASINGS.EXPO_OUT).toBe("expo.out");
  });

  it("checks reduced motion safely in environment", () => {
    const reduced = isReducedMotion();
    expect(typeof reduced).toBe("boolean");
  });
});
