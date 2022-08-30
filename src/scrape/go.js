import { browse, stop } from './browser.js';
import login from './login.js';
import load from './load.js';

export const storageState = 'tmp/state.json';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export default async (url, { domain, root, headless, ...rest }) => {
  const { browser, context } = await browse(headless);

  const page = await context.newPage();
  await page.goto(`${domain}${root}${url}?authuser=1`);

  await login(page);
  await delay(3000);

  // await context.storageState({ path: storageState });
  // await context.close();

  await load(url, { page, domain, root, headless, ...rest });
  await stop();
};