import article from './article.js';

const transformations = {

};

export default (title, html, options) => {
  const { url } = options;
  
  let transform = transformations[url];

  if (transform === undefined) transform = article;

  return transform(title, html, options);
};