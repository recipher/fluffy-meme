import R from 'ramda';
import Promise from 'bluebird';
import parse from 'html-dom-parser';
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
    // if (uri.startsWith(options.root)) return follow(uri.split(options.root).pop(), content, options);

    return { uri, text: content[0], contentType: LINK };
  };

  const toList = _ => ({ links: content, contentType: NAVIGATION });

  if (type === 'text') return data;
  if (name === 'ul') return toList();
  if (name === 'a') return toLink();

  return content;
};

const format = navigation => {
  if (navigation === undefined) return;
  
  return R.map(item => {
    return {
      links: format(item.links)
    }
  }, navigation);
};

const nestSiblings = navigation => {
  const nested = mapIndexed(({ contentType, ...item }, ix) => {
    if (contentType === LINK) {
      if (navigation[ix+1]?.contentType === NAVIGATION)
        return { ...item, links: nestSiblings(navigation[ix+1].links) };
      return item;
    } else if (contentType === NAVIGATION && navigation[ix-1]?.contentType !== LINK) {
      return item;
    }
  }, navigation);

  return compact(nested);
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
  // const navigation = await toNavigation(parse(html), options);

  // if (options.debug) console.log(nestSiblings(navigation));
  // if (options.debug) console.log(JSON.stringify(navigation, null, 2));

  return {
    name: 'test',
    title: 'test',
    entry: {
      name: 'entry',
      url:'https://www.entry.com'
    },
    links: [
      {
        contentType: 'navigation',
        name: 'test-2',
        title:'test-2',
        entry: {
          name: 'entry2',
          url:'https://www.entry2.com'
        },
        links: [
          {
            contentType: 'link',
            name: 'one',
            url:'https://www.one.com'
          },
          {
            contentType: 'link',
            name: 'two',
            url: 'https://www.two.com'
          },
        ],
      }
    ]
  };
};

