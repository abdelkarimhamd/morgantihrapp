// utils/url.js
// ------------------------------------------------------------
// Helper that turns a server-side path (e.g. “public/attachments/abc.pdf”)
// into an absolute, open-able URL.
//
// ✱  Set BASE_FILE_URL to your API or asset domain once.
export const BASE_FILE_URL = 'https://app.morgantigcc.com/hr_system/backend/public/';

export const toAbsoluteUrl = (pathOrUrl = '') => {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;        // already absolute
  const clean = pathOrUrl.replace(/^public\//, '');
  return `${BASE_FILE_URL}/storage/${encodeURI(clean)}`;
};
