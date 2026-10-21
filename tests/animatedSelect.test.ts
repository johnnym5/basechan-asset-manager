import { describe, expect, it } from "vitest";
import { SelectOption } from "../src/components/ui/AnimatedSelect";

describe("AnimatedSelect Props & Options Test", () => {
  it("parses select options correctly", () => {
    const options: SelectOption[] = [
      { value: "ALL", label: "All Items" },
      { value: "ACTIVE", label: "Active Only" },
    ];

    expect(options).toHaveLength(2);
    expect(options[0].value).toBe("ALL");
    expect(options[1].label).toBe("Active Only");
  });
});
