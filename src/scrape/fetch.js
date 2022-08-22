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

export default async page => {
  const main = page.locator('div[role="main"]');
  const nav = page.locator('nav ul[role="navigation"]');
  const heading = main.locator('h1 >> nth=0');

  await main.waitFor();

  const body = await main.innerHTML();
  const navigation = await nav.innerHTML();
  const title = await heading.innerText();

  await download(page);
 
  return { 
    title,
    html: { 
      body: `<div>${body}</div>`,
      navigation: `<nav>${navigation}</nav>`,
    } 
  };
};