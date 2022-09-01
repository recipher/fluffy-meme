import R from 'ramda';
import Promise from 'bluebird';
import parse from 'html-dom-parser';
import { titleify } from './helpers/slugify.js';
import sanitize from './helpers/sanitize.js';
import { exclude, fix, follow, paragraph } from './article.js';
import { determineSiteUrl } from './navigation.js';

const toContent = async ({ type, name, data, attribs }, content, options) => {
  const toText = _ => ({ data: {}, marks: [], value: data, nodeType: type });

  const toLink = async _ => {
    if (!content.length) return content;

    const uri = sanitize(R.propOr('', 'href', attribs));

    if (uri.startsWith(options.root) || uri.startsWith(options.domain)) {
      const { url, root } = determineSiteUrl(uri, options);
      // Can't self-reference
      if (url !== options.url && exclude(url) === false) 
        return follow(url, content, { ...options, root });
    }

    if (uri.startsWith('#')) return { data: {}, content, nodeType: 'paragraph' };

    return { data: { uri }, content, nodeType: 'hyperlink' };
  };

  if (type === 'text') return toText();
  if (name === 'a') {
    const link = await toLink();
    return paragraph([ link ], 'paragraph');
  }

  return content;
};

const toRichText = async (dom, options) => {
  let navigation = [];

  await Promise.each(dom, async element => {
    let content = [];
    const { children } = element;
    if (children) content = await toRichText(children, options);

    const data = await toContent(element, content, options);

    navigation = R.type(data) === 'Array' 
      ? R.concat(navigation, data) 
      : R.append(data, navigation);
  });

  return navigation;
};

export default async (title, html, zone, options) => {
  const content = await toRichText(parse(html), options);

  if (options.debug) console.log(JSON.stringify(content, null, 2));

  return {
    name: titleify(options.url),
    title,
    summary: title,
    zone: { 
      sys: {
        type: 'Link',
        linkType: 'Entry',
        id: zone.sys.id,
      },
    },
    contents: {
      data: {},
      content: fix(content),
      nodeType: 'document',
    }
  };
};

