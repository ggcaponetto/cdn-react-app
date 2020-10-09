import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import qs from 'qs'
import '@material-ui/core'
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles'
import { LinearProgress } from '@material-ui/core'
import {Helmet} from "react-helmet";


const Sample = React.lazy(() => {
  return import(/* webpackChunkName: "sample" */ './../sample/sample.js');
})

import log from 'loglevel'

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
    log.debug(`${fnName} - constructor`, { url, parsedUrl, appProps})
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
      'palette': {
        'primary': {
          'main': '#689F38'
        },
        'secondary': {
          'main': '#0e72b5'
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
      theme = getDefaultTheme()
    }
    return theme
  }
  const getDefaultTheme = () => {
    const defaultTheme = {
      'palette': {
        'primary': {
          'main': '#689F38'
        },
        'secondary': {
          'main': '#0e72b5'
        }
      }
    }
    let theme = null
    theme = createMuiTheme(
      defaultTheme
    )
    log.debug(`${fnName} - getTheme - no override`, { defaultTheme, theme })
    return theme
  }

  const getComponent = () => {
    if (appProps) {
      let getLoadingComponent = () => {
        return (
          <div>
            <LinearProgress />
          </div>
        )
      }
      return (
        <React.Fragment>
          <React.Suspense fallback={getLoadingComponent()}>
            <Sample {...appProps}/>
          </React.Suspense>
        </React.Fragment>
      )
    } else {
      return (
        <React.Fragment>
          <h3>loading...</h3>
        </React.Fragment>
      )
    }
  }
  return (
    <ThemeProvider theme={appProps.theme || getDefaultTheme()}>
      <Helmet>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
      </Helmet>
      <div>
        {getComponent()}
      </div>
    </ThemeProvider>
  )
}

if (module.hot) {
  module.hot.accept([
    "../sample/sample"
  ], function () {
    log.trace('Accepting the updated sample.js module!')
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

