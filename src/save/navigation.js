import Promise from 'bluebird';
import parse from '../parse/navigation.js';
import { create, byName } from '../contentful/entry.js';

const type = entry => entry.entry === undefined ? 'link' : 'navigation';

const templates = {
  navigation: {
    name: 'name',
    zone: (navigation, { createEntry }) => createEntry('zone', { entry: navigation.zone, find: byName }),
    entry: (navigation, { createEntry }) => createEntry('link', { entry: navigation.entry, find: byName }),
    links: (navigation, { createEntry }) =>
      Promise.mapSeries(navigation.links, async entry => createEntry(type(entry), { entry, find: byName }))
  },
  link: {
    name: 'name',
    url: 'url',
    title: 'title',
  },
};

// const mapTree = function(tree, cb) {
//   var newTree = JSON.parse(JSON.stringify(tree));

//   var traverse = function(cb, node) {
//     const newNode = cb(node);
//     if (newNode.links)
//       for (var i = 0; i < newNode.links.length; i++)
//         traverse(cb, newNode.links[i]);
//   }

//   traverse(cb, newTree);
//   return newTree;
// };

export default async (html, zone, options) => {
  const entry = await parse(html, zone, options);

  // const x = mapTree(entry, function(node) {
  //   if (node.url === '' || node.url === undefined) console.log(node);
  //   return { ...node };
  // })

  return create('navigation', { entry, tags: options.tags }, { templates, find: byName });
};