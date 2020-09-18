import React, { useEffect, useState, useContext, useReducer, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { v4 as uuidv4 } from 'uuid'

/** @jsx jsx */
import { jsx } from '@emotion/core'

function Marketsense (props) {
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
      console.log("clicked on map", e);
      window.onSEPMessage(e);
    }
    map.on('click', onMapClick);
  }
  useEffect(() => {
    console.log('useEffect', { props })
    let uuid = uuidv4()
    setUuid(uuid)
    window.onSEPMessage("ready");
    window.onHostMessage = (e) => {
      console.log('got host message', e );
    }
  }, [])
  useEffect(() => {
    console.log('useEffect - uuid', { props, uuid })
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

