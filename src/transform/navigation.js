import R from 'ramda';
import Promise from 'bluebird';
import parse from 'html-dom-parser';
import tags from './helpers/tags.js';
import follow from './helpers/follow.js';

const mapIndexed = R.addIndex(R.map);
const compact = R.filter(R.identity);

const { LOCALE } = process.env;

const NAVIGATION = 'navigation';
const LINK = 'link';

const toContent = async ({ type, name, data, attribs }, content, options) => {
  const toLink = async _ => {
    const uri = R.propOr('', 'href', attribs);

    if (!content.length) return content;
    // if (uri.startsWith(options.root)) return follow(uri.split(options.root).pop(), content, options) 

    return { uri, text: content[0], contentType: 'Link' };
  };

  const toList = _ => ({ links: content, contentType: NAVIGATION });

  if (type === 'text') return data;
  if (name === 'ul') return toList();
  if (name === 'a') return toLink();

  return content;
};

const nestSiblings = navigation => {
  const nested = mapIndexed(({ contentType, ...item }, ix) => {
    if (contentType === LINK) {
      if (navigation[ix+1]?.contentType === NAVIGATION)
        return { ...item, links: nestSiblings(navigation[ix+1].links) };
      else
        return item;
    }
    else if (contentType === NAVIGATION) {
      if (navigation[ix-1]?.contentType !== LINK)
        return item;
    }
  }, navigation);

  return compact(nested);
};

const toNavigation = async (dom, options) => {
  let results = [];

  await Promise.each(dom, async element => {
    let content = [];
    const { children } = element;
    if (children) content = await toNavigation(children, options);

    const data = await toContent(element, content, options);

    results = R.type(data) === 'Array' 
      ? R.concat(results, data) 
      : R.append(data, results);
  });

  return results;
};

export default async (html, options) => {
  const navigation = await toNavigation(parse(html), options);

  if (options.debug) console.log(nestSiblings(navigation));
  // if (options.debug) console.log(JSON.stringify(navigation, null, 2));

  return {
    contentType: 'navigation',
    tags: tags(options.tags),
  };
};
