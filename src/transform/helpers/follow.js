import load from '../../scrape/load.js';

export default async (url, content, options) => {
  const id = await load(url, options);

  return {
    data: {
      target: {
        sys: {
          id,
          type: 'Link',
          linkType: 'Entry',
        }
      }
    },
    content,
    nodeType: 'entry-hyperlink'
  };
};