import fetch from './fetch.js';
import save from '../save/save.js';

export default async (url, { browser, domain, root, storageState, ...rest }) => {
  const context = await browser.newContext({ storageState });

  const page = await context.newPage();
  await page.goto(`${domain}${root}${url}`);

  const { title, html } = await fetch(page, url);
  console.log(title, html)
  return save(title, html.body, { browser, domain, root, storageState, ...rest, url });
};