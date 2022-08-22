import parse from '../parse/navigation.js';
import { create } from '../contentful/entry.js';

export default async (html, options) => {
  const navigation = await parse(html, options);
  // return create(entry);
};