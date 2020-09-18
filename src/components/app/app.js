import React from 'react'
import ReactDOM from 'react-dom'

import { Hello } from '../hello/hello.js'
import { Marketsense } from '../marketsense/marketsense.js'

let component = () => (
  <React.Fragment>
    <Hello></Hello>
    <Marketsense/>
  </React.Fragment>
);

if (module.hot) {
  module.hot.accept('../hello/hello', function() {
    console.log('Accepting the updated hello.js module!');
    ReactDOM.render(
      component(),
      document.getElementById('app')
    )
  })
}

export function run () {
  ReactDOM.render(
    component(),
    document.getElementById('app')
  )
}

