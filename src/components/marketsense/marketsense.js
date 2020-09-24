import React, { useEffect, useState, useContext, useReducer, useRef } from 'react'
import ReactDOM from 'react-dom'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { v4 as uuidv4 } from 'uuid'
import Button from '@material-ui/core/Button'

/** @jsx jsx */
import { jsx } from '@emotion/core'
import log from 'loglevel'

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

function AddressSearch (props) {
  const fnName = 'AddressSearch'
  const [container, setContainer] = useState(null)

  useEffect(() => {
    log.debug(`${fnName} - useEffect - []`, { props })
    setupLogs()
  }, [])

  useEffect(() => {
    if(props.parsedUrl && props.parsedUrl.sepEventName){
      const onSepEvent = (event) => {
        log.debug(`${fnName} - onSepEvent`, event)
        if (
          event.detail
          && event.detail.action === 'init-sep-address'
          && event.detail.payload
          && event.detail.payload.addressContainerId
        ) {
          log.debug(`${fnName} - onSepEvent - setting up the container`, event)
          setContainer(document.getElementById(event.detail.payload.addressContainerId))
        }
      }

      window.addEventListener(props.parsedUrl.sepEventName, onSepEvent)
      const myEvent = new CustomEvent(props.parsedUrl.sepEventName, {
        detail: {
          action: "loaded-address",
          payload: true
        }
      })
      window.dispatchEvent(myEvent);
      return () => {
        window.removeEventListener(props.parsedUrl.sepEventName, onSepEvent)
      }
    }
  }, [props.parsedUrl])

  if (container) {
    return ReactDOM.createPortal((
      <div className={fnName}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {

          }}
        >
          Primary
        </Button>
      </div>
    ), container)
  }
  return null
}

function Marketsense (props) {
  const fnName = 'Marketsense'
  const [uuid, setUuid] = useState(null)
  const [container, setContainer] = useState(null)
  const initLeaflet = (uuid) => {
    let map = L.map(`leaflet-${uuid}`, {})
    map.setView([51.505, -0.09], 13)

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1
    }).addTo(map)

    function onMapClick (e) {
      log.debug('clicked on map', e)
    }

    map.on('click', onMapClick)
  }

  useEffect(()=> {
    log.debug(`${fnName} - useEffect - []`, { props })
    setupLogs()
  }, [])

  useEffect(() => {
    if(props.parsedUrl && props.parsedUrl.sepEventName){
      const onSepEvent = (event) => {
        log.debug(`${fnName} - onSepEvent`, event)
        if (
          event.detail
          && event.detail.action === 'init-sep-map'
          && event.detail.payload
          && event.detail.payload.mapContainerId
        ) {
          log.debug(`${fnName} - onSepEvent - setting up the container`, event)
          setContainer(document.getElementById(event.detail.payload.mapContainerId))
        }
      }

      window.addEventListener(props.parsedUrl.sepEventName, onSepEvent)
      const myEvent = new CustomEvent(props.parsedUrl.sepEventName, {
        detail: {
          action: "loaded-marketsense",
          payload: true
        }
      })

      // set the uuid for an unique leaflet container id
      let uuid = uuidv4()
      setUuid(uuid)

      window.dispatchEvent(myEvent);

      return () => {
        window.removeEventListener(props.parsedUrl.sepEventName, onSepEvent)
      }
    }
  }, [props.parsedUrl])

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [uuid, container]`, { process, props, uuid, container })
    if (uuid && container) {
      initLeaflet(uuid)
    }
  }, [uuid, container])

  const renderMapPortal = () => {
    if(container){
      return ReactDOM.createPortal((
        <div
          id={`leaflet-${uuid}`}
          css={{
            width: '100%',
            minHeight: '300px'
          }}>
        </div>
      ), container)
    }
    return null;
  }
  return (
    <React.Fragment>
      {renderMapPortal()}
      <AddressSearch {...props}/>
    </React.Fragment>
  )
}

export {
  Marketsense
}

