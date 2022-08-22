import slugify from 'slugify';

export default text => slugify(text, { lower: true, strict: true });

export const titleify = url => {
  return url.replace(/\//g, '-').slice(1).toLowerCase();
};