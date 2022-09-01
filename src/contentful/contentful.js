import Promise from 'bluebird';
import { readFileSync } from 'fs';
import contentful from 'contentful-management';

const { LOCALE } = process.env;

const accessToken = process.env.CONTENTFUL_API_KEY;
const spaceId = process.env.CONTENTFUL_SPACE_ID;
const env = process.env.CONTENTFUL_ENV;

const client = contentful.createClient({ accessToken });

export const toTags = tags => tags?.split(',').map(tag => ({ sys: { type: 'Link', linkType: 'Tag', id: `area${tag}` }}));

export default async ({ publish = true, update = true, templates } = {}) => {
  const space = await client.getSpace(spaceId);
  const environment = await space.getEnvironment(env);

  const toSys = async (thing, linkType = 'Entry', shouldPublish = publish) => {
    if (shouldPublish) await thing.publish();

    return {
      sys: {
        type: 'Link',
        linkType,
        id: thing.sys.id,
      },
    };
  };

  const createEntry = async (contentType, { entry, tags, find }) => {
    try {
      if (entry === undefined || entry.sys) return entry;

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
      // await sleep(100);

      return toSys(created);
    } catch (e) {
      console.error(e);
    }
  };

  const createAsset = async ({ asset, tags, find }) => {
    try {
      const { title, fileName, contentType } = asset;

      if (find) {
        const existing = await find(asset);
        if (existing) return toSys(existing, 'Asset', false);
      }

      const upload = await environment.createUpload({ file: readFileSync(fileName) });

      const content = {
        fields: {
          title: { [LOCALE]: title },
          file: {
            [LOCALE]: {
              contentType,
              fileName,
              uploadFrom: { 
                sys: { 
                  type: 'Link',
                  linkType: 'Upload',
                  id: upload?.sys.id,
                }
              },
            },
          },
        },
        metadata: { tags: toTags(tags) || [] }
      };

      const created = await environment.createAsset(content);
      const processed = await created.processForAllLocales();

      return toSys(processed, 'Asset', publish);
    } catch (e) {
      console.error(e);
    }
  };

  return { createAsset, createEntry, environment };
};
