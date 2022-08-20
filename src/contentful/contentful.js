import contentful from 'contentful-management';

const accessToken = process.env.CONTENTFUL_API_KEY;
const spaceId = 'ssh8ebsfym8v';
const environmentId = 'development';

export const client = _ => contentful.createClient({ accessToken });

export const environment = async _ => {
  const space = await client().getSpace(spaceId);
  const environment = await space.getEnvironment(environmentId);

  return environment;
};
