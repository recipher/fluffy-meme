import contentful from './contentful.js';

const { PUBLISH } = process.env;

export const byTitle = async asset => {
  const env = (await contentful()).environment;

  const assets = await env.getAssets({ 
    'fields.title': asset.title,
    limit: 1,
    order: '-sys.updatedAt',
  });

  if (assets.items.length) return assets.items[0];
};

export const create = async ({ asset, tags }, { find = byTitle } = {}) => {
  const env = await contentful({ publish: PUBLISH });

  return env.createAsset({ asset, tags, find });
};
