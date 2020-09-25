import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import qs from 'qs'
import '@material-ui/core'
import { Hello } from '../hello/hello.js'
import { Marketsense } from '../marketsense/marketsense.js'
import Button from '@material-ui/core/Button'

import log from 'loglevel'
import { win } from 'leaflet/src/core/Browser'

log.setLevel('debug')

const script = document.currentScript

const getParsedUrl = () => {
  try {
    const url = new URL(script.src)
    const parsedUrl = qs.parse(url.search.substr(1, url.search.length))
    return parsedUrl;
  } catch (e) {
    log.warn(`getParsedUrl`, { e })
    throw e;
  }
}

function App (props) {
  const fnName = 'App'
  let [appProps, setAppProps] = useState({
    env: {
      APIGatewayBase: `https://services.swissenergyplanning.ch`
    }
  })

  useEffect(() => {
    const url = new URL(script.src)
    const parsedUrl = getParsedUrl();
    log.debug(`${fnName} - constructor`, { url, parsedUrl, appProps })
    setAppProps((appProps) => {
      return {
        ...appProps,
        parsedUrl
      }
    })
    const myEvent = new CustomEvent(parsedUrl.sepEventName, {
      detail: {
        action: "loaded-app",
        payload: true
      }
    })
    window.dispatchEvent(myEvent);
  }, [])

  const getComponent = () => {
    if (appProps) {
      return (
        <React.Fragment>
          {/* <Hello {...appProps}></Hello>*/}
          <Marketsense {...appProps}/>
        </React.Fragment>
      )
    }
    return (
      <React.Fragment>
        <h3>Loading...</h3>
      </React.Fragment>
    )
  }
  return (
    <div>
      {getComponent()}
    </div>
  )
}

if (module.hot) {
  module.hot.accept('../hello/hello', function () {
    log.trace('Accepting the updated hello.js module!')
    ReactDOM.render(
      <App />,
      document.getElementById('app')
    )
  })
}

export function run () {
  ReactDOM.render(
    <App/>,
    document.getElementById(getParsedUrl().scriptId)
  )
}

