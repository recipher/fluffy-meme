export default tags => tags?.split(',').map(tag => ({ sys: { type: 'Link', linkType: 'Tag', id: `area${tag}` }}));
