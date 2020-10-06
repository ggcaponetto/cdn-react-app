require("./public-path.js")
console.log(`External React App (index.js)`, { process, NODE_ENV: process.env.NODE_ENV, window })
require('./components/app/app.js').run();
