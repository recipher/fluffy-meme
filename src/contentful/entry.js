import contentful from './contentful.js';

export const getByName = async (contentType, name) => {
  const env = (await contentful()).environment;

  const entries = await env.getEntries({ 
    content_type: contentType, 
    'fields.name': name,
    limit: 1,
    order: '-sys.updatedAt',
  });

  if (entries.items.length) return entries.items[0];
};

export const update = async ({ id, fields, metadata }) => {
  const env = (await contentful()).environment;

  const entry = await env.getEntry(id);
  entry.fields = fields;
  entry.metadata = metadata;

  const updated = await entry.update();
  return updated.publish();
};

export const create = async (contentType, { entry, tags }, { templates }) => {
  const env = await contentful({ publish: false, templates });

  const existing = await getByName(contentType, entry.name);
  if (existing) return existing;
  // if (entry) return update({ id: entry.sys.id, fields, metadata: { tags }});

  return env.createEntry(contentType, entry, tags);
};