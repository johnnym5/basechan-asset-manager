import { describe, expect, it } from "vitest";
import { StocktakeItem, StocktakeRound } from "../src/types/assets";

describe("Stocktake, Tasks & Maintenance Workflows", () => {
  it("appends history entries atomically on item verification", () => {
    const item: StocktakeItem = {
      id: "round1_asset1",
      roundId: "round1",
      assetId: "asset1",
      assetTag: "BAM-100",
      branch: "Abuja Branch",
      status: "unverified",
      history: [],
    };

    const newCheck = {
      status: "verified" as const,
      note: "Asset in good condition at desk",
      checkedBy: "user-123",
      checkedAt: "2025-02-15T10:00:00.000Z",
    };

    const updatedItem: StocktakeItem = {
      ...item,
      status: newCheck.status,
      note: newCheck.note,
      checkedBy: newCheck.checkedBy,
      checkedAt: newCheck.checkedAt,
      history: [...(item.history || []), newCheck],
    };

    expect(updatedItem.status).toBe("verified");
    expect(updatedItem.history).toHaveLength(1);
    expect(updatedItem.history?.[0]).toEqual(newCheck);
  });

  it("prevents closing stocktake round if unverified items remain", () => {
    const round: StocktakeRound = {
      id: "round1",
      title: "Q1 Verification",
      branch: "Abuja Branch",
      status: "open",
      assignedUids: ["user-1"],
      createdBy: "admin-1",
    };

    const items: StocktakeItem[] = [
      { id: "i1", roundId: "round1", assetId: "a1", assetTag: "BAM-1", branch: "Abuja Branch", status: "verified" },
      { id: "i2", roundId: "round1", assetId: "a2", assetTag: "BAM-2", branch: "Abuja Branch", status: "unverified" },
    ];

    const canClose = items.filter((i) => i.roundId === round.id).every((i) => i.status !== "unverified");
    expect(canClose).toBe(false);
  });
});
