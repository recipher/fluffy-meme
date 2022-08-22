import fetch from './fetch.js';
import saveNavigation from '../save/navigation.js';
import saveEntry from '../save/entry.js';

const cache = {};

export default async (url, { browser, domain, root, storageState, navigate, ...rest }) => {
  if (cache[url] !== undefined) return cache[url];

  const context = await browser.newContext({ storageState });

  const page = await context.newPage();
  await page.goto(`${domain}${root}${url}`);

  const { title, html } = await fetch(page, url);

  if (navigate)
    await saveNavigation(html.navigation, { browser, domain, root, storageState, ...rest, url });

  const entry = await saveEntry(title, html.body, { browser, domain, root, storageState, ...rest, url });
  cache[url] = entry.sys.id;
  return entry.sys.id;
};