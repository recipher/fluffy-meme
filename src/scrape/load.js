import fetch from './fetch.js';
import saveNavigation from '../save/navigation.js';
import saveEntry from '../save/entry.js';
import login from './login.js';
import retry from './retry.js';

const cache = {};

export default async (url, { browser, domain, root, storageState, navigate, ...rest }) => {
  const options = { browser, domain, root, storageState, ...rest, url };

  if (cache[url] !== undefined) return cache[url];

  const context = await browser.newContext({ storageState });

  const go = context => {
    return async _ => {
      console.log(url);

      const page = await context.newPage();
      await page.goto(`${domain}${root}${url}`);
    
      await login(page); // TMP
      return page;
    };
  };
  
  const page = await retry(go(context), 5);

  const { title, html } = await fetch(page, url);
  await context.close();

  if (navigate)
    await saveNavigation(html.navigation, options);

  try {
    let entry = await saveEntry(title, html.body, options);
    if (entry === undefined) entry = saveEntry(title, undefined, options); // Save without the body if it fails
    cache[url] = entry;
    return entry;
  } catch(e) {
    throw e;
  }
};