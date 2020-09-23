import React, { useEffect, useState, useContext, useReducer, useRef } from 'react'
import styles from './hello.module.css'
/** @jsx jsx */
import { jsx } from '@emotion/core'
import moment from 'moment'
import log from 'loglevel'
import Button from '@material-ui/core/Button'

// this is bad, messes up the host css
// DONT: import "./hello-global.css"

log.setLevel('debug')

const setupLogs = () => {
  if (process.env.REACT_APP_ENV === 'production') {
    log.setLevel('debug')
    log.debug('The logs have been disabled in production build.')
    log.setLevel('warn')
  } else {
    log.setLevel('debug')
    log.debug('The logs have been enabled in development build.')
  }
}

function Hello (props) {
  const fnName = 'Hello'
  const [result, setResult] = useState(null)
  useEffect(() => {
    setupLogs()
    log.debug(`${fnName} - useEffect`, { props, styles, process })
    props.sepEvents.dispatch(props.sepEvents.dispatch(props.sepEvents.name, { message: 'loaded hello.js' }))
    import('./hello-split.js').then(math => {
      props.sepEvents.dispatch(props.sepEvents.dispatch(props.sepEvents.name, { message: 'loaded hello-split.js' }))
      let result = math.add(16, 26)
      log.debug('dynamic import of hello-split.js has completed.', { result })
      setResult(result)
    })
  }, [])
  return (
    <div
      css={{
        color: 'hotpink'
      }}
    >
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          props.sepEvents.dispatch(props.sepEvents.dispatch(props.sepEvents.name, { click: { loaded: true } }))
        }}
      >
        Primary
      </Button>
      <h3>Hello world!! {(new moment()).toISOString()} - (hello-split.js: {result})</h3>
    </div>
  )
}

export {
  Hello
}

