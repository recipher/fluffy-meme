import R from 'ramda';
import axios from 'axios';
import Promise from 'bluebird';
import parse from 'html-dom-parser';
import { XmlEntities } from 'html-entities';
import tags from './tags.js';
import slugify from './slugify.js';
import load from '../load/load.js';
import { filename, extension, folder } from '../load/fetch.js';
import { create as createAsset } from '../contentful/asset.js';

const LOCALE = process.env.LOCALE;

const TYPES = {
  tag: {
    ul: 'unordered-list',
    ol: 'ordered-list',
    li: 'list-item',
    blockquote: 'blockquote',
    p: 'paragraph',
    h1: 'heading-1',
    h2: 'heading-2',
    h3: 'heading-3',
    h4: 'heading-4',
    h5: 'heading-5',
    h6: 'heading-6',
    hr: 'hr',
    br: 'br',
    a: 'hyperlink',
    b: 'bold',
    strong: 'bold',
    code: 'text',
    i: 'italic',
    em: 'italic',
    u: 'underline',
    img: 'embedded-asset-block',
    span: 'text',
  },
  text: 'text',
};

const followLink = async (url, content, options) => {
  const entry = await load(url, options);

  return {
    data: {
      target: {
        sys: {
          id: entry.sys.id,
          type: 'Link',
          linkType: 'Entry',
        }
      }
    },
    content,
    nodeType: 'entry-hyperlink'
  };
};

const removeBreaks = nodes => {
  let i = R.findIndex(R.propEq('nodeType', 'br'), R.last(nodes));
  while(i !== -1) {
    const last = nodes.pop();
    const split = R.splitAt(i, last);
    split[1].shift(); 
    nodes = R.concat(nodes, split);
    i = R.findIndex(R.propEq('nodeType', 'br'), R.last(nodes));
  }
  return nodes;
};

const paragraph = (content, type) => {
  if (!content.length) return [];

  const nodes = removeBreaks([ content ]);

  return R.map(node => ({
    data: {},
    content: node,
    nodeType: type,
  }), nodes.filter(node => node.length > 0));
};

const styled = (content, type) => {
  if (R.type(content) !== 'Array') content = [content];

  if (!content.length) {
    return [{
      data: {},
      marks: [{ type }],
      value: '',
      nodeType: 'text',
    }];
  }

  return R.map(node => 
    node.nodeType === 'text'
      ? R.assoc('marks', R.append({ type }, node.marks), node)
      : R.assoc('content', styled(node.content, type), node)
  , content);
};

const toContent = async ({ type, name, data, attribs }, content, options) => {
  const ignore = _ => content;
  
  const toText = _ => ({
    data: {},
    marks: [],
    value: data,
    nodeType: type,
  });

  // const toText = _ => data === '' ? ignore() : text();

  const toCode = _ => {         
    const entities = new XmlEntities();

    return R.map((node) => {
      node = R.assoc('value', entities.decode(node.value), node);
      node = R.assoc('marks', R.append({ type: 'code' }, node.marks), node);
      return node;
    }, content);
  };

  const toList = _ => {
    let list = [];

    R.forEach(node => {
      if (node.nodeType === 'text') {
        if (R.propOr(false, 'nodeType', R.last(list)) !== 'paragraph') {
          list = R.concat(list, paragraph([], 'paragraph'));
        }
        list[list.length-1].content.push(node);
      } else {
        list = R.append(node, list);
      }
    }, R.type(content) === 'Array' ? content : [ content ]);

    return {
      data: {},
      content: list,
      nodeType: TYPES[type][name],
    };
  };

  const toLink = async _ => {
    const uri = R.propOr('', 'href', attribs);

    if (!content.length) return ignore();

    if (uri.startsWith(options.root)) return followLink(uri.split(options.root).pop(), content, options) 

    return {
      data: { uri },
      content,
      nodeType: TYPES[type][name],
    };
  };

  const underlyingFilename = async src => {
    const response = await axios(src);
    return response.headers['content-disposition']
      .split('inline;filename=').pop()
      .replace(/['"]+/g, '')
      .split('.')[0];
  };

  const toImage = async _ => {
    const src = R.propOr('', 'src', attribs);

    await underlyingFilename(src);

    const fileName = filename(src);
    const title = await underlyingFilename(src); // fileName.substring(0, fileName.indexOf(extension)).split(folder).pop();

    const fields = {
      title: {
        [LOCALE]: title,
      },
      file: {
        [LOCALE]: {
          fileName,
          contentType: 'image/png',
        }
      }
    };

    const asset = await createAsset({ fields, tags: tags(options.tags) });

    return {
      data: {
        target: {
          sys: {
            id: asset.sys.id,
            type: 'Link',
            linkType: 'Asset',
          }
        }
      },
      content,
      nodeType: 'embedded-asset-block'
    };
  };

  const toDefault = _ => ({
    data: {},
    content,
    nodeType: TYPES[type][name],
  });

  const toStyled = _ => styled(content, TYPES[type][name]);
  const toParagraph = _ => paragraph(content, TYPES[type][name]);

  const toTag = ({
    div: ignore,
    span: ignore,
    svg: ignore,
    path: ignore,
    iframe: ignore,
    code: toCode,
    i: toStyled,
    b: toStyled,
    strong: toStyled,
    em: toStyled,
    u: toStyled,
    img: toImage,
    li: toList,
    a: toLink,
    p: toParagraph,
    h1: toParagraph,
    h2: toParagraph,
    h3: toParagraph,
    h4: toParagraph,
    h5: toParagraph,
    h6: toParagraph,
    blockquote: toDefault,
    ul: toDefault,
    ol: toDefault,
    hr: toDefault,
    br: toDefault,
  });

  const text = toText;
  const tag = await toTag[name];

  return { text, tag }[type]();
};

const fixRichText = content => {
  return content.filter(c => c && c.nodeType !== 'text' && c.nodeType !== 'hyperlink'); // TEMP
};

const toRichText = async (dom, options) => {
  let results = [];

  await Promise.each(dom, async element => {
    let content = [];
    if (element.children) content = await toRichText(element.children, options);

    const data = await toContent(element, content, options);

    results = R.type(data) === 'Array' ? R.concat(results, data) : R.append(data, results);
  });

  return results;
};

export default async (title, html, options) => {
  const content = await toRichText(parse(html), options);

  if (options.debug) console.log(JSON.stringify(content, null, 2));

  return {
    contentType: 'article',
    tags: tags(options.tags),
    fields: {
      name: {
        [LOCALE]: slugify(options.url),
      },
      title: {
        [LOCALE]: title,
      },
      contents: {
        [LOCALE]: {
          data: {},
          content: fixRichText(content),
          nodeType: 'document',
        }
      },
    }
  };
};

