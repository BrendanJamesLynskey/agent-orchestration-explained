/**
 * Every animation plays, pauses, steps, scrubs, resets and answers the keyboard, with no
 * console errors, in light and dark mode at 1280 and 390 px (visual standard §4).
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

import { ANIMATIONS, ENGINE_TIMEOUT } from "./pages";

async function step(fig: Locator): Promise<number> {
  return Number(await fig.getAttribute("data-step"));
}

async function pause(fig: Locator): Promise<void> {
  if ((await fig.getAttribute("data-playing")) === "true")
    await fig.getByTestId("play").click();
  await expect(fig).toHaveAttribute("data-playing", "false");
}

function errors(page: Page): string[] {
  const out: string[] = [];
  page.on("pageerror", (e) => out.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") out.push(`console: ${m.text()}`);
  });
  return out;
}

for (const scheme of ["light", "dark"] as const) {
  for (const width of [1280, 390]) {
    test.describe(`${scheme} @ ${width}px`, () => {
      test.use({ colorScheme: scheme, viewport: { width, height: 900 } });
      for (const [path, id] of ANIMATIONS) {
        test(`${id} plays, steps, scrubs and resets`, async ({ page }) => {
          const errs = errors(page);
          await page.goto(path);
          const fig = page.getByTestId(id);
          await expect(fig).toBeVisible({ timeout: ENGINE_TIMEOUT });
          await fig.scrollIntoViewIfNeeded();
          await pause(fig);
          await fig
            .getByRole("button", { name: "Reset to the first step" })
            .click();
          expect(await step(fig)).toBe(0);
          await fig.getByTestId("play").click();
          await expect(fig).toHaveAttribute("data-playing", "true");
          await expect
            .poll(() => step(fig), { timeout: 8000 })
            .toBeGreaterThan(0);
          await pause(fig);
          const s0 = await step(fig);
          const scrub = fig.getByTestId("scrub");
          const max = Number(await scrub.getAttribute("max"));
          if (s0 >= max)
            await fig.getByRole("button", { name: "Step back" }).click();
          const s1 = await step(fig);
          await fig.getByRole("button", { name: "Step forward" }).click();
          expect(await step(fig)).toBe(s1 + 1);
          await fig.getByRole("button", { name: "Step back" }).click();
          expect(await step(fig)).toBe(s1);
          const before = await fig.getByTestId("caption").textContent();
          await scrub.fill(String(max));
          expect(await step(fig)).toBe(max);
          await expect(fig.getByTestId("caption")).not.toHaveText(before ?? "");
          await fig.focus();
          await page.keyboard.press("ArrowLeft");
          expect(await step(fig)).toBe(max - 1);
          await page.keyboard.press("Home");
          expect(await step(fig)).toBe(0);
          await page.keyboard.press("ArrowRight");
          expect(await step(fig)).toBe(1);
          await page.keyboard.press(" ");
          await expect(fig).toHaveAttribute("data-playing", "true");
          await page.keyboard.press(" ");
          await expect(fig).toHaveAttribute("data-playing", "false");
          await fig.getByLabel("Speed").selectOption("4");
          await fig
            .getByRole("button", { name: "Reset to the first step" })
            .click();
          expect(await step(fig)).toBe(0);
          // every parameter choice re-runs the animation from the start
          for (const radio of await fig.getByRole("radio").all()) {
            if ((await radio.getAttribute("aria-checked")) === "true") continue;
            const key = await fig.getAttribute("data-key");
            await radio.click();
            await expect(fig).not.toHaveAttribute("data-key", key ?? "");
            await expect(fig.getByTestId("caption")).not.toBeEmpty();
          }
          for (const sel of await fig.getByRole("combobox").all()) {
            if ((await sel.locator("xpath=ancestor::label").count()) > 0)
              continue;
            const values = await sel
              .locator("option")
              .evaluateAll((os) =>
                os.map((o) => (o as HTMLOptionElement).value),
              );
            for (const v of values.slice(1)) {
              const key = await fig.getAttribute("data-key");
              await sel.selectOption(v);
              await expect(fig).not.toHaveAttribute("data-key", key ?? "");
              await expect(fig.getByTestId("caption")).not.toBeEmpty();
            }
          }
          for (const slider of await fig.getByRole("slider").all()) {
            if ((await slider.getAttribute("data-testid")) === "scrub")
              continue;
            const min = Number(await slider.getAttribute("min"));
            const key = await fig.getAttribute("data-key");
            await slider.fill(String(min));
            await expect(fig).not.toHaveAttribute("data-key", key ?? "");
          }
          const box = await fig.getByTestId("play").boundingBox();
          expect(box!.height).toBeGreaterThanOrEqual(44);
          if (width === 390)
            for (const r of await fig.getByRole("radio").all())
              expect((await r.boundingBox())!.height).toBeGreaterThanOrEqual(
                44,
              );
          const overflow = await page.evaluate(
            () =>
              document.scrollingElement!.scrollWidth -
              document.scrollingElement!.clientWidth,
          );
          expect(overflow).toBeLessThanOrEqual(0);
          expect(errs).toEqual([]);
        });
      }
    });
  }
}

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  for (const [path, id] of ANIMATIONS) {
    test(`${id} does not play by itself`, async ({ page }) => {
      await page.goto(path);
      const fig = page.getByTestId(id);
      await expect(fig).toBeVisible({ timeout: ENGINE_TIMEOUT });
      await fig.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2500);
      await expect(fig).toHaveAttribute("data-playing", "false");
      expect(await step(fig)).toBe(0);
      await fig.getByRole("button", { name: "Step forward" }).click();
      expect(await step(fig)).toBe(1);
    });
  }
});

test("animations play when scrolled into view and pause when scrolled away", async ({
  page,
}) => {
  await page.goto("/learn/01-from-a-chain-to-a-graph");
  const fig = page.getByTestId("graph-widget");
  await expect(fig).toBeVisible({ timeout: ENGINE_TIMEOUT });
  await fig.scrollIntoViewIfNeeded();
  await expect(fig).toHaveAttribute("data-playing", "true");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(fig).toHaveAttribute("data-playing", "false");
});

test("touching the scrub bar pauses, even on the step already shown", async ({
  page,
}) => {
  await page.goto("/learn/01-from-a-chain-to-a-graph");
  const fig = page.getByTestId("graph-widget");
  await expect(fig).toBeVisible({ timeout: ENGINE_TIMEOUT });
  await fig.scrollIntoViewIfNeeded();
  await expect(fig).toHaveAttribute("data-playing", "true");
  const before = await step(fig);
  await fig.getByTestId("scrub").dispatchEvent("pointerdown");
  await expect(fig).toHaveAttribute("data-playing", "false");
  expect(await step(fig)).toBeGreaterThanOrEqual(before);
});

test.describe("phone labels", () => {
  test.use({ viewport: { width: 390, height: 900 } });
  for (const [path, id] of ANIMATIONS) {
    test(`${id}: every label is at least 11 px on a 390 px screen`, async ({
      page,
    }) => {
      await page.goto(path);
      const fig = page.getByTestId(id);
      await expect(fig).toBeVisible({ timeout: ENGINE_TIMEOUT });
      await fig.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const sizes = await fig.evaluate((el) =>
        [...el.querySelectorAll("svg text")]
          .filter((t) => (t.textContent ?? "").trim().length > 0)
          .map((t) => {
            const css = parseFloat(getComputedStyle(t).fontSize);
            const ctm = (t as SVGGraphicsElement).getScreenCTM();
            const k = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
            return { text: t.textContent, px: css * k };
          }),
      );
      expect(sizes.filter((s) => s.px < 10.95)).toEqual([]);
    });
  }
});

test("hovering an equation term highlights what it stands for in the picture", async ({
  page,
}) => {
  await page.goto("/learn/01-from-a-chain-to-a-graph");
  const fig = page.getByTestId("graph-widget");
  await expect(fig).toBeVisible({ timeout: ENGINE_TIMEOUT });
  await fig.getByRole("button", { name: "Reset to the first step" }).click();
  await fig.locator(".eq-panel .hl-max").first().hover();
  await expect(fig.locator(".eq-panel")).toHaveAttribute("data-hl", "max");
  await expect(fig.locator('[data-strip-step][data-focus="true"]')).toHaveCount(
    1,
  );
  await fig.locator(".eq-panel .hl-ckpt").first().hover();
  await expect(fig.locator(".eq-panel")).toHaveAttribute("data-hl", "ckpt");
  await expect(fig.locator('[data-strip-step][data-focus="true"]')).toHaveCount(
    0,
  );
});
