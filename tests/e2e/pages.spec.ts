/**
 * Every page renders at desktop and phone widths, in light and dark mode, with no page
 * errors, no console errors and no horizontal overflow; and the two-group site switch works.
 */
import { expect, test, type Page } from "@playwright/test";

import { ENGINE_TIMEOUT, PAGES } from "./pages";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
}

for (const scheme of ["light", "dark"] as const) {
  for (const width of [1280, 390]) {
    test.describe(`${scheme} @ ${width}px`, () => {
      test.use({ colorScheme: scheme, viewport: { width, height: 900 } });
      for (const path of PAGES) {
        test(`${path} renders cleanly`, async ({ page }) => {
          const errors = collectErrors(page);
          const res = await page.goto(path);
          expect(res?.status()).toBe(200);
          await expect(page.locator("h1").first()).toBeVisible();
          // chapter animations load (and the engine runs) after the page: wait for every one
          await expect(page.locator("[data-pending-widget]")).toHaveCount(0, {
            timeout: ENGINE_TIMEOUT,
          });
          const overflow = await page.evaluate(() => {
            const el = document.scrollingElement!;
            return el.scrollWidth - el.clientWidth;
          });
          expect(overflow, "horizontal overflow (px)").toBeLessThanOrEqual(0);
          const bg = await page.evaluate(
            () => getComputedStyle(document.body).backgroundColor,
          );
          expect(bg).toBe(
            scheme === "dark" ? "rgb(10, 10, 10)" : "rgb(255, 255, 255)",
          );
          expect(errors).toEqual([]);
        });
      }
    });
  }
}

test("the two-group site switch: a toggle and a row on desktop, a dropdown on phones", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const full = page.locator("[data-site-switch='full']");
  await expect(full).toBeVisible();
  const agents = full.locator("nav[data-site-group='agents']");
  const llm = full.locator("nav[data-site-group='llm']");
  // starts on this site's group
  await expect(agents).toBeVisible();
  await expect(llm).toBeHidden();
  await expect(agents.getByRole("link", { name: "Harnesses" })).toHaveAttribute(
    "href",
    "https://agent-harnesses-explained.vercel.app",
  );
  await expect(agents.getByRole("link", { name: "Protocols" })).toHaveAttribute(
    "href",
    "https://agent-protocols-explained.vercel.app",
  );
  await expect(agents.getByRole("link", { name: "Context" })).toHaveAttribute(
    "href",
    "https://agent-context-explained.vercel.app",
  );
  // this site's own entry stays "(soon)" until it is switched on everywhere (brief 24B2)
  for (const soon of ["Orchestration", "Evals", "Security"]) {
    await expect(agents.getByText(soon)).toBeVisible();
    await expect(agents.getByRole("link", { name: soon })).toHaveCount(0);
  }
  // the toggle shows the other group (CSS only)
  await full.getByText("LLM systems").click();
  await expect(llm).toBeVisible();
  await expect(agents).toBeHidden();
  for (const [name, href] of [
    ["Decoder", "https://transformer-decoder-explained.vercel.app"],
    ["Inference", "https://llm-inference-explained.vercel.app"],
    ["Architectures", "https://llm-architectures-explained.vercel.app"],
    ["Kernels", "https://gpu-kernels-explained.vercel.app"],
    ["Numerics", "https://numerics-explained.vercel.app"],
    ["Silicon", "https://systolic-arrays-explained.vercel.app"],
    ["Trade-offs", "https://inference-tradeoffs-explained.vercel.app"],
    ["Compute in transit", "https://compute-in-transit-results.vercel.app"],
  ] as const)
    await expect(llm.getByRole("link", { name })).toHaveAttribute("href", href);
  // keyboard: the toggle is a pair of radio buttons
  await page.getByRole("radio", { name: "Show the agent sites" }).focus();
  await page.keyboard.press("Space");
  await expect(agents).toBeVisible();

  await page.setViewportSize({ width: 390, height: 800 });
  await expect(full).toBeHidden();
  const compact = page.locator("[data-site-switch='compact']");
  await expect(compact).toBeVisible();
  await compact.locator("summary").click();
  await expect(compact.getByText("LLM systems")).toBeVisible();
  await expect(compact.getByText("Agents", { exact: true })).toBeVisible();
  await expect(compact.getByRole("link", { name: "Kernels" })).toHaveAttribute(
    "href",
    "https://gpu-kernels-explained.vercel.app",
  );
  await expect(
    compact.getByRole("link", { name: "Harnesses" }),
  ).toHaveAttribute("href", "https://agent-harnesses-explained.vercel.app");
  await expect(
    compact.getByRole("link", { name: "Protocols" }),
  ).toHaveAttribute("href", "https://agent-protocols-explained.vercel.app");
  await expect(compact.getByRole("link", { name: "Context" })).toHaveAttribute(
    "href",
    "https://agent-context-explained.vercel.app",
  );
  await expect(
    compact.getByRole("link", { name: "Compute in transit" }),
  ).toHaveAttribute("href", "https://compute-in-transit-results.vercel.app");
  const box = await compact
    .getByRole("link", { name: "Decoder" })
    .boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(
    () =>
      document.scrollingElement!.scrollWidth -
      document.scrollingElement!.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
