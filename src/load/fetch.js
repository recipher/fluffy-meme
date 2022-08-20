import login from './login.js';

const HTTPS = 'https://';

const slugify = src => src.split(HTTPS).pop().replace(/\//g, '|');
export const folder = 'tmp/images/';
export const extension = '.png';
export const filename = src => `${folder}${slugify(src)}${extension}`;

export const download = async page => {
  const images = page.locator('section img');
  const count = await images.count();

  for (let i = 0; i < count; ++i) {
    const image = await images.nth(i)
    const src = await image.getAttribute('src');
    const isHidden = await image.isHidden();
    if (!isHidden) await image.screenshot({ path: filename(src) });
  }
};

export default async (page, url) => {
  await login(page);

  const heading = page.locator('h1 strong');
  await heading.waitFor();

  const title = await heading.innerText();
  const sections = page.locator('section');

  const html = [];
  const count = await sections.count();
  for (let i = 1; i < count-1; ++i) {
    html.push(await sections.nth(i).innerHTML());
  }

  await download(page);
 
  return { title, html: `̀<div>${html.join()}</div>` };
};