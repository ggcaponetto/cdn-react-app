import React from 'react'
import ReactDOM from 'react-dom'

import { Hello } from '../hello/hello.js'
import { Marketsense } from '../marketsense/marketsense.js'
import log from 'loglevel'

process.env.REACT_APP_ENV = process.env.NODE_ENV

let loglevel = log.noConflict()
const appProps = {
  loglevel
}
let component = () => (
  <React.Fragment>
    {JSON.stringify(process)}
    <Hello {...appProps}></Hello>
    <Marketsense {...appProps}/>
  </React.Fragment>
)

if (module.hot) {
  module.hot.accept('../hello/hello', function () {
    console.log('Accepting the updated hello.js module!')
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

