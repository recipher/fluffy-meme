import contentful from './contentful.js';

const { PUBLISH } = process.env;

export const byName = async (contentType, entry, { environment }) => {
  const entries = await environment.getEntries({ 
    content_type: contentType, 
    'fields.name': entry.name,
    limit: 1,
    order: '-sys.updatedAt',
  });

  if (entries.items.length) return entries.items[0];
};

export const create = async (contentType, { entry, tags }, { templates, find = byName }) => {
  const env = await contentful({ publish: PUBLISH, update: true, templates });

  return env.createEntry(contentType, { entry, tags, find });
};