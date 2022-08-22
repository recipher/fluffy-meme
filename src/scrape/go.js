import { browse, stop } from './browser.js';
import login from './login.js';
import load from './load.js';

export const storageState = 'tmp/state.json';

export default async (url, { domain, root, headless, ...rest }) => {
  const { browser, context } = await browse(headless);

  const page = await context.newPage();
  await page.goto(`${domain}${root}${url}`);

  await login(page);

  await context.storageState({ path: storageState });
  await context.close();

  await load(url, { browser, domain, root, headless, storageState, ...rest });
  await stop();
};