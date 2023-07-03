/**
 * Determines if a given path or url is an absolute url
 * @param {string} pathOrUrl
 * @returns {boolean}
 */
export const isAbsoluteURL = (pathOrUrl) => {
  const url = new URL(pathOrUrl, "http://local");
  if (url.origin !== "http://local") return true;
  return false;
};

export const joinURLPathSegments = (...segments) => {
  return segments.join("/").replace(/[\/]+/g, "/");
};
