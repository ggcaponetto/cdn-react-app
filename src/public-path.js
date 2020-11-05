/* eslint-env shared-node-browser, commonjs */
// eslint-disable-next-line no-unused-vars
/* global __webpack_public_path__ */

// inject the env variables
process.env.REACT_APP_ENV = process.env.NODE_ENV;
process.env.REACT_APP_VERSION = process.env.APP_VERSION;

// Replace the webpack public path assuming that
// all resources are hosted on the same path as the bundle.js file.

if (process.env.REACT_APP_ENV === 'production') {
  const script = document.currentScript;
  const url = new URL(script.src);
  // eslint-disable-next-line no-console
  console.log('External React App (index.js): the current script is on', { url });
  const ASSET_PATH = process.env.ASSET_PATH || `${url.origin}${url.pathname.replace('main.bundle.js', '')}`;
  // eslint-disable-next-line camelcase,no-global-assign
  __webpack_public_path__ = ASSET_PATH;
}
