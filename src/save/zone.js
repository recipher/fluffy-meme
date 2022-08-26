import slugify from '../parse/helpers/slugify.js';
import { create, get, byName } from '../contentful/entry.js';

const templates = {
  zone: {
    name: 'name',
    title: 'title',
  },
};

export default async name => {
  const { sys } = await create('zone', { entry: { name: slugify(name), title: name }}, { templates, find: byName });
  return get(sys.id);
};