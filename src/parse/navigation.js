import R from 'ramda';
import Promise from 'bluebird';
import parse from 'html-dom-parser';
import slugify from './helpers/slugify.js';
import sanitize from './helpers/sanitize.js';
import load from '../scrape/load.js';

const mapIndexed = R.addIndex(R.map);
const compact = R.filter(R.identity);

const NAVIGATION = 'navigation';
const LINK = 'link';

const toContent = async ({ type, name, data, attribs }, content, options) => {
  const toLink = async _ => {
    if (!content.length) return content;

    const url = sanitize(R.propOr('', 'href', attribs));
    const text = content[0];

    if (url.startsWith(options.root)) {
      const entry = await load(url.split(options.root).pop(), options);
      return { text, ...entry, contentType: LINK };
    }

    return { url, text, contentType: LINK };
  };

  const toList = _ => ({ links: content, contentType: NAVIGATION });

  if (type === 'text') return data;
  if (name === 'ul') return toList();
  if (name === 'a') return toLink();

  return content;
};

const reformat = navigation => {
  const nested = mapIndexed((item, ix) => {
    const { contentType } = item;
    if (contentType === LINK) {
      if (navigation[ix+1]?.contentType === NAVIGATION)
        return { ...item, contentType: NAVIGATION, links: reformat(navigation[ix+1].links) };
      return item;
    } else if (contentType === NAVIGATION) {
      if (navigation[ix-1] === undefined) return { ...item, links: reformat(item.links) };
      if (navigation[ix-1]?.contentType !== LINK) return item;
    }
  }, navigation);

  return compact(nested);
};

const setNames = (navigation, ancestry = 'kz') => {
  if (navigation === undefined) return;
  return R.map(({ links, contentType, ...item }) => {
    const name = item.text ? [ ancestry, slugify(item.text) ].join('-') : ancestry;

    const toItem = ({ sys, ...item }) => sys ? { sys } : { ...item, name };

    return contentType !== NAVIGATION 
      ? toItem(item)
      : { name, entry: toItem(item), links: setNames(links, name) };
  }, navigation);
};

const toData = async (dom, options) => {
  let navigation = [];

  await Promise.each(dom, async element => {
    let content = [];
    const { children } = element;
    if (children) content = await toData(children, options);

    const data = await toContent(element, content, options);

    navigation = R.type(data) === 'Array' 
      ? R.concat(navigation, data) 
      : R.append(data, navigation);
  });

  return navigation;
};

export default async (html, options) => {
  const data = await toData(parse(html), options);
  const navigation = setNames(reformat(data));

  if (options.debug) console.log(JSON.stringify(navigation, null, 2));

  return {
    name: 'kz',
    entry: { name: 'kz', text: 'Knowledge Zone', url: options.root },
    links: navigation[0].links,
  };
};

