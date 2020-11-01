# CDN React App

[![ggcaponetto](https://circleci.com/gh/ggcaponetto/cdn-react-app.svg?style=shield)](https://app.circleci.com/pipelines/github/ggcaponetto/external-react-app?branch=master)

This is a boilerplate repository to bootstrap a react app that can be easily intergrated via script tag into any
existing website with CDN deployment in mind.

example integration:

```html
<!--COPY/PASTE THIS SNIPPET HERE - START -->
<div id="react-root-node"></div>
<script id="external-react-app"></script>
<script type="text/javascript">
  // change path to match your file:
  window.onload = function () {
    const eventName = 'external-react-app'
    window.addEventListener(eventName, (e) => {
      console.log('host: got event', { action: e.detail.action })
    })
    let mainScript = document.getElementById('external-react-app')
    mainScript.async = true
    mainScript.src = '<PATH_TO_YOUR_CDN>/main.bundle.js?'
      + 'scriptId=react-root-node'
      + '&eventName=' + eventName
      + '&v=' + Date.now()

    mainScript.addEventListener('load', function () {
      // the react app has rendered once
      console.log('external-react-app: script loaded')
    })
  }
</script>
<!--COPY/PASTE THIS SNIPPET HERE - END -->
```
### Getting started
1. ``npm i``
1. ``npm run webpack-start-dev``

### Development
With ``npm run webpack-start-dev`` you can run/develop the app with hot module replacement enabled. In this
case the ``/public`` folder will contain the files needed by webpack.
The development build will be available on [http://localhost:3000](http://localhost:3000).

### Production
By running ``npm run webpack-start-prod`` all the required files will be generated in ``/dist``. This is the foder you
can deploy to a CDN.
 A production preview will then be available on [http://localhost:5000](http://localhost:5000).
 
This project is configured to use hot module replacement and implements the same ``<ErrorBoundary/>`` used by
[create-react-app](https://github.com/facebook/create-react-app). The linting style follows approximately the one used
by [airbnb](https://www.airbnb.ch/).




