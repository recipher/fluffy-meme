import R from 'ramda';
import Promise from 'bluebird';
import parse from 'html-dom-parser';
import slugify from './helpers/slugify.js';
import follow from './helpers/follow.js';

const mapIndexed = R.addIndex(R.map);
const compact = R.filter(R.identity);

const NAVIGATION = 'navigation';
const LINK = 'link';

const toContent = async ({ type, name, data, attribs }, content, options) => {
  const toLink = async _ => {
    const url = R.propOr('', 'href', attribs);

    if (!content.length) return content;
    // if (uri.startsWith(options.root)) return follow(uri.split(options.root).pop(), content, options);

    return { url, text: content[0], contentType: LINK };
  };

  const toList = _ => ({ links: content, contentType: NAVIGATION });

  if (type === 'text') return data;
  if (name === 'ul') return toList();
  if (name === 'a') return toLink();

  return content;
};

const reformat = navigation => {
  const nested = mapIndexed(({ contentType, ...item }, ix) => {
    if (contentType === LINK) {
      if (navigation[ix+1]?.contentType === NAVIGATION)
        return { ...item, links: reformat(navigation[ix+1].links) };
      return item;
    } else if (contentType === NAVIGATION && navigation[ix-1]?.contentType !== LINK) {
      return item;
    }
  }, navigation);

  return compact(nested);
};

const setNames = (navigation, ancestry = 'kz') => {
  if (navigation === undefined) return;
  return R.map(({ links, ...item }) => {
    const name = [ ancestry, item.text && slugify(item.text) ].join('-') ;
    
    return links === undefined 
      ? { ...item, name }
      : { name, entry: { ...item, name }, links: setNames(links, name) };
  }, navigation);
};

const toNavigation = async (dom, options) => {
  let navigation = [];

  await Promise.each(dom, async element => {
    let content = [];
    const { children } = element;
    if (children) content = await toNavigation(children, options);

    const data = await toContent(element, content, options);

    navigation = R.type(data) === 'Array' 
      ? R.concat(navigation, data) 
      : R.append(data, navigation);
  });

  return navigation;
};

export default async (html, options) => {
  const navigation = await toNavigation(parse(html), options);

  if (options.debug) console.log(JSON.stringify(setNames(reformat(navigation)), null, 2));

  return {
    name: 'kz',
    title: 'Knowledge Zone',
    entry: { name: 'kz', url: options.root },
    links: setNames(reformat(navigation))
  };
};

