import { readFileSync } from 'fs';
import { environment } from './contentful.js';

const { LOCALE } = process.env;

export const getByTitle = async title => {
  const env = await environment();

  const assets = await env.getAssets({ 
    'fields.title': title,
    limit: 1,
    order: '-sys.updatedAt',
  });

  if (assets.items.length) return assets.items[0];
};

export const create = async ({ fields, tags = [] }) => {
  const env = await environment();

  const asset = await getByTitle(fields.title[LOCALE]);
  if (asset) return asset;

  const upload = await env.createUpload({ file: readFileSync(fields.file[LOCALE].fileName) });

  fields.file[LOCALE].uploadFrom = { 
    sys: { 
      type: 'Link',
      linkType: 'Upload',
      id: upload.sys.id,
    },
  };

  const created = await env.createAsset({ fields, metadata: { tags }});
  const processed = await created.processForAllLocales();

  return processed.publish();
};