import slugify from 'slugify';

export default text => slugify(text, { lower: true, strict: true });

export const titleify = url =>
  url
    .replace(/\//g, '-')
    .replace(/knowledge-zone-/, '')
    .slice(1)
    .toLowerCase();
