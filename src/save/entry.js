import parse from '../parse/parse.js';
import { create, byName } from '../contentful/entry.js';

const templates = {
  article: {
    name: 'name',
    title: 'title',
    contents: 'contents',
    zone: (article, { createEntry }) => createEntry('zone', { entry: article.zone, find: byName }),
  },
};

export default async (title, html, zone, options) => {
  const entry = await parse(title, html, zone, options);
  return create('article', { entry, tags: options.tags }, { templates, find: byName });
};