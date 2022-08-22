import parse from '../parse/parse.js';
import { create } from '../contentful/entry.js';

export default async (title, html, options) => {
  const entry = await parse(title, html, options);
  return create(entry);
};