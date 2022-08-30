import R from 'ramda';
import axios from 'axios';
import Promise from 'bluebird';
import parse from 'html-dom-parser';
import { XmlEntities } from 'html-entities';
import { titleify } from './helpers/slugify.js';
import { filename, extension, folder } from '../scrape/fetch.js';
import { create as createAsset } from '../contentful/asset.js';
import load from '../scrape/load.js';
import sanitize from './helpers/sanitize.js';
import { determineSiteUrl } from './navigation.js';

const EXCLUSIONS = [
  '/local-markets/welcome/lm-organization-chart/profiles',
  '/supply-chain-management/governance/kpi-apac-2021/kpi-apac-december-2021',
];

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
    sup: 'text',
    sub: 'text',
    del: 'text',
    strong: 'bold',
    code: 'text',
    i: 'italic',
    em: 'italic',
    u: 'underline',
    img: 'embedded-asset-block',
    code: 'code',
    span: 'text',
  },
  text: 'text',
};

const follow = async (url, content, options) => {
  const target = await load(url, options);

  return {
    data: { target },
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
  if (R.type(content) !== 'Array') content = [ content ];

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
  const nodeType = TYPES[type][name];

  const ignore = _ => content;
  const toText = _ => ({ data: {}, marks: [], value: data, nodeType: type });
  const wrapTag = _ => ({ data: {}, marks: [], value: `<${name}>${content[0].value}</${name}>`, nodeType });

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

    return { data: {}, content: list, nodeType };
  };

  const toLink = async _ => {
    if (!content.length) return ignore();

    const uri = sanitize(R.propOr('', 'href', attribs));

    if (uri.startsWith(options.root) || uri.startsWith(options.domain)) {
      const { url, root } = determineSiteUrl(uri, options);
      // Can't self-reference
      if (url !== options.url && EXCLUSIONS.includes(url) === false) 
        return follow(url, content, { ...options, root });
    }

    if (uri.startsWith('#')) return { data: {}, content, nodeType: 'paragraph' };

    return { data: { uri }, content, nodeType };
  };

  const underlyingFilename = async src => {
    const response = await axios(src);
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition === undefined) return;
    return contentDisposition.split('inline;filename=').pop()
      .replace(/['"]+/g, '')
      .split('.')[0];
  };

  const toImage = async _ => {
    const src = R.propOr('', 'src', attribs);

    const fileName = filename(src);
    const underlying = await underlyingFilename(src);
    const title = underlying || fileName.substring(0, fileName.indexOf(extension)).split(folder).pop();

    const asset = await createAsset({ asset: { title, fileName, contentType: 'image/png' }, tags: options.tags });
    if (asset === undefined) return ignore();

    return {
      data: { target: asset },
      content,
      nodeType: 'embedded-asset-block'
    };
  };

  const toDefault = _ => ({ data: {}, content, nodeType });

  const toStyled = _ => styled(content, nodeType);
  const toParagraph = _ => paragraph(content, nodeType);

  const toTag = ({
    div: ignore,
    span: ignore,
    svg: ignore,
    path: ignore,
    g: ignore,
    nav: ignore,
    header: ignore,
    footer: ignore,
    section: ignore,
    iframe: ignore,
    code: toCode,
    i: toStyled,
    b: toStyled,
    strong: toStyled,
    em: toStyled,
    u: toStyled,
    sup: wrapTag,
    sub: wrapTag,
    del: wrapTag,
    img: toImage,
    li: toList,
    a: toLink,
    p: toParagraph,
    h1: ignore,
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

  try {
    return { text: toText, tag: toTag[name] }[type]();
  } catch(e) {
    console.log(e, name, type);
    return toDefault();
  }
};

const fix = content => content.filter(c => c && c.nodeType !== 'text' && c.nodeType !== 'hyperlink');

const toRichText = async (dom, options) => {
  let results = [];

  await Promise.each(dom, async element => {
    let content = [];
    const { children } = element;
    if (children) content = await toRichText(children, options);

    const data = await toContent(element, content, options);

    results = R.type(data) === 'Array' 
      ? R.concat(results, data) 
      : R.append(data, results);
  });

  return results;
};

export default async (title, html, zone, options) => {
  const content = html === undefined ? [] : await toRichText(parse(html), options);

  if (options.debug) console.log(JSON.stringify(content, null, 2));

  return {
    name: titleify(options.url),
    title,
    summary: title,
    zone: { 
      sys: {
        type: 'Link',
        linkType: 'Entry',
        id: zone.sys.id,
      },
    },
    contents: {
      data: {},
      content: fix(content),
      nodeType: 'document',
    }
  };
};

