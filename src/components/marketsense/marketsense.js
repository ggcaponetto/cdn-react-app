import React, { useEffect, useState, useContext, useReducer, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { v4 as uuidv4 } from 'uuid'

/** @jsx jsx */
import { jsx } from '@emotion/core'
import log from 'loglevel'
log.setLevel("debug")
if(process.env.REACT_APP_ENV === "production"){
  log.setLevel("debug")
  log.debug("The logs have been disabled in production build.");
  log.setLevel("warn")
}

const setupLogs = () => {
  if(process.env.REACT_APP_ENV === "production"){
    log.setLevel("debug")
    log.debug("The logs have been disabled in production build.");
    log.setLevel("warn")
  } else {
    log.setLevel("debug")
    log.debug("The logs have been enabled in development build.");
  }
}


function Marketsense (props) {
  const fnName = "Marketsense";
  const [uuid, setUuid] = useState(null)
  const initLeaflet = (uuid) => {
    let map = L.map(`leaflet-${uuid}`, {});
    map.setView([51.505, -0.09], 13)

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1
    }).addTo(map);

    function onMapClick(e) {
      log.debug("clicked on map", e);
      window.onSEPMessage(e);
    }
    map.on('click', onMapClick);
  }
  useEffect(() => {
    setupLogs();
    log.debug(`${fnName} - useEffect`, { props })
    let uuid = uuidv4()
    setUuid(uuid)
    window.onSEPMessage("ready");
    window.onHostMessage = (e) => {
      log.debug('got host message', e );
    }
  }, [])
  useEffect(() => {
    log.debug(`${fnName} - useEffect`, { process, props, uuid })
    if (uuid) {
      initLeaflet(uuid)
    }
  }, [uuid])

  return (
    <div
      id={`leaflet-${uuid}`}
      css={{
        width: '100%',
        minHeight: '300px'
      }}>

    </div>
  )
}

export {
  Marketsense
}

