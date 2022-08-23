const GOOGLE = 'https://www.google.com/';

export default url => url.startsWith(GOOGLE) ? new URL(url).searchParams.get('q') : url;
