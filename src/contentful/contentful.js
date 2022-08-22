import Promise from 'bluebird';
import contentful from 'contentful-management';

const { LOCALE } = process.env;

const accessToken = process.env.CONTENTFUL_API_KEY;
const spaceId = process.env.CONTENTFUL_SPACE_ID;
const env = process.env.CONTENTFUL_ENV;

const client = contentful.createClient({ accessToken });

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export const toTags = tags => tags?.split(',').map(tag => ({ sys: { type: 'Link', linkType: 'Tag', id: `area${tag}` }}));

export default async ({ publish = true, update = true, templates }= {}) => {
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(env);

  const toSys = async entry => {
    if (publish) await entry.publish();

    return {
      sys: {
        type: 'Link',
        linkType: 'Entry',
        id: entry.sys.id,
      },
    };
  };

  const createEntry = async (contentType, { entry, tags, find }) => {
    try {
      const content = {
        fields: await Promise.reduce(Object.entries(templates[contentType]), async (acc, [ key, value ]) => ({
          ...acc,
          [key]: {
            [LOCALE]:
              typeof value === 'function'
                ? await (value)(entry, { createEntry, createAsset, environment })
                : entry[value],
          },
        })
        , {}),
        metadata: { tags: toTags(tags) || [] },
      };

      if (find) {
        const existing = await find(contentType, entry, { environment });
        if (existing) {
          if (update) {
            existing.fields = content.fields;
            existing.metadata = content.metadata;
          
            const updated = await existing.update();
            return toSys(updated);
          } else 
            return toSys(existing);
        }
      }

      const created = await environment.createEntry(contentType, content);
      // await delay(100);

      return toSys(created);
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
