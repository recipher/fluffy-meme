import R, { o } from 'ramda';
import Promise from 'bluebird';
import parse from 'html-dom-parser';
import slugify from './helpers/slugify.js';
import sanitize from './helpers/sanitize.js';
import load from '../scrape/load.js';

const { LOCALE } = process.env;

const mapIndexed = R.addIndex(R.map);
const compact = R.filter(R.identity);

const NAVIGATION = 'navigation';
const LINK = 'link';

const toSys = entry => ({
  sys: {
    type: 'Link',
    linkType: 'Entry',
    id: entry.sys.id,
  },
});

export const determineSiteUrl = (uri, options) => {
  const LEAD = '/a';
  const url = uri.split(options.domain).pop();

  if (url.startsWith(LEAD)) { // u: /a/sgw/foo 
    if (options.root.startsWith(LEAD)) { // r: /a/sgw
      return { url: url.split(options.root).pop(), root: options.root }; // u: /foo r: /a/sgw
    } else { // r: /sgw
      const root = `${LEAD}${options.root}`; // r: /a/sgw
      return { url: url.split(root).pop(), root }; // u: /foo r: /a/sgw
    }
  } else { // u: /sgw/foo
    if (options.root.startsWith(LEAD)) { // r: /a/sgw
      const root = options.root.split(LEAD).pop(); // r: /sgw
      return { url: url.split(root).pop(), root }; // u: /foo r: /sgw
    } else { // r: /sgw
      return { url: url.split(options.root).pop(), root: options.root }; // /foo /sgw
    }
  }
};

const toContent = async ({ type, name, data, attribs }, content, options) => {
  const toLink = async _ => {
    if (!content.length) return content;

    const uri = sanitize(R.propOr('', 'href', attribs));
    const title = content[0];

    if (uri.startsWith(options.root) || uri.startsWith(options.domain)) {
      const { url, root } = determineSiteUrl(uri, options);

      const entry = await load(url, { ...options, root });
      return { title, ...entry, contentType: LINK };
    }
    
    return { url: uri, title, contentType: LINK };
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

const setNames = (navigation, zone, ancestry) => {
  if (navigation === undefined) return;
  return R.map(({ links, contentType, ...item }) => {
    const name = item.title ? [ ancestry, slugify(item.title) ].join('-') : ancestry;

    const toItem = ({ sys, ...item }) => sys ? { sys } : { ...item, name };

    return contentType !== NAVIGATION 
      ? toItem(item)
      : { name, entry: toItem(item), zone: toSys(zone), links: setNames(links, zone, name), isRoot: false };
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

export default async (html, zone, options) => {
  const name = zone.fields.name[LOCALE];

  const data = await toData(parse(html), options);
  const navigation = setNames(reformat(data), zone, name);

  if (options.debug) console.log(JSON.stringify(navigation, null, 2));

  return {
    name,
    zone: toSys(zone),
    links: navigation[0].links,
    isRoot: true,
  };
};

