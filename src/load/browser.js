import { webkit } from 'playwright';

let browser = undefined;

export const browse = async headless => {
  if (browser === undefined)
    browser = await webkit.launch({ headless });

  return browser;
};

export const stop = async _ => browser?.close();

