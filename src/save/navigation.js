import Promise from 'bluebird';
import parse from '../parse/navigation.js';
import { create } from '../contentful/entry.js';

const templates = {
  navigation: {
    name: 'name',
    title: 'title',
    entry: (navigation, { createEntry }) => createEntry('link', navigation.entry),
    links: (navigation, { createEntry }) =>
      Promise.map(navigation.links, async ({ contentType, ...data }) => createEntry(contentType, data))
  },
  link: {
    name: 'name',
    url: 'url',
    text: 'text',
  },
};

export default async (html, options) => {
  const entry = await parse(html, options);
  return create('navigation', { entry, tags: options.tags }, { templates });
};