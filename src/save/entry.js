import parse from '../parse/parse.js';
import { create } from '../contentful/entry.js';

const templates = {
  article: {
    name: 'name',
    title: 'title',
    contents: 'contents',
  },
};

export default async (title, html, options) => {
  const entry = await parse(title, html, options);
  return create('article', { entry, tags: options.tags }, { templates });
};