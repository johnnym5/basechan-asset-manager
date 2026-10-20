import { expect, test, Page } from "@playwright/test";

const staffEmail = "alice.basechaninternational@gmail.com";
const adminEmail = "qa@basechaninternational.com";
const password = "Local-Test-Only-2026!";

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Test account email").fill(email);
  await page.getByLabel("Test account password").fill(password);
  await page.getByRole("button", { name: "Sign in to local test account" }).click();
}

test("staff receive a personal welcome, see only accessible pages, and can replay Help", async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === "mobile-chromium";
  if (isMobile) await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, isMobile ? "mobile.basechaninternational@gmail.com" : staffEmail);
  await expect(page.getByRole("heading", { name: `Welcome, ${isMobile ? "Mobile" : "Alice"}` })).toBeVisible();
  await page.getByRole("button", { name: "Show me around" }).click();
  await expect(page.getByRole("heading", { name: "A quick guide to your workspace" })).toBeVisible();
  await expect(page.getByText("My Accounts / Credentials Vault")).toBeVisible();
  await page.getByRole("button", { name: "Finish guide" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Alice" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "My Assets" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Data & Workbooks" })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "My Assets" }).click();
  await expect(page.getByText(isMobile ? "Dell Latitude 5420" : "HP EliteBook 840 G6").first()).toBeVisible();
  await page.getByRole("button", { name: "Help and app guide" }).click();
  await expect(page.getByRole("heading", { name: `Welcome, ${isMobile ? "Mobile" : "Alice"}` })).toBeVisible();
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(horizontalOverflow).toBe(false);
});

test("administrators receive the operations overview and organization pages", async ({ page }, testInfo) => {
  const email = testInfo.project.name === "mobile-chromium" ? "mobile-qa@basechaninternational.com" : adminEmail;
  await signIn(page, email);
  await expect(page.getByRole("heading", { name: `Welcome, ${email.split("@")[0]}` })).toBeVisible();
  await page.getByRole("button", { name: "Show me around" }).click();
  await expect(page.getByText("Excel Import")).toBeVisible();
  await page.getByRole("button", { name: "Finish guide" }).click();
  await expect(page.getByText("Consolidated Operational Inventory")).toBeVisible();
  await expect(page.getByRole("button", { name: "Staff Directory" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Excel Ingestion & Sync" }).first()).toBeVisible();
});
