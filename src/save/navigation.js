import transform from '../transform/navigation.js';
import { create } from '../contentful/entry.js';

export default async (html, options) => {
  const navigation = await transform(html, options);
  // return create(entry);
};