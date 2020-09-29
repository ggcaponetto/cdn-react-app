import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import qs from 'qs'
import '@material-ui/core'
import { Hello } from '../hello/hello.js'
import { Marketsense } from '../marketsense/marketsense.js'
import Button from '@material-ui/core/Button'
import { createMuiTheme, makeStyles, ThemeProvider } from '@material-ui/core/styles'

import log from 'loglevel'
import { win } from 'leaflet/src/core/Browser'
import { get } from 'leaflet/src/dom/DomUtil'

log.setLevel('debug')

const script = document.currentScript

const getParsedUrl = () => {
  try {
    const url = new URL(script.src)
    const parsedUrl = qs.parse(url.search.substr(1, url.search.length))
    return parsedUrl
  } catch (e) {
    log.warn(`getParsedUrl`, { e })
    throw e
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
    const parsedUrl = getParsedUrl()
    log.debug(`${fnName} - constructor`, { url, parsedUrl, appProps })
    setAppProps((appProps) => {
      return {
        ...appProps,
        parsedUrl,
        theme: getTheme(parsedUrl)
      }
    })
    const myEvent = new CustomEvent(parsedUrl.sepEventName, {
      detail: {
        action: 'loaded-app',
        payload: true
      }
    })
    window.dispatchEvent(myEvent)
  }, [])

  const getTheme = (parsedUrl) => {
    const defaultTheme = {
      "palette": {
        "primary": {
          "main": "#689F38"
        },
        "secondary": {
          "main": "#0e72b5"
        }
      }
    }
    let theme = null
    if (parsedUrl && parsedUrl.theme) {
      let parsedTheme = JSON.parse(parsedUrl.theme)
      theme = createMuiTheme(
        {
          ...defaultTheme,
          ...parsedTheme
        }
      )
      log.debug(`${fnName} - getTheme - override`, { defaultTheme, parsedTheme, theme })
    } else {
      theme = createMuiTheme(
        defaultTheme
      )
      log.debug(`${fnName} - getTheme - no override`, { defaultTheme, theme })
    }
    return theme
  }

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
    <ThemeProvider theme={appProps.theme}>
      <div>
        {getComponent()}
      </div>
    </ThemeProvider>
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

