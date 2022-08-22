import Promise from 'bluebird';
import contentful from 'contentful-management';

const { LOCALE } = process.env;

const accessToken = process.env.CONTENTFUL_API_KEY;
const spaceId = process.env.CONTENTFUL_SPACE_ID;
const env = process.env.CONTENTFUL_ENV;

const client = contentful.createClient({ accessToken });

export const toTags = tags => tags?.split(',').map(tag => ({ sys: { type: 'Link', linkType: 'Tag', id: `area${tag}` }}));

export default async ({ publish = true, templates }= {}) => {
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(env);

  const createEntry = async (contentType, data, tags) => {
    try {
      const content = {
        fields: await Promise.reduce(Object.entries(templates[contentType]), async (acc, [ key, value ]) => ({
          ...acc,
          [key]: {
            [LOCALE]:
              typeof value === 'function'
                ? await (value)(data, {
                    createEntry,
                    createAsset,
                    environment,
                  })
                : data[value],
          },
        })
        , {}),
        metadata: { tags: toTags(tags) || [] },
      };

      const entry = await environment.createEntry(contentType, content);

      if (publish) await entry.publish();

      return {
        sys: {
          type: 'Link',
          linkType: 'Entry',
          id: entry.sys.id,
        },
      };
    } catch (e) {
      console.error(e);
    }
  };

  const createAsset = async ({ name, type, url }) => {
    try {
      const content = {
        fields: {
          title: { [LOCALE]: name },
          file: {
            [LOCALE]: {
              contentType: type,
              fileName: name,
              upload: url,
            },
          },
        },
      };

      const asset = await environment.createAsset(content);
      await asset.processForAllLocales();

      if (publish) await asset.publish();

      return {
        sys: {
          type: 'Link',
          linkType: 'Asset',
          id: asset.sys.id,
        },
      };
    } catch (e) {
      console.error(e);
    }
  };

  return { createAsset, createEntry, environment };
};
