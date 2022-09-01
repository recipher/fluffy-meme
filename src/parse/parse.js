import article from './article.js';
import links from './links.js';

const PARSERS = {
  'links': links,
  'article': article,
};

export default (title, html, zone, { parser, ...options }) => {
  const { url } = options;

  let parse = PARSERS[parser || url];

  if (parse === undefined) parse = article;

  return parse(title, html, zone, options);
};