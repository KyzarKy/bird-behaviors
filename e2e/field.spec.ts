// The field view end to end on a phone: the settings drawer, scenes, birds, every behavior, Auto and Close-up,
// with an accessibility check and no console errors allowed.
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/** Fails on any WCAG 2.2 A or AA violation axe can detect on the page as it is now. */
async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
}

const errors: string[] = [];
test.beforeEach(({ page }) => {
  errors.length = 0;
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
});
test.afterEach(() => expect(errors).toEqual([]));

const behaviorButtons = (page: Page) => page.getByRole('region', { name: 'Behaviors' }).getByRole('button');

test('switch scene and bird, then run every behavior, Auto and Close-up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);

  // On a phone the scene and settings sit in a drawer, closed at first.
  const drawer = page.getByRole('button', { name: /Scene and settings/ });
  await expect(page.getByLabel('Scene', { exact: true })).toBeHidden();
  await drawer.click();
  await expect(drawer).toHaveAttribute('aria-expanded', 'true');
  await page.getByLabel('Scene', { exact: true }).selectOption('beach');
  await page.getByRole('combobox', { name: 'Species' }).fill('Osprey');
  await page.getByRole('option', { name: 'Osprey' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Osprey');

  const cue = page.locator('p[aria-live]');
  let ran = 0;
  for (const button of await behaviorButtons(page).all()) {
    if ((await button.getAttribute('aria-disabled')) === 'true') continue;
    const label = (await button.textContent())!;
    await button.click();
    await expect(cue).toContainText(label);
    ran++;
  }
  expect(ran).toBeGreaterThan(3);

  // A new bird starts with the drawer closed again.
  await drawer.click();
  const closeUp = page.getByLabel('Close-up', { exact: true });
  await closeUp.setChecked(!(await closeUp.isChecked()));
  await page.getByLabel('Auto', { exact: true }).check();
  // Left to itself the bird starts something within a 4 s pause plus the running behavior.
  await expect(behaviorButtons(page).and(page.locator('[aria-pressed="true"]'))).toHaveCount(1, { timeout: 15_000 });
  await expectNoAxeViolations(page);
});

test('a behavior the scene cannot support is disabled and does nothing', async ({ page }) => {
  await page.goto('/#/field/pandion-haliaetus/yard');
  const dive = behaviorButtons(page).filter({ hasText: 'Hover and plunge' });
  await expect(dive).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('Needs open water').first()).toBeVisible();

  const cue = page.locator('p[aria-live]');
  const before = await cue.textContent();
  // Playwright will not click an aria-disabled button on its own; a person still can.
  await dive.click({ force: true });
  await expect(dive).toHaveAttribute('aria-pressed', 'false');
  await expect(cue).toHaveText(before!);
});

test('Flock fills the stage and locks Auto and Close-up; a one-bird behavior ends it, a flock behavior brings it back', async ({ page }) => {
  await page.goto('/#/field/callipepla-californica');
  await page.getByRole('button', { name: /Scene and settings/ }).click();
  const flock = page.getByLabel('Flock', { exact: true });
  const auto = page.getByLabel('Auto', { exact: true });
  const closeUp = page.getByLabel('Close-up', { exact: true });
  await flock.check();
  await expect(auto).toBeChecked();
  await expect(auto).toBeDisabled();
  await expect(closeUp).toBeDisabled();
  await expectNoAxeViolations(page);

  await behaviorButtons(page).filter({ hasText: 'Preen and stretch' }).click();
  await expect(flock).not.toBeChecked();
  await expect(auto).not.toBeChecked();
  await expect(auto).toBeEnabled();

  await behaviorButtons(page).filter({ hasText: 'Fly off together' }).click();
  await expect(flock).toBeChecked();
});
