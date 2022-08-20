import { stop } from './browser.js';
import load from './load.js';

export default async (url, options) => {
  await load(url, options);
  await stop();
};