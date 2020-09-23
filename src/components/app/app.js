import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import qs from 'qs'
import '@material-ui/core'
import { Hello } from '../hello/hello.js'
import { Marketsense } from '../marketsense/marketsense.js'
import Button from '@material-ui/core/Button'

import log from 'loglevel'

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
  let [appProps, setAppProps] = useState(null)

  useEffect(() => {
    const url = new URL(script.src)
    const parsedUrl = getParsedUrl();
    log.debug(`${fnName} - constructor`, { url, parsedUrl })
    let newAppProps = {
      sepEvents: {
        dispatch: (eventName, eventDetail) => {
          const myEvent = new CustomEvent(eventName, {
            detail: eventDetail
          })
          window.dispatchEvent(myEvent)
        },
        name: parsedUrl.sepEventName
      }
    }
    newAppProps.sepEvents.dispatch(newAppProps.sepEvents.name, { message: 'loaded app.js' })
    setAppProps(newAppProps)
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
      <App/>,
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

