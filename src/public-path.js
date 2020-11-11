// inject the env variables
process.env.REACT_APP_ENV = process.env.NODE_ENV;
// Replace the webpack public path assuming that all resources are hosted on the same path as the bundle.js file.
if (process.env.REACT_APP_ENV === 'production') {
  const script = document.currentScript;
  const url = new URL(script.src);
  console.log('External React App (index.js): the current script is on', { url });
  const ASSET_PATH = process.env.ASSET_PATH || `${url.origin}${url.pathname.replace('main.bundle.js', '')}`;
  __webpack_public_path__ = ASSET_PATH;
}
