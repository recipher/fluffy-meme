import { environment } from './contentful.js';

const LOCALE = process.env.LOCALE;

export const getByName = async (contentType, name) => {
  const env = await environment();

  const entries = await env.getEntries({ 
    content_type: contentType, 
    'fields.name': name,
    limit: 1,
    order: '-sys.updatedAt',
  });

  if (entries.items.length) return entries.items[0];
};

export const update = async ({ id, fields, metadata }) => {
  const env = await environment();

  const entry = await env.getEntry(id);
  entry.fields = fields;
  entry.metadata = metadata;

  return entry.update();
};

export const create = async ({ contentType, fields, tags = [] }) => {
  const env = await environment();

  const entry = await getByName(contentType, fields.name[LOCALE]);
  if (entry) return update({ id: entry.sys.id, fields, metadata: { tags }});
  
  const created = await env.createEntry(contentType, { fields, metadata: { tags }});
  return created.publish();
};