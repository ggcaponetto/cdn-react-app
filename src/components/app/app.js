import React from 'react'
import ReactDOM from 'react-dom'

import { Hello } from '../hello/hello.js'
import { Marketsense } from '../marketsense/marketsense.js'

import log from 'loglevel'
log.setLevel("debug")


let appProps = {}
let component = () => (
  <React.Fragment>
    {JSON.stringify(process.env)}
    <Hello {...appProps}></Hello>
    <Marketsense {...appProps}/>
  </React.Fragment>
)

if (module.hot) {
  module.hot.accept('../hello/hello', function () {
    log.trace('Accepting the updated hello.js module!')
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

