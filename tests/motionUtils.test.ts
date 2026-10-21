import { describe, expect, it } from "vitest";
import {
  DRAWER_VARIANTS,
  MODAL_CONTENT_VARIANTS,
  SPRING_TRANSITION,
  STAGGER_CONTAINER_VARIANTS,
} from "../src/lib/motion";

describe("motionUtils Framer Motion Presets", () => {
  it("exports spring transition settings", () => {
    expect(SPRING_TRANSITION.type).toBe("spring");
    expect(SPRING_TRANSITION.stiffness).toBe(350);
  });

  it("exports valid modal and drawer animation variants", () => {
    expect(MODAL_CONTENT_VARIANTS.hidden).toBeDefined();
    expect(MODAL_CONTENT_VARIANTS.visible).toBeDefined();
    expect(MODAL_CONTENT_VARIANTS.exit).toBeDefined();

    expect(DRAWER_VARIANTS.hidden).toEqual({ y: "100%", opacity: 0.8 });
    expect(DRAWER_VARIANTS.visible).toEqual({ y: 0, opacity: 1 });
    expect(DRAWER_VARIANTS.exit).toEqual({ y: "100%", opacity: 0 });
  });

  it("exports stagger container variants", () => {
    expect(STAGGER_CONTAINER_VARIANTS.visible).toBeDefined();
  });
});
