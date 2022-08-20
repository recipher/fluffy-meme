import { browse } from './browser.js';
import fetch from './fetch.js';
import save from '../save/save.js';

export default async (url, { domain, root, headless, ...rest }) => {
  const browser = await browse(headless);
  const page = await browser.newPage();
  await page.goto(`${domain}${root}${url}`);

  const { title, html } = await fetch(page, url);
  return save(title, html, { domain, root, url, headless, ...rest });
};