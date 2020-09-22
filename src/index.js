import { run } from './components/app/app.js'

console.log(`External React App (index.js)`, { process, NODE_ENV: process.env.NODE_ENV })

// inject the env variables
process.env.REACT_APP_ENV = process.env.NODE_ENV

run()
