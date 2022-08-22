import Promise from 'bluebird';
import parse from '../parse/navigation.js';
import { create, byName } from '../contentful/entry.js';

const type = entry => entry.links === undefined ? 'link' : 'navigation';

const templates = {
  navigation: {
    name: 'name',
    entry: (navigation, { createEntry }) => createEntry('link', { entry: navigation.entry, find: byName }),
    links: (navigation, { createEntry }) =>
      Promise.mapSeries(navigation.links, async entry => createEntry(type(entry), { entry, find: byName }))
  },
  link: {
    name: 'name',
    url: 'url',
    text: 'text',
  },
};

export default async (html, options) => {
  const entry = await parse(html, options);
  return create('navigation', { entry, tags: options.tags }, { templates, find: byName });
};