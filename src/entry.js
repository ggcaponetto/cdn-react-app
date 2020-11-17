require('./public-path.js');
// eslint-disable-next-line no-console
console.log('External React App (index.js)', { process, NODE_ENV: process.env.NODE_ENV, window });
require('./components/app/app.js').run();
