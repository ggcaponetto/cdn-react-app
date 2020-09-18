import React from 'react'
import ReactDOM from 'react-dom'

import { Hello } from '../hello/hello.js'

if (module.hot) {
  module.hot.accept('../hello/hello', function() {
    console.log('Accepting the updated hello.js module!');
    ReactDOM.render(
      <Hello></Hello>,
      document.getElementById('app')
    )
  })
}

export function run () {
  ReactDOM.render(
    <Hello></Hello>,
    document.getElementById('app')
  )
}

