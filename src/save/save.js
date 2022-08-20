import transform from '../transform/article.js';
import { create } from '../contentful/entry.js';

export default async (title, html, options) => {
  const entry = await transform(title, html, options);
  return create(entry);
};