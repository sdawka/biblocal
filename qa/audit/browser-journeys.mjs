import assert from 'node:assert/strict';

// Run with an already-connected Browser skill tab; never opens another browser.
// Requires the isolated local QA fixture described in report.md.
export async function runAuditJourneys({ tab, viewport, baseUrl }) {
  const origin = new URL(baseUrl);
  assert(['127.0.0.1', 'localhost'].includes(origin.hostname), 'Local QA only');
  const results = [];
  async function check(name, work) {
    try { await work(); results.push({ name, status: 'passed' }); }
    catch (error) { results.push({ name, status: 'failed', error: String(error) }); }
  }
  await viewport.set({ width: 390, height: 844 });
  await check('Manual book creation survives a document reload', async () => {
    await tab.goto(`${baseUrl}/biblio`);
    const add = tab.playwright.getByRole('button', { name: 'Add a book', exact: true });
    await add.waitFor({ state: 'visible' });
    await add.click();
    await tab.playwright.getByRole('button', { name: 'Manual Entry', exact: true }).click();
    const title = `Audit browser persistence ${Date.now()}`;
    await tab.playwright.getByRole('textbox', { name: 'Book title', exact: true }).fill(title);
    await tab.playwright.getByRole('textbox', { name: 'Author name', exact: true }).fill('Audit Reader');
    await tab.playwright.getByRole('button', { name: 'Preview Book', exact: true }).click();
    await tab.playwright.getByRole('button', { name: 'Add to Shelf', exact: true }).click();
    await tab.playwright.getByRole('button', { name: `View details for ${title}`, exact: true }).waitFor({ state: 'visible' });
    await tab.reload();
    await tab.playwright.getByRole('button', { name: `View details for ${title}`, exact: true }).waitFor({ state: 'visible' });
  });
  await check('CSV upload has a keyboard-reachable control', async () => {
    await tab.goto(`${baseUrl}/biblio`);
    await tab.playwright.getByRole('button', { name: 'Import from Goodreads', exact: true }).waitFor({ state: 'visible' });
    await tab.playwright.waitForTimeout(900);
    await tab.playwright.getByRole('button', { name: 'Import from Goodreads', exact: true }).click();
    await tab.playwright.getByText('Choose CSV File', { exact: true }).waitFor({ state: 'visible' });
    // Exercise the keyboard from the import tab, not a CSS-only approximation.
    let reachable = false;
    for (let index = 0; index < 30; index += 1) {
      await tab.ax.pressKey('Tab');
      reachable = await tab.playwright.evaluate(() => {
        const active = document.activeElement;
        return Boolean(active?.closest('.import-container') && (
          active.matches('input[type="file"]') ||
          (active.matches('button, [role="button"]') && /choose csv file/i.test(active.textContent))
        ));
      });
      if (reachable) break;
    }
    assert.equal(reachable, true, 'CSV input is display:none and its visible label has no keyboard control');
  });
  for (const locale of ['en', 'fr', 'es']) {
    await check(`${locale} landing hero text and controls fit at 390px`, async () => {
      await tab.goto(`${baseUrl}/${locale === 'en' ? '' : locale}`);
      await tab.playwright.getByRole('region', { name: 'biblocal', exact: true }).waitFor({ state: 'visible' });
      const clipped = await tab.playwright.evaluate(() => {
        const paragraphs = [...document.querySelectorAll('section[aria-label="biblocal"] p, section[aria-label="biblocal"] h1, section[aria-label="biblocal"] a, section[aria-label="biblocal"] button')];
        if (!paragraphs.length) throw new Error('Hero has not rendered');
        return paragraphs.map(p => ({
          text: p.textContent.trim(), right: p.getBoundingClientRect().right,
          left: p.getBoundingClientRect().left,
        })).filter(p => p.right > document.documentElement.clientWidth + 1 || p.left < -1);
      });
      assert.equal(clipped.length, 0, `Hero paragraphs extend outside the viewport: ${JSON.stringify(clipped)}`);
    });
  }
  if (results.some(result => result.status === 'failed')) {
    const error = new Error('Browser audit regressions failed');
    error.results = results;
    throw error;
  }
  return results;
}
