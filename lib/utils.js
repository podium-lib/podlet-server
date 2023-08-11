/**
 * Determines if a given path or url is an absolute url
 * @param {string} pathOrUrl
 * @returns {boolean}
 */
export const isAbsoluteURL = (pathOrUrl) => {
  const url = new URL(pathOrUrl, 'http://local');
  return url.origin !== 'http://local';
};

export const joinURLPathSegments = (...segments) =>
  segments.join('/').replace(/[\\/]+/g, '/');
