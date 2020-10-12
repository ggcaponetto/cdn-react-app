import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat/dist/leaflet-heat.js'
import { v4 as uuidv4 } from 'uuid'
import { Button, TextField, CircularProgress, LinearProgress } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import Typography from '@material-ui/core/Typography'
import Autocomplete from '@material-ui/lab/Autocomplete'
import { debounce } from 'lodash'
import axios from 'axios'
import PouchDB from 'pouchdb'
// import PouchDBFind from 'pouchdb-find'
import { useTranslation } from 'react-i18next'

/** @jsx jsx */
import { jsx } from '@emotion/core'
import log from 'loglevel'

import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import styles from '../hello/hello.module.css'
import moment from 'moment'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow
})
L.Marker.prototype.options.icon = DefaultIcon

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

const getNearAddresses = async (props, lat, lng) => {
  return axios({
    method: 'get',
    url: `${props.env.APIGatewayBase}/api/addresspoints-nearest-by-coordinates?x=${lng}&y=${lat}&srid=4326`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${props.parsedUrl.token}`
    }
  })
}
const getAddress = async (props, addressId) => {
  return axios({
    method: 'get',
    url: `${props.env.APIGatewayBase}/api/marketsense/addresspoint-by-addressid/${addressId}`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${props.parsedUrl.token}`
    }
  })
}
const getAddresses = async (props, searchString) => {
  let bodyFormData = new FormData()
  bodyFormData.set('searchtext', searchString)
  let response = await axios(
    {
      method: 'post',
      url: `${props.env.APIGatewayBase}/api/searchaddress`,
      data: bodyFormData,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${props.parsedUrl.token}`
      }
    }
  )
  return response
}
const getPublicMarketsenseData = async (props, addressId) => {
  let endpoints = [
    `${props.env.APIGatewayBase}/api/marketsense/addresspoint-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/emptyparcel-addresspoint-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/parcelfeatures-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/districtfeatures-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/parcelbuildfeatures-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/parcelbuildfeatures-statistics-by-parcel-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/addresspoints-statistics-by-egid-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/addresspoints-statistics-by-parcel-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/gwrdetails-statistics-by-parcel-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/roof-statistics-by-building-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/roof-statistics-by-parcel-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/zefix-statistics-by-egid-by-addressid/${addressId}`,
    `${props.env.APIGatewayBase}/api/marketsense/zefix-statistics-by-parcel-by-addressid/${addressId}`
  ]
  let requests = endpoints.map((endopoint) => {
    return axios({
      method: 'get',
      url: endopoint,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${props.parsedUrl.token}`
      }
    })
  })
  return await Promise.all(requests)
}

const useStyles = makeStyles({
  root: {
    minWidth: 275,
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
  title: {
    fontSize: 14,
  },
  pos: {
    marginBottom: 12,
  },
})

function SimpleCard (props) {
  const fnName = 'SimpleCard'
  const classes = useStyles()
  const { t, i18n } = useTranslation('open_marketsense', { useSuspense: true })
  const getPropValue = (locizeKey, value) => {
    if (locizeKey === 'addresspoint-by-addressid-gebKategorieShort') {
      return t(`open_marketsense:${locizeKey}-${value}`)
    } else if (locizeKey === 'districtfeatures-by-addressid-districtType') {
      return t(`open_marketsense:${locizeKey}-${value}`)
    } else if (locizeKey === 'addresspoint-by-addressid-publicTransportQuality') {
      return t(`open_marketsense:${locizeKey}-${value}`)
    } else {
      return value
    }
  }
  const gerProperties = (addressData) => {
    log.debug(`${fnName} - gerProperties`, { addressData, props })
    let rows = []
    let allowedPros = [
      // 'addresspoint-by-addressid-gebKategorie', // Gebäudekategorie
      'addresspoint-by-addressid-gebKategorieShort',
      'addresspoint-by-addressid-baujahrStart', // Baujahr
      'addresspoint-by-addressid-baujahrInt', // Baujahr
      'addresspoint-by-addressid-baujahrEnde', // Baujahr
      'addresspoint-by-addressid-renovationsjahrStart', // Renovationsjahr
      'addresspoint-by-addressid-renovationsjahrInt', // Renovationsjahr
      'addresspoint-by-addressid-renovationsjahrEnde', // Renovationsjahr
      'parcelbuildfeatures-by-addressid-volumeParcelBuild', // Gebäudevolumen auf Parzelle [m3]
      'addresspoints-statistics-by-parcel-by-addressid-anzahlWohnungen', // Anzahl Wohnungen pro Parzelle
      'addresspoint-by-addressid-baumassenzifferParzelle', // Baumassenziffer Parzelle
      'parcelfeatures-by-addressid-id', // Parzelle Nr.
      'addresspoint-by-addressid-parcelArea', // Parzellenfläche [m2]
      'addresspoint-by-addressid-renovationPressure', // Renovationsdruck
      'districtfeatures-by-addressid-districtType', // Gemeindetypologie
      'addresspoint-by-addressid-publicTransportQuality', // ÖV-Güteklasse
      'districtfeatures-by-addressid-wohnungsleerstandProzent', // Wohnungsleerstand Gemeinde [%]
      'addresspoint-by-addressid-population', // Bevölkerung Gemeinde [Personen]
      'addresspoint-by-addressid-populationGrowth', // Bevölkerungswachstum Gemeinde [%]
      'addresspoint-by-addressid-populationHectar', // Bevölkerungsdichte [Personen/ha]
    ]
    addressData.forEach((dataSet, dataSetIndex) => {
      dataSet.data.forEach((data, dataIndex) => {
        let endpointPrefix = dataSet.config.url.replace('https://services.swissenergyplanning.ch/api/marketsense/', '').split('/')[0]
        for (let prop in data) {
          if (
            data.hasOwnProperty(prop)
            && allowedPros.includes(`${endpointPrefix}-${prop}`)
          ) {
            rows.push(<div key={`${dataSetIndex}_${dataIndex}_${prop}`}>
              <b>{t(`open_marketsense:${endpointPrefix}-${prop}`)}:</b> {getPropValue(`${endpointPrefix}-${prop}`, data[prop])}
            </div>)
          }
        }
      })
    })
    return <div>{rows}</div>
  }
  const getCardContent = () => {
    if (
      props.object
      && props.object.address
    ) {
      return (
        <CardContent>
          <Typography className={classes.title} color="textSecondary" gutterBottom>
            {props.object.address.street} {props.object.address.houseNumber}, {props.object.address.swissZipCode} {props.object.address.town}
          </Typography>
          <Typography variant="body2" component="div">
            {gerProperties(props.object.addressData)}
          </Typography>
        </CardContent>
      )
    }
    return null
  }
  return (
    <Card className={classes.root}>
      {getCardContent()}
    </Card>
  )
}

function ObjectDisplay (props) {
  const fnName = 'ObjectDisplay'
  const [container, setContainer] = useState(null)
  const [object, setObject] = useState(null)
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
          && event.detail.action === 'init-sep-object-display'
          && event.detail.payload
          && event.detail.payload.objectDisplayContainerId
        ) {
          log.debug(`${fnName} - onSepEvent - setting up the container`, event)
          setContainer(document.getElementById(event.detail.payload.objectDisplayContainerId))
        }

        if (
          event.detail
          && event.detail.action === `Marketsense:onMapClick`
          && event.detail.payload
        ) {
          log.debug(`${fnName} - onSepEvent - search address changed`, event)
          setObject(event.detail.payload)
        }
      }

      window.addEventListener(props.parsedUrl.sepEventName, onSepEvent)
      const myEvent = new CustomEvent(props.parsedUrl.sepEventName, {
        detail: {
          action: 'loaded-sep-object-display',
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
    log.debug(`${fnName} - useEffect - [object]`, { object, props })
  }, [object])

  if (container) {
    return ReactDOM.createPortal((
      <div className={fnName}>
        {(() => {
          if (props.isLoadingAddressData) {
            return <LinearProgress/>
          }
          if (object) {
            return <SimpleCard object={object}/>
          }
        })()}
      </div>
    ), container)
  }
  return null
}

function AddressSearch (props) {
  const fnName = 'AddressSearch'
  const [container, setContainer] = useState(null)
  const { t, i18n } = useTranslation('open_marketsense', { useSuspense: true })
  const [isLoadingObjectAddress, setIsLoadingObjectAddress] = useState(false)
  const [objectAddress, setObjectAddress] = useState(null)
  const [objectAddressResults, setObjectAddressResults] = useState([])

  const onInputChange = async (value) => {
    if (value.length <= 2) return
    log.log(value)
    // set the spinner
    setIsLoadingObjectAddress(true)
    let response = await getAddresses(props, value)
    // reset the spinner
    setIsLoadingObjectAddress(false)
    if (response.data.rows) {
      let newResults = response.data.rows.map((row, i) => {
        return {
          id: i,
          title: row.fields.address,
          row: row
        }
      }).sort((a, b) => {
        if (a.title < b.title) { return -1 }
        if (a.title > b.title) { return 1 }
        return 0
      })
      setObjectAddressResults(newResults)
    } else {
      setObjectAddressResults([])
    }
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
      <div
        className={fnName}
        style={{
          background: 'white'
        }}
      >
        {props.parsedUrl.controls === 'true' ?
          (
            <div className={'controls'} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  i18n.changeLanguage('de-ch')
                }}
              >
                DE
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  i18n.changeLanguage('it-ch')
                }}
              >
                IT
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  i18n.changeLanguage('fr-ch')
                }}
              >
                FR
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  i18n.changeLanguage('en')
                }}
              >
                EN
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  let filterCountViewId = `open_marketsense_transaction_manager/filterCount`
                  let filterViewId = `open_marketsense_transaction_manager/filter`
                  props.setFilter({
                    filterViewId, filterCountViewId
                  })
                }}
              >
                {t(`open_marketsense:filter-transaction-manager`)}
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  let filterCountViewId = `open_marketsense_gu_tu/filterCount`
                  let filterViewId = `open_marketsense_gu_tu/filter`
                  props.setFilter({
                    filterViewId, filterCountViewId
                  })
                }}
              >
                {t(`open_marketsense:filter-gu-tu`)}
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  let filterCountViewId = `open_marketsense_private_investor/filterCount`
                  let filterViewId = `open_marketsense_private_investor/filter`
                  props.setFilter({
                    filterViewId, filterCountViewId
                  })
                }}
              >
                {t(`open_marketsense:filter-private-investor`)}
              </Button>
            </div>
          )
          : null
        }
        <Autocomplete
          id="object-address-autocomplete"
          loading={isLoadingObjectAddress}
          autoComplete
          autoSelect
          fullWidth
          options={objectAddressResults}
          getOptionLabel={(option) => option.title}
          value={objectAddressResults.filter((option, index) => option.title === objectAddress && objectAddress.title)[0]}
          getOptionSelected={(option, value) => {
            log.log('autocomplete - getOptionSelected', { option, value })
            return option.title === value.title
          }}
          onChange={(event, value) => {
            event.persist()
            log.log('autocomplete - onChange', { event, objectAddressResults })
            let address = objectAddressResults.filter((option, index) => index === parseInt(event.target.dataset.optionIndex))[0]
            if (address) {
              log.log('autocomplete - onChange - address', { address, objectAddress })
              setObjectAddress(address)
            }
          }}
          onInputChange={(event, value) => {
            log.log('onInputChange', { event, value })
            let debounced = debounce(onInputChange, 300, { leading: true })
            debounced(value)

            let address = objectAddressResults.filter((option, index) => option.title === value)[0]
            log.log('autocomplete - onInputChange - address', { objectAddressResults, value })
            if (address) {
              setObjectAddress(address)
            }
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
            />
          )}
        />
      </div>
    ), container)
  }
  return null
}

export default function Marketsense (props) {
  const fnName = 'Marketsense'
  const { t, i18n } = useTranslation('open_marketsense', { useSuspense: true })
  const [uuid, setUuid] = useState(null)
  const [container, setContainer] = useState(null)
  const [map, setMap] = useState(null)
  const [heatLayer, setHeatLayer] = useState(null)
  const [searchMarker, setSearchMarker] = useState(null)
  const [isLoadingOverview, setIsLoadingOverview] = useState(false)
  const [isLoadingAddressData, setIsLoadingAddressData] = useState(false)

  async function onMapClick (e) {
    log.debug('clicked on map', e)
    setIsLoadingAddressData(true)
    let nearestAddresses = await getNearAddresses(props, e.latlng.lat, e.latlng.lng)
    // let addressResponse = await getAddress(props, addressId)
    let address = nearestAddresses.data[0]
    if (address) {
      let addressData = await getPublicMarketsenseData(props, address.id)
      log.debug(`${fnName} - onSepEvent - search address changed - addressData`, { addressData, address })

      const myEvent = new CustomEvent(props.parsedUrl.sepEventName, {
        detail: {
          action: `${fnName}:onMapClick`,
          payload: {
            address,
            addressData
          }
        }
      })
      window.dispatchEvent(myEvent)
    }
    setIsLoadingAddressData(false)
    log.debug(`${fnName} - onSepEvent - search address changed - address`, { nearestAddresses, e })
  }

  const initLeaflet = (uuid) => {
    let myMap = L.map(`leaflet-${uuid}`, {})

    const defaultPosition = [46.948484, 8.358491]
    const defaultZoom = 8
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
    myMap.on('click', onMapClick)
    return myMap
  }
  const [filter, setFilter] = useState(null)

  const drawHeatmap = async function (map, options) {
    setIsLoadingOverview(true)
    let docs = await getPotentialsFromCloudant(filter.filterViewId, filter.filterCountViewId)
    log.debug(`${fnName} - drawHeatmap - docs`, { docs })

    let heatmapPoints = docs.map(doc => {
      let split = doc.value.split(',').map(value => parseFloat(value))
      return split
    })
    log.debug(`${fnName} - drawHeatmap`, { heatmapPoints })
    let myHeatLayer = L.heatLayer(heatmapPoints, options)
    log.debug(`${fnName} - myHeatLayer - [map]`, { myHeatLayer, heatmapPoints })

    if (heatLayer) {
      map.removeLayer(heatLayer)
    }

    setHeatLayer(() => {
      myHeatLayer.addTo(map)
      setIsLoadingOverview(false)
      return myHeatLayer
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
      return acc.concat(curr.rows)
    }, [])
    return allDocs
  }

  useEffect(() => {

  }, [heatLayer])

  useEffect(() => {
    log.debug(`${fnName} - useEffect - []`, { props })
    setupLogs()
  }, [])

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [map]`, { props })
    if (props.parsedUrl && props.parsedUrl.sepEventName) {
      const getAddressById = async (addressId) => {
        let addressResponse = await getAddress(props, addressId)
        let address = addressResponse.data[0]
        return address
      }
      const setMap = async (address) => {
        let addressData = await getPublicMarketsenseData(props, address.id)
        log.debug(`${fnName} - onSepEvent - search address changed - address`, { addressData })
        const defaultPosition = [address.lat, address.long]
        const defaultZoom = 21
        map.setView(defaultPosition, defaultZoom)
      }
      const drawMarker = async (address) => {

        let marker = L.circle([address.lat, address.long], {
          color: props.theme.palette.primary.main,
          fillColor: props.theme.palette.primary.light,
          fillOpacity: 0.5,
          radius: 5
        }).addTo(map)

        setSearchMarker((prevMarker) => {
          if (prevMarker) {
            map.removeLayer(prevMarker)
          }
          marker.addTo(map)
          return marker
        })
      }
      const onSepEvent = async (event) => {
        log.debug(`${fnName} - onSepEvent`, event)
        if (
          event.detail
          && event.detail.action === `AddressSearch:onObjectAddressChange`
          && event.detail.payload
        ) {
          log.debug(`${fnName} - onSepEvent - search address changed`, event)
          let address = await getAddressById(event.detail.payload.row.fields.id)
          setMap(address)
          drawMarker(address)
          onMapClick({ latlng: { lat: address.lat, lng: address.long } })
          // let addresses = getNearAddresses(event.detail.objectAddress.lat, event.detail.objectAddress.long)
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

      let filterCountViewId = props.parsedUrl.filterCountViewId
      let filterViewId = props.parsedUrl.filterViewId
      setFilter({ filterViewId, filterCountViewId })

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
          radius: 25,
          'gradient': {
            '0.80': props.theme.palette.secondary.light,
            '0.90': props.theme.palette.secondary.main,
            '0.95': props.theme.palette.primary.light,
            '1.0': props.theme.palette.primary.main
          }
        })
      setMap(myMap)
    }
  }, [uuid, container])

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [filter]`, { process, props, uuid, container })
    if (filter && map) {
      drawHeatmap(
        map,
        {
          radius: 25,
          'gradient': {
            '0.80': props.theme.palette.secondary.light,
            '0.90': props.theme.palette.secondary.main,
            '0.95': props.theme.palette.primary.light,
            '1.0': props.theme.palette.primary.main
          }
        })
    }
  }, [filter])

  const renderMapPortal = () => {
    if (container) {
      return ReactDOM.createPortal((
        <React.Fragment>
          {isLoadingOverview ? <LinearProgress/> : null}
          <div
            id={`leaflet-${uuid}`}
            css={{
              width: '100%',
              height: '100%',
            }}>
          </div>
          {isLoadingOverview ? <LinearProgress/> : null}
        </React.Fragment>
      ), container)
    }
    return null
  }
  return (
    <React.Fragment>
      {renderMapPortal()}
      <AddressSearch
        {...props}
        setFilter={setFilter}
      />
      <ObjectDisplay
        {...props}
        isLoadingAddressData={isLoadingAddressData}
      />
    </React.Fragment>
  )
}


