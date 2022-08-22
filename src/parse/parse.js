import article from './article.js';

const parsers = {
};

export default (title, html, options) => {
  const { url } = options;
  
  let parse = parsers[url];

  if (parse === undefined) parse = article;

  return parse(title, html, options);
};