import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import qs from 'qs'
import '@material-ui/core'
import { Marketsense } from '../marketsense/marketsense.js'
import { createMuiTheme, makeStyles, ThemeProvider } from '@material-ui/core/styles'

import log from 'loglevel'

import i18next from 'i18next';
import Backend from 'i18next-locize-backend';
import {  initReactI18next } from "react-i18next";
import { useTranslation } from 'react-i18next'

i18next
  .use(Backend)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // ...other options
    lng: "de-CH",
    fallbackLng: "de-CH",
    backend: {
      projectId: 'c016a769-684b-42fe-a8c2-880bff481672',
      apiKey: 'd325343e-8fb0-42f0-b5cb-fde2968a4a3f',
      referenceLng: 'de-CH'
    }
  });

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
  const { t, i18n } = useTranslation('main', { useSuspense: false })
  let [appProps, setAppProps] = useState({
    env: {
      APIGatewayBase: `https://services.swissenergyplanning.ch`
    }
  })

  useEffect(() => {
    const url = new URL(script.src)
    const parsedUrl = getParsedUrl()
    log.debug(`${fnName} - constructor`, { url, parsedUrl, appProps, t, i18n })
    setAppProps((appProps) => {
      return {
        ...appProps,
        parsedUrl,
        theme: getTheme(parsedUrl)
      }
    })
    if(parsedUrl.lang){
      i18n.changeLanguage(parsedUrl.lang)
    }
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
      theme = getDefaultTheme()
    }
    return theme
  }
  const getDefaultTheme = () => {
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
    theme = createMuiTheme(
      defaultTheme
    )
    log.debug(`${fnName} - getTheme - no override`, { defaultTheme, theme })
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
    <ThemeProvider theme={appProps.theme || getDefaultTheme()}>
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

