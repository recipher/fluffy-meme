import fetch from './fetch.js';
import saveNavigation from '../save/navigation.js';
import saveEntry from '../save/entry.js';
import saveZone from '../save/zone.js';
import login from './login.js';
import retry from './retry.js';

const entries = {};
const zones = {};

export default async (url, { page, domain, root, navigate, ...rest }) => {
  const options = { page, domain, root, navigate, ...rest, url };

  if (entries[url] !== undefined) return entries[url];

  const go = _ => {
    return async _ => {
      console.log(url);
      await page.goto(`${domain}${root}${url}?authuser=1`);
      return page;
    };
  };
  
  await retry(go(), 5);

  const { title, name, html } = await fetch(page, url);

  if (title === undefined) return;

  let zone;
  if (zones[name] === undefined) {
    zone = await saveZone(name, options);
    zones[name] = zone;
    if (navigate) await saveNavigation(html.navigation, zone, options);
  } else zone = zones[name];

  try {
    let entry = await saveEntry(title, html.body, zone, options);
    if (entry === undefined) {
      entry = await saveEntry(title, html.body, zone, { parser: 'links', ...options }); // Try the links parser
      if (entry === undefined) entry = saveEntry(title, undefined, zone, options); // Save without the body if it fails again
    }
    entries[url] = entry;
    return entry;
  } catch(e) {
    throw e;
  }
};