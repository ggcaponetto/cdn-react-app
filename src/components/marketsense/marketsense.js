import React, { useEffect, useState, useContext, useReducer, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat/dist/leaflet-heat.js'
import { v4 as uuidv4 } from 'uuid'
import { Button, TextField, CircularProgress } from '@material-ui/core'
import Autocomplete from '@material-ui/lab/Autocomplete'
import _ from 'lodash'
import axios from 'axios'
import PouchDB from 'pouchdb'
import PouchDBFind from 'pouchdb-find'

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

  const [isLoadingObjectAddress, setIsLoadingObjectAddress] = useState(false)
  const [objectAddress, setObjectAddress] = useState(null)
  const [objectAddressResults, setObjectAddressResults] = useState([])
  const onInputChange = async (e) => {
    let value = e.target.value
    if (value.length <= 2) return
    console.log(value)
    // set the spinner
    setIsLoadingObjectAddress(true)
    let response = await getAddresses(value)
    // reset the spinner
    setIsLoadingObjectAddress(false)
    if (response.data.rows) {
      let newResults = response.data.rows.map((row, i) => {
        return {
          id: i,
          title: row.fields.address,
          row: row
        }
      })
      setObjectAddressResults(newResults)
    } else {
      setObjectAddressResults([])
    }
  }
  const getAddresses = async (searchString) => {
    let endpoint
    let headers = {}
    endpoint = `https://services.swissenergyplanning.ch/api/searchaddress`
    // auth with token
    headers = {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${props.parsedUrl.token}`
    }
    let bodyFormData = new FormData()
    bodyFormData.set('searchtext', searchString)
    let response = await axios(
      {
        method: 'post',
        url: `${endpoint}`,
        data: bodyFormData,
        headers: headers
      }
    )
    return response
  }

  useEffect(() => {
    log.debug(`${fnName} - useEffect - []`, { props })
    setupLogs()
  }, [])

  useEffect(() => {
    if (props.parsedUrl && props.parsedUrl.sepEventName) {
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
          action: 'loaded-address',
          payload: true
        }
      })
      window.dispatchEvent(myEvent)
      return () => {
        window.removeEventListener(props.parsedUrl.sepEventName, onSepEvent)
      }
    }
  }, [props.parsedUrl])

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [objectAddress]`, { objectAddress, props })
    if (objectAddress) {
      const myEvent = new CustomEvent(props.parsedUrl.sepEventName, {
        detail: {
          action: `${fnName}:onObjectAddressChange`,
          payload: objectAddress
        }
      })
      window.dispatchEvent(myEvent)
    }
  }, [objectAddress])

  if (container) {
    return ReactDOM.createPortal((
      <div className={fnName}>
        <Autocomplete
          id="object-address-autocomplete"
          loading={isLoadingObjectAddress}
          fullWidth
          options={objectAddressResults}
          getOptionLabel={(option) => option.title}
          onChange={(e) => {
            e.persist()
            console.log('autocomplete - onChange', { e })
            let address = objectAddressResults.filter((option, index) => index === parseInt(e.target.dataset.optionIndex))[0]
            setObjectAddress(address)
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <React.Fragment>
                    {isLoadingObjectAddress ? <CircularProgress color="inherit" size={20}/> : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }}
              variant="outlined"
              onChange={(e) => {
                e.persist()
                console.log('onChange', { e })
                let debounced = _.debounce(onInputChange, 300, { leading: true })
                debounced(e)
              }}
            />
          )}
        />
      </div>
    ), container)
  }
  return null
}

function Marketsense (props) {
  const fnName = 'Marketsense'
  const [uuid, setUuid] = useState(null)
  const [container, setContainer] = useState(null)
  const [map, setMap] = useState(null)
  const [heatLayer, setHeatLayer] = useState(null);
  const initLeaflet = (uuid) => {
    let myMap = L.map(`leaflet-${uuid}`, {})

    const defaultPosition = [46.948484, 8.358491]
    const defaultZoom = 9;
    myMap.setView(defaultPosition, defaultZoom)

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1
    })
      .addTo(myMap)

    function onMapClick (e) {
      log.debug('clicked on map', e)
    }

    myMap.on('click', onMapClick)
    return myMap;
  }

  const drawHeatmap = async function (map, options) {
    let filterCountViewId = `open_marketsense_1/filterCount`
    let filterViewId = `open_marketsense_1/filter`
    let docs = await getPotentialsFromCloudant(filterViewId, filterCountViewId)
    log.debug(`${fnName} - drawHeatmap - docs`, { docs })

    let heatmapPoints = docs.map(doc => {
      let split = doc.value.split(",").map(value => parseFloat(value))
      return split;
    })
    log.debug(`${fnName} - drawHeatmap`, { heatmapPoints })
    let myHeatLayer = L.heatLayer(heatmapPoints, options)
    log.debug(`${fnName} - myHeatLayer - [map]`, { myHeatLayer, heatmapPoints })
    setHeatLayer((prevHeatLayer) => {
      // remove the old heatmap layer
      if(prevHeatLayer){
        map.removeLayer(prevHeatLayer)
      }
      myHeatLayer.addTo(map)
    })
  }

  const getPotentialsFromCloudant = async (filterViewId, filterCountViewId) => {
    const urlPublic = 'https://washeduandishestylierger:b45b00cb570a9e649f159e1745b207266bb4005a@6c2fef2d-1c79-4b48-ba34-96193c57f4dd-bluemix.cloudantnosqldb.appdomain.cloud'
    const dbName = 'sync_addr_db'

    let remoteDB = new PouchDB(`${urlPublic}/${dbName}`)

    let docsCount = 0
    docsCount = await remoteDB.query(filterCountViewId, {}).then((result) => {
      // handle result
      log.debug(`${fnName} getPotentialsFromCloudant - result`, result)
      let docsCount = 0
      if (typeof result.rows[0] !== 'undefined') {
        docsCount = result.rows[0].value
      }
      return docsCount
    }).catch((e) => {
      log.warn(`${fnName} getPotentialsFromCloudant - result`, { e })
      return 0
    })
    log.warn(`${fnName} getPotentialsFromCloudant - docsCount`, { docsCount })

    let chunkSize = 500 * 1000
    let results = []

    for (let i = 0; i < docsCount; i = i + chunkSize) {
      let percentage = (i / docsCount) * 100
      log.debug(`${fnName} getPotentialsFromCloudant - progress ${percentage}`, {
        percentage
      })
      let result = await remoteDB.query(filterViewId, {
        limit: chunkSize,
        skip: i
      }).catch((e) => {
        log.debug(`${fnName} getPotentialsFromCloudant - query error`, {
          e,
          chunkSize,
          docsCount
        })
        throw e
      })
      results.push(result)
      log.debug(`${fnName} getPotentialsFromCloudant - results`, {
        results,
        docsCount
      })
    }

    let allDocs = results.reduce((acc, curr) => {
      return acc.concat(curr.rows);
    }, [])
    return allDocs;
  }

  useEffect(()=>{

  }, [heatLayer])

  useEffect(() => {
    log.debug(`${fnName} - useEffect - []`, { props })
    setupLogs()
  }, [])

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [map]`, { props })
    if (props.parsedUrl && props.parsedUrl.sepEventName) {
      const onSepEvent = (event) => {
        log.debug(`${fnName} - onSepEvent`, event)
        if (
          event.detail
          && event.detail.action === `AddressSearch:onObjectAddressChange`
          && event.detail.payload
        ) {
          log.debug(`${fnName} - onSepEvent - search address changed`, event)

          const defaultPosition = [46.948484, 8.358491]
          const defaultZoom = 9
          map.setView(defaultPosition, defaultZoom)
        }
      }
      window.addEventListener(props.parsedUrl.sepEventName, onSepEvent)
      return () => {
        window.removeEventListener(props.parsedUrl.sepEventName, onSepEvent)
      }
    }
  }, [map])

  useEffect(() => {
    if (props.parsedUrl && props.parsedUrl.sepEventName && !map) {
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
          action: 'loaded-marketsense',
          payload: true
        }
      })

      // set the uuid for an unique leaflet container id
      let uuid = uuidv4()
      setUuid(uuid)

      window.dispatchEvent(myEvent)

      return () => {
        window.removeEventListener(props.parsedUrl.sepEventName, onSepEvent)
      }
    }
  }, [props.parsedUrl])

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [uuid, container]`, { process, props, uuid, container })
    if (uuid && container) {
      let myMap = initLeaflet(uuid)
      // draw the heatmap
      drawHeatmap(
        myMap,
        {
          radius: 25
        })
      setMap(myMap)
    }
  }, [uuid, container])

  const renderMapPortal = () => {
    if (container) {
      return ReactDOM.createPortal((
        <div
          id={`leaflet-${uuid}`}
          css={{
            width: '100%',
            height: '100%',
          }}>
        </div>
      ), container)
    }
    return null
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

