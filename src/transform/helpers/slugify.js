export default url => {
  return url.replace(/\//g, '-').slice(1).toLowerCase();
};