import { firefox } from 'playwright';

let browser = undefined;
let context = undefined;

export const browse = async headless => {
  if (browser === undefined) {
    browser = await firefox.launch({ headless });
    context = await browser.newContext();
  }

  return { browser, context };
};

export const stop = async _ => browser?.close();

