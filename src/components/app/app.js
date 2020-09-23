import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import qs from 'qs'

import { Hello } from '../hello/hello.js'
import { Marketsense } from '../marketsense/marketsense.js'

import log from 'loglevel'

log.setLevel('debug')

const script = document.currentScript

function App (props) {
  const fnName = 'App'
  useEffect(() => {
    try {
      const url = new URL(script.src)
      const parsedUrl = qs.parse(url.search.substr(1, url.search.length))
      log.debug(`${fnName} - constructor`, { url, parsedUrl })
    } catch (e) {
      log.warn(`${fnName} - constructor`, { e, document })
    }
  }, [])
  return (
    <div>
      {/*      <Hello {...appProps}></Hello>
      <Marketsense {...appProps}/>*/}
    </div>
  )
}

let appProps = {}

if (module.hot) {
  module.hot.accept('../hello/hello', function () {
    log.trace('Accepting the updated hello.js module!')
    ReactDOM.render(
      <App/>,
      document.getElementById('app')
    )
  })
}

export function run () {
  ReactDOM.render(
    <App/>,
    document.getElementById('app')
  )
}

