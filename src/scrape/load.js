import fetch from './fetch.js';
import saveNavigation from '../save/navigation.js';
import saveEntry from '../save/entry.js';
import saveZone from '../save/zone.js';
import login from './login.js';
import retry from './retry.js';

const entries = {};
const zones = {};

export default async (url, { page, domain, root, storageState, navigate, ...rest }) => {
  const options = { page, domain, root, storageState, ...rest, url };

  if (entries[url] !== undefined) return entries[url];

  // const context = await browser.newContext({ storageState });

  const go = _ => {
    return async _ => {
      console.log(url);

      // const page = await context.newPage();
      await page.goto(`${domain}${root}${url}?authuser=1`);
    
      // await login(page); // TMP
      return page;
    };
  };
  
  await retry(go(), 5);

  const { title, name, html } = await fetch(page, url);
  // await context.close();

  let zone;
  if (zones[name] === undefined) {
    zone = await saveZone(name, options);
    zones[name] = zone;
    if (navigate) await saveNavigation(html.navigation, zone, options);
  } else zone = zones[name];

  try {
    let entry = await saveEntry(title, html.body, zone, options);
    if (entry === undefined) entry = saveEntry(title, undefined, zone, options); // Save without the body if it fails
    entries[url] = entry;
    return entry;
  } catch(e) {
    throw e;
  }
};