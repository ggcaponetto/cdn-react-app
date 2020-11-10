import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat/dist/leaflet-heat.js';
import { v4 as uuidv4 } from 'uuid';
import {
  Button, TextField, CircularProgress, LinearProgress,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { debounce } from 'lodash';
import axios from 'axios';
import PouchDB from 'pouchdb';
// import PouchDBFind from 'pouchdb-find'
import { useTranslation } from 'react-i18next';

/** @jsx jsx */
import { jsx } from '@emotion/core';
import log from 'loglevel';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import moment from 'moment';
import styles from '../hello/hello.module.css';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});
L.Marker.prototype.options.icon = DefaultIcon;

const setupLogs = () => {
  if (process.env.REACT_APP_ENV === 'production') {
    log.setLevel('debug');
    log.debug('The logs have been disabled in production build.');
    log.setLevel('warn');
  } else {
    log.setLevel('debug');
    log.debug('The logs have been enabled in development build.');
  }
};

const getNearAddresses = async (props, lat, lng) => axios({
  method: 'get',
  url: `${props.env.APIGatewayBase}/api/addresspoints-nearest-by-coordinates?x=${lng}&y=${lat}&srid=4326`,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${props.parsedUrl.token}`,
  },
});
const getAddress = async (props, addressId) => axios({
  method: 'get',
  url: `${props.env.APIGatewayBase}/api/marketsense/addresspoint-by-addressid/${addressId}`,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${props.parsedUrl.token}`,
  },
});
const getAddresses = async (props, searchString) => {
  const bodyFormData = new FormData();
  bodyFormData.set('searchtext', searchString);
  const response = await axios(
    {
      method: 'post',
      url: `${props.env.APIGatewayBase}/api/searchaddress`,
      data: bodyFormData,
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${props.parsedUrl.token}`,
      },
    },
  );
  return response;
};
const getPublicSEPData = async (props, addressId) => {
  const endpoints = [
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
    `${props.env.APIGatewayBase}/api/marketsense/zefix-statistics-by-parcel-by-addressid/${addressId}`,

    `${props.env.APIGatewayBase}/api/buildings/${addressId}/featurecollection-by-parcel`,
    `${props.env.APIGatewayBase}/api/roof-geometries?buildingidsep=[in]${addressId}&klasse=[e]1&flaeche=[ge]15`,
  ];
  const requests = endpoints.map((endopoint) => axios({
    method: 'get',
    url: endopoint,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${props.parsedUrl.token}`,
    },
  }));
  const settledPromises = await Promise.allSettled(requests);
  return settledPromises.filter((response) => response.status === 'fulfilled').map((response) => response.value);
};

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
});

function SimpleCard(props) {
  const fnName = 'SimpleCard';
  const classes = useStyles();
  const { t, i18n } = useTranslation('open_marketsense', { useSuspense: true });
  const getPropValue = (locizeKey, value) => {
    if (locizeKey === 'addresspoint-by-addressid-gebKategorieShort') {
      return t(`open_marketsense:${locizeKey}-${value}`);
    } if (locizeKey === 'districtfeatures-by-addressid-districtType') {
      return t(`open_marketsense:${locizeKey}-${value}`);
    } if (locizeKey === 'addresspoint-by-addressid-publicTransportQuality') {
      return t(`open_marketsense:${locizeKey}-${value}`);
    }
    return value;
  };
  const gerProperties = (addressData) => {
    log.debug(`${fnName} - gerProperties`, { addressData, props });
    const rows = [];
    const allowedPros = [
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
    ];
    addressData.forEach((dataSet, dataSetIndex) => {
      const isDataArray = Array.isArray(dataSet.data);
      if (isDataArray) {
        dataSet.data.forEach((data, dataIndex) => {
          const endpointPrefix = dataSet.config.url.replace(`${props.env.APIGatewayBase}/api/marketsense/`, '').split('/')[0];
          for (const prop in data) {
            if (
              data.hasOwnProperty(prop)
              && allowedPros.includes(`${endpointPrefix}-${prop}`)
            ) {
              rows.push(<div key={`${dataSetIndex}_${dataIndex}_${prop}`}>
                <b>
                  {t(`open_marketsense:${endpointPrefix}-${prop}`)}
                  :
                </b>
                {' '}
                {getPropValue(`${endpointPrefix}-${prop}`, data[prop])}
              </div>);
            }
          }
        });
      }
    });
    return <div>{rows}</div>;
  };
  const getCardContent = () => {
    if (
      props.object
      && props.object.address
    ) {
      return (
        <CardContent>
          <Typography className={classes.title} color="textSecondary" gutterBottom>
            {props.object.address.street}
            {' '}
            {props.object.address.houseNumber}
            ,
            {' '}
            {props.object.address.swissZipCode}
            {' '}
            {props.object.address.town}
          </Typography>
          <Typography variant="body2" component="div">
            {gerProperties(props.object.addressData)}
          </Typography>
        </CardContent>
      );
    }
    return null;
  };
  return (
    <Card className={classes.root}>
      {getCardContent()}
    </Card>
  );
}

function ObjectDisplay(props) {
  const fnName = 'ObjectDisplay';
  const [container, setContainer] = useState(null);
  const [object, setObject] = useState(null);
  useEffect(() => {
    log.debug(`${fnName} - useEffect - []`, { props });
    setupLogs();
  }, []);

  useEffect(() => {
    if (props.parsedUrl && props.parsedUrl.sepEventName) {
      const onSepEvent = (event) => {
        log.debug(`${fnName} - onSepEvent`, event);
        if (
          event.detail
          && event.detail.action === 'init-sep-object-display'
          && event.detail.payload
          && event.detail.payload.objectDisplayContainerId
        ) {
          log.debug(`${fnName} - onSepEvent - setting up the container`, event);
          setContainer(document.getElementById(event.detail.payload.objectDisplayContainerId));
        }

        if (
          event.detail
          && event.detail.action === 'Marketsense:onMapClick'
          && event.detail.payload
        ) {
          log.debug(`${fnName} - onSepEvent - search address changed`, event);
          setObject(event.detail.payload);
        }
      };

      window.addEventListener(props.parsedUrl.sepEventName, onSepEvent);
      const myEvent = new CustomEvent(props.parsedUrl.sepEventName, {
        detail: {
          action: 'loaded-sep-object-display',
          payload: true,
        },
      });
      window.dispatchEvent(myEvent);
      return () => {
        window.removeEventListener(props.parsedUrl.sepEventName, onSepEvent);
      };
    }
  }, [props.parsedUrl]);

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [object]`, { object, props });
  }, [object]);

  if (container) {
    return ReactDOM.createPortal((
      <div className={fnName}>
        {(() => {
          if (props.isLoadingAddressData) {
            return <LinearProgress />;
          }
          if (object) {
            return (
              <SimpleCard
                {...props}
                object={object}
              />
            );
          }
        })()}
      </div>
    ), container);
  }
  return null;
}

function AddressSearch(props) {
  const fnName = 'AddressSearch';
  const [container, setContainer] = useState(null);
  const { t, i18n } = useTranslation('open_marketsense', { useSuspense: true });
  const [isLoadingObjectAddress, setIsLoadingObjectAddress] = useState(false);
  const [objectAddress, setObjectAddress] = useState(null);
  const [objectAddressResults, setObjectAddressResults] = useState([]);

  const onInputChange = async (value) => {
    if (value.length <= 2) return;
    log.log(value);
    // set the spinner
    setIsLoadingObjectAddress(true);
    const response = await getAddresses(props, value);
    // reset the spinner
    setIsLoadingObjectAddress(false);
    if (response.data.rows) {
      const newResults = response.data.rows.map((row, i) => ({
        id: i,
        title: row.fields.address,
        row,
      })).sort((a, b) => {
        if (a.title < b.title) { return -1; }
        if (a.title > b.title) { return 1; }
        return 0;
      });
      setObjectAddressResults(newResults);
    } else {
      setObjectAddressResults([]);
    }
  };

  useEffect(() => {
    log.debug(`${fnName} - useEffect - []`, { props });
    setupLogs();
  }, []);

  useEffect(() => {
    if (props.parsedUrl && props.parsedUrl.sepEventName) {
      const onSepEvent = (event) => {
        log.debug(`${fnName} - onSepEvent`, event);
        if (
          event.detail
          && event.detail.action === 'init-sep-address'
          && event.detail.payload
          && event.detail.payload.addressContainerId
        ) {
          log.debug(`${fnName} - onSepEvent - setting up the container`, event);
          setContainer(document.getElementById(event.detail.payload.addressContainerId));
        }
      };

      window.addEventListener(props.parsedUrl.sepEventName, onSepEvent);
      const myEvent = new CustomEvent(props.parsedUrl.sepEventName, {
        detail: {
          action: 'loaded-address',
          payload: true,
        },
      });
      window.dispatchEvent(myEvent);
      return () => {
        window.removeEventListener(props.parsedUrl.sepEventName, onSepEvent);
      };
    }
  }, [props.parsedUrl]);

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [objectAddress]`, { objectAddress, props });
    if (objectAddress) {
      const myEvent = new CustomEvent(props.parsedUrl.sepEventName, {
        detail: {
          action: `${fnName}:onObjectAddressChange`,
          payload: objectAddress,
        },
      });
      window.dispatchEvent(myEvent);
    }
  }, [objectAddress]);

  if (container) {
    return ReactDOM.createPortal((
      <div
        className={fnName}
        style={{
          background: 'white',
        }}
      >
        {props.parsedUrl.controls === 'true'
          ? (
            <div
              className="controls"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  i18n.changeLanguage('de-ch');
                }}
              >
                DE
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  i18n.changeLanguage('it-ch');
                }}
              >
                IT
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  i18n.changeLanguage('fr-ch');
                }}
              >
                FR
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  i18n.changeLanguage('en');
                }}
              >
                EN
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  const filterCountViewId = 'open_marketsense_transaction_manager/filterCount';
                  const filterViewId = 'open_marketsense_transaction_manager/filter';
                  props.setFilter({
                    filterViewId, filterCountViewId,
                  });
                }}
              >
                {t('open_marketsense:filter-transaction-manager')}
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  const filterCountViewId = 'open_marketsense_gu_tu/filterCount';
                  const filterViewId = 'open_marketsense_gu_tu/filter';
                  props.setFilter({
                    filterViewId, filterCountViewId,
                  });
                }}
              >
                {t('open_marketsense:filter-gu-tu')}
              </Button>
              <Button
                color="primary"
                variant="outlined"
                size="small"
                onClick={() => {
                  const filterCountViewId = 'open_marketsense_private_investor/filterCount';
                  const filterViewId = 'open_marketsense_private_investor/filter';
                  props.setFilter({
                    filterViewId, filterCountViewId,
                  });
                }}
              >
                {t('open_marketsense:filter-private-investor')}
              </Button>
            </div>
          )
          : null}
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
            log.log('autocomplete - getOptionSelected', { option, value });
            return option.title === value.title;
          }}
          onChange={(event, value) => {
            event.persist();
            log.log('autocomplete - onChange', { event, objectAddressResults });
            const address = objectAddressResults.filter((option, index) => index === parseInt(event.target.dataset.optionIndex))[0];
            if (address) {
              log.log('autocomplete - onChange - address', { address, objectAddress });
              setObjectAddress(address);
            }
          }}
          onInputChange={(event, value) => {
            log.log('onInputChange', { event, value });
            const debounced = debounce(onInputChange, 300, { leading: true });
            debounced(value);

            const address = objectAddressResults.filter((option, index) => option.title === value)[0];
            log.log('autocomplete - onInputChange - address', { objectAddressResults, value });
            if (address) {
              setObjectAddress(address);
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <React.Fragment>
                    {isLoadingObjectAddress ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }}
              variant="outlined"
            />
          )}
        />
      </div>
    ), container);
  }
  return null;
}

export default function Marketsense(props) {
  const fnName = 'Marketsense';
  const { t, i18n } = useTranslation('open_marketsense', { useSuspense: true });
  const [uuid, setUuid] = useState(null);
  const [container, setContainer] = useState(null);
  const [map, setMap] = useState(null);
  const [heatLayer, setHeatLayer] = useState(null);
  const [searchMarker, setSearchMarker] = useState(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingAddressData, setIsLoadingAddressData] = useState(false);

  async function onMapClick(e) {
    log.debug('clicked on map', e);
    setIsLoadingAddressData(true);
    const nearestAddresses = await getNearAddresses(props, e.latlng.lat, e.latlng.lng);
    // let addressResponse = await getAddress(props, addressId)
    const address = nearestAddresses.data[0];
    if (address) {
      const addressData = await getPublicSEPData(props, address.id);
      log.debug(`${fnName} - onSepEvent - search address changed - addressData`, { addressData, address });

      const myEvent = new CustomEvent(props.parsedUrl.sepEventName, {
        detail: {
          action: `${fnName}:onMapClick`,
          payload: {
            address,
            addressData,
          },
        },
      });
      window.dispatchEvent(myEvent);
    }
    setIsLoadingAddressData(false);
    log.debug(`${fnName} - onSepEvent - search address changed - address`, { nearestAddresses, e });
  }

  const setLayer = (myMap) => {
    const modifyLeafletHeaders = () => {
      // https://github.com/Esri/esri-leaflet/issues/743
      L.TileLayer.WMS_Headers = L.TileLayer.WMS.extend({
        setUrl(url, noRedraw) {
          if (this._url === url && noRedraw === undefined) {
            noRedraw = true;
          }

          this._url = url;

          if (!noRedraw) {
            this.redraw();
          }
          return this;
        },
        _removeTile(key) {
          log.debug('modifyLeafletHeaders _removeTile', { key, this: this, L });
          const tile = this._tiles[key];
          if (!tile) {
            log.debug('modifyLeafletHeaders _removeTile - no tile', {
              key, tile, this: this, L,
            });
            return;
          }
          // Cancels any pending http requests associated with the tile
          // unless we're on Android's stock browser,
          // see https://github.com/Leaflet/Leaflet/issues/137
          if (!L.Browser.androidStock) {
            log.debug('modifyLeafletHeaders _removeTile - android', {
              key, tile, this: this, L,
            });
            tile.el.setAttribute('src', L.Util.emptyImageUrl);
          }
          return L.GridLayer.prototype._removeTile.call(this, key);
        },
        _tileOnError(done, tile, e) {
          log.debug('modifyLeafletHeaders _tileOnError', {
            done, tile, e, this: this, L,
          });
          const errorUrl = this.options.errorTileUrl;
          if (errorUrl && tile.getAttribute('src') !== errorUrl) {
            tile.src = errorUrl;
          }
          done(e, tile);
        },
        _abortLoading() {
          log.debug('modifyLeafletHeaders _abortLoading', { this: this, L });
          const mapZoom = this._map._zoom;
          if (
            mapZoom >= 18
          ) {
            log.debug('modifyLeafletHeaders _abortLoading - zoom', { mapZoom, this: this, L });
          }

          let i; let
            tile;
          for (i in this._tiles) {
            if (this._tiles[i].coords.z !== this._tileZoom) {
              log.debug('modifyLeafletHeaders _abortLoading - z coord !== tileZoom', {
                tileZoom: this._tileZoom,
                this: this,
                L,
              });
              tile = this._tiles[i].el;

              tile.onload = L.Util.falseFn;
              tile.onerror = L.Util.falseFn;

              if (!tile.complete) {
                tile.src = L.Util.emptyImageUrl;
                log.debug('modifyLeafletHeaders _abortLoading - removed tile', { tile, this: this, L });
                L.DomUtil.remove(tile);
                delete this._tiles[i];
              }
            }
          }
        },
        _tileOnLoad(done, tile) {
          log.debug('modifyLeafletHeaders _tileOnLoad', {
            tile, done, this: this, L,
          });
          // For https://github.com/Leaflet/Leaflet/issues/3332
          if (L.Browser.ielt9) {
            setTimeout(L.Util.bind(done, this, null, tile), 0);
          } else {
            done(null, tile);
          }
        },
        _getZoomForUrl() {
          let zoom = this._tileZoom;
          const { maxZoom } = this.options;
          const { zoomReverse } = this.options;
          const { zoomOffset } = this.options;

          if (zoomReverse) {
            zoom = maxZoom - zoom;
          }
          const finalZoom = zoom + zoomOffset;
          return finalZoom;
        },
        _tileReady(coords, err, tile) {
          log.debug('modifyLeafletHeaders _tileReady', {
            tile, coords, err, this: this, L,
          });
          if (
            !this._map
            || (tile && tile.getAttribute('src') === L.Util.emptyImageUrl)
          ) {
            log.debug('modifyLeafletHeaders _tileReady - no src or map', {
              tile,
              coords,
              err,
              this: this,
              L,
              src: tile.getAttribute('src'),
              emptyImageUrl: L.Util.emptyImageUrl,
            });
          } else {
            log.debug('modifyLeafletHeaders _tileReady - src found', {
              tile,
              coords,
              err,
              this: this,
              L,
              src: tile.getAttribute('src'),
              emptyImageUrl: L.Util.emptyImageUrl,
            });
            return L.GridLayer.prototype._tileReady.call(this, coords, err, tile);
          }
        },
        getTileUrl(coords) {
          const { getParamString } = L.Util;

          const tileBounds = this._tileCoordsToNwSe(coords);
          const crs = this._crs;
          const bounds = new L.Bounds(crs.project(tileBounds[0]), crs.project(tileBounds[1]));
          const { min } = bounds;
          const { max } = bounds;
          const bbox = (this._wmsVersion >= 1.3 && this._crs === L.CRS.EPSG4326
            ? [min.y, min.x, max.y, max.x]
            : [min.x, min.y, max.x, max.y]).join(',');
          const url = L.TileLayer.prototype.getTileUrl.call(this, coords);
          const tileUrl = url
            + getParamString(this.wmsParams, url, this.options.uppercase)
            + (this.options.uppercase ? '&BBOX=' : '&bbox=') + bbox;
          log.debug('modifyLeafletHeaders getTileUrl', {
            tileUrl, coords, this: this, L,
          });
          return tileUrl;
        },
        createTile(coords, done) {
          const url = this.getTileUrl(coords);
          log.debug('modifyLeafletHeaders createTile', url);
          const img = document.createElement('img');
          axios(
            {
              method: 'get',
              url,
              responseType: 'blob',
              headers: {
                /* 'Authorization': `Bearer ${jwt}`, */
                /* 'Referer': 'https://energyapps.ch' */
              },
            },
          )
            .then((response) => {
              log.debug('modifyLeafletHeaders response', response);
              img.src = URL.createObjectURL(response.data);
              done(null, img);
            })
            .catch((e) => {
              hycon.error('modifyLeafletHeaders error', e);
              // img.src = URL.createObjectURL(response.data);
              done(null, img);
            });
          return img;
        },
      });
      L.tileLayer.wms_headers = (url, options) => new L.TileLayer.WMS_Headers(url, { ...options });
    };
    const getLeafletLayerUrls = () => {
      const baseWMTS = 'https://map-proxy.exoscale.swissenergyplanning.ch/wmts-proxy';
      const baseWMS = 'https://map-proxy.exoscale.swissenergyplanning.ch/wms-proxy';
      const MAP_SWISSTOPO_GREY_URL = `${baseWMTS}/1.0.0/ch.swisstopo.pixelkarte-grau/default/current/3857/{z}/{x}/{y}.jpeg`;
      const MAP_SWISSTOPO_STREETNAMES = `${baseWMS}/?`;
      const MAP_SWISSTOPO_COLOR_URL = `${baseWMTS}/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg`;
      const MAP_CADASTRAL_COLOR_URL = `${baseWMTS}/1.0.0/ch.kantone.cadastralwebmap-farbe/default/current/3857/{z}/{x}/{y}.png`;

      return {
        MAP_SWISSTOPO_GREY_URL,
        MAP_SWISSTOPO_COLOR_URL,
        MAP_CADASTRAL_COLOR_URL,
        MAP_SWISSTOPO_STREETNAMES,
      };
    };
    const getLayerGroup = (targetBaseLayer) => {
      log.debug(`${fnName} getLayerGroup`, targetBaseLayer);
      const subLayers = targetBaseLayer.layers;
      const layerArray = [];
      Object.keys(subLayers).forEach((p) => {
        const subLayer = subLayers[p];
        const { type } = subLayer;
        const { url } = subLayer;
        const { options } = subLayer;
        if (type === 'wms') {
          const layer = L.tileLayer.wms(url, options);
          layerArray.push(layer);
        } else if (type === 'wmts') {
          modifyLeafletHeaders();
          L.tileLayer.wms_headers(url, options);
          const layer = L.tileLayer(url, options);
          layerArray.push(layer);
        }
      });
      const layerGroup = L.layerGroup(layerArray);
      log.debug(`${fnName} getLayerGroup`, { layerArray, layerGroup });
      return layerGroup;
    };

    const {
      MAP_SWISSTOPO_GREY_URL,
      MAP_SWISSTOPO_COLOR_URL,
      MAP_CADASTRAL_COLOR_URL,
      MAP_SWISSTOPO_STREETNAMES,
    } = getLeafletLayerUrls();
    const LEAFLET_MAX_NATIVE_ZOOM_LEVEL = 18;

    const baseLayers = {
      MAP_OSM: {
        url: 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
        options: {
          maxZoom: 18,
          attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, '
            + '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, '
            + 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
          id: 'mapbox/streets-v11',
          tileSize: 512,
          zoomOffset: -1,
        },
      },
      MAP_SWISSTOPO_GREY_URL: {
        layers: {
          MAP_SWISSTOPO_GREY_URL: {
            type: 'wmts',
            url: MAP_SWISSTOPO_GREY_URL,
            options: {
              maxZoom: 21,
              maxNativeZoom: LEAFLET_MAX_NATIVE_ZOOM_LEVEL,
              opacity: 1,
            },
          },
          MAP_SWISSTOPO_STREETNAMES: {
            type: 'wms',
            url: MAP_SWISSTOPO_STREETNAMES,
            options: {
              layers: 'ch.swisstopo.amtliches-strassenverzeichnis',
              format: 'image/png',
              transparent: true,
              bgcolor: 'ffffff',
              opacity: 0.82,
              maxZoom: 21,
              maxNativeZoom: LEAFLET_MAX_NATIVE_ZOOM_LEVEL,
              className: 'custom-layer MAP_SWISSTOPO_STREETNAMES',
              minZoom: 18,
            },
          },
        },
      },
      MAP_SWISSTOPO_COLOR_URL: {
        layers: {
          MAP_SWISSTOPO_COLOR_URL: {
            type: 'wmts',
            url: MAP_SWISSTOPO_COLOR_URL,
            options: {
              maxZoom: 21,
              maxNativeZoom: LEAFLET_MAX_NATIVE_ZOOM_LEVEL,
              opacity: 1,
            },
          },
          MAP_SWISSTOPO_STREETNAMES: {
            type: 'wms',
            url: MAP_SWISSTOPO_STREETNAMES,
            options: {
              layers: 'ch.swisstopo.amtliches-strassenverzeichnis',
              format: 'image/png',
              transparent: true,
              bgcolor: 'ffffff',
              opacity: 0.82,
              maxZoom: 21,
              maxNativeZoom: LEAFLET_MAX_NATIVE_ZOOM_LEVEL,
              className: 'custom-layer MAP_SWISSTOPO_STREETNAMES',
              minZoom: 18,
            },
          },
        },
      },
      MAP_CADASTRAL_COLOR_URL: {
        layers: {
          MAP_CADASTRAL_COLOR_URL: {
            type: 'wmts',
            url: MAP_CADASTRAL_COLOR_URL,
            options: {
              maxZoom: 21,
              maxNativeZoom: LEAFLET_MAX_NATIVE_ZOOM_LEVEL,
              opacity: 1,
            },
          },
        },
      },
      MAP_GOOGLE_SATELLITE: {
        layers: {
          MAP_GOOGLE_SATELLITE: {
            type: null,
            url: null,
            options: null,
          },
        },

      },
    };
    const baseLayersGroup = getLayerGroup(baseLayers[`${props.parsedUrl.mapLayer}`]);
    baseLayersGroup.addTo(myMap);
  };
  const initLeaflet = (myUuid) => {
    const myMap = L.map(`leaflet-${myUuid}`, {});
    const defaultPosition = [46.948484, 8.358491];
    const defaultZoom = 8;
    myMap.setView(defaultPosition, defaultZoom);
    myMap.on('click', onMapClick);
    setLayer(myMap);
    const attribution = (
      <div css={{
        fontSize: '1.5em',
      }}
      >
        powered by
        {' '}
        <a href="https://swissenergyplanning.ch" target="_blank" rel="noreferrer">SEP &copy;</a>
      </div>
    );
    myMap.attributionControl.setPrefix(null);
    myMap.attributionControl.setPosition('bottomleft');
    myMap.attributionControl.addAttribution(ReactDOMServer.renderToStaticMarkup(attribution));
    return myMap;
  };
  const [filter, setFilter] = useState(null);

  const drawHeatmap = async function (map, options) {
    setIsLoadingOverview(true);
    const docs = await getPotentialsFromCloudant(filter.filterViewId, filter.filterCountViewId);
    log.debug(`${fnName} - drawHeatmap - docs`, { docs });

    const heatmapPoints = docs.map((doc) => {
      const split = doc.value.split(',').map((value) => parseFloat(value));
      return split;
    });
    log.debug(`${fnName} - drawHeatmap`, { heatmapPoints });
    const myHeatLayer = L.heatLayer(heatmapPoints, options);
    log.debug(`${fnName} - myHeatLayer - [map]`, { myHeatLayer, heatmapPoints });

    if (heatLayer) {
      map.removeLayer(heatLayer);
    }

    setHeatLayer(() => {
      myHeatLayer.addTo(map);
      setIsLoadingOverview(false);
      return myHeatLayer;
    });
  };

  const getPotentialsFromCloudant = async (filterViewId, filterCountViewId) => {
    const urlPublic = 'https://washeduandishestylierger:b45b00cb570a9e649f159e1745b207266bb4005a@6c2fef2d-1c79-4b48-ba34-96193c57f4dd-bluemix.cloudantnosqldb.appdomain.cloud';
    const dbName = 'sync_addr_db';

    const remoteDB = new PouchDB(`${urlPublic}/${dbName}`);

    let docsCount = 0;
    docsCount = await remoteDB.query(filterCountViewId, {}).then((result) => {
      // handle result
      log.debug(`${fnName} getPotentialsFromCloudant - result`, result);
      let docsCount = 0;
      if (typeof result.rows[0] !== 'undefined') {
        docsCount = result.rows[0].value;
      }
      return docsCount;
    }).catch((e) => {
      log.warn(`${fnName} getPotentialsFromCloudant - result`, { e });
      return 0;
    });
    log.warn(`${fnName} getPotentialsFromCloudant - docsCount`, { docsCount });

    const chunkSize = 500 * 1000;
    const results = [];

    for (let i = 0; i < docsCount; i += chunkSize) {
      const percentage = (i / docsCount) * 100;
      log.debug(`${fnName} getPotentialsFromCloudant - progress ${percentage}`, {
        percentage,
      });
      const result = await remoteDB.query(filterViewId, {
        limit: chunkSize,
        skip: i,
      }).catch((e) => {
        log.debug(`${fnName} getPotentialsFromCloudant - query error`, {
          e,
          chunkSize,
          docsCount,
        });
        throw e;
      });
      results.push(result);
      log.debug(`${fnName} getPotentialsFromCloudant - results`, {
        results,
        docsCount,
      });
    }

    const allDocs = results.reduce((acc, curr) => acc.concat(curr.rows), []);
    return allDocs;
  };

  useEffect(() => {

  }, [heatLayer]);

  useEffect(() => {
    log.debug(`${fnName} - useEffect - []`, { props });
    setupLogs();
  }, []);

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [map]`, { props });
    if (props.parsedUrl && props.parsedUrl.sepEventName) {
      const getAddressById = async (addressId) => {
        const addressResponse = await getAddress(props, addressId);
        const address = addressResponse.data[0];
        return address;
      };
      const setMap = async (address) => {
        const addressData = await getPublicSEPData(props, address.id);
        log.debug(`${fnName} - onSepEvent - search address changed - address`, { addressData });
        const defaultPosition = [address.lat, address.long];
        const defaultZoom = 21;
        map.setView(defaultPosition, defaultZoom);
      };
      const drawMarker = async (address) => {
        /* const marker = L.circle([address.lat, address.long], {
          color: props.theme.palette.primary.main,
          fillColor: props.theme.palette.primary.light,
          fillOpacity: 0.5,
          radius: 5,
        }).addTo(map); */

        const marker = L.marker([address.lat, address.long]).addTo(map);

        setSearchMarker((prevMarker) => {
          if (prevMarker) {
            map.removeLayer(prevMarker);
          }
          marker.addTo(map);
          return marker;
        });
      };
      const onSepEvent = async (event) => {
        log.debug(`${fnName} - onSepEvent`, event);
        if (
          event.detail
          && event.detail.action === 'AddressSearch:onObjectAddressChange'
          && event.detail.payload
        ) {
          log.debug(`${fnName} - onSepEvent - search address changed`, event);
          const address = await getAddressById(event.detail.payload.row.fields.id);
          setMap(address);
          drawMarker(address);
          onMapClick({ latlng: { lat: address.lat, lng: address.long } });
          // let addresses = getNearAddresses(event.detail.objectAddress.lat, event.detail.objectAddress.long)
        }
      };
      window.addEventListener(props.parsedUrl.sepEventName, onSepEvent);
      return () => {
        window.removeEventListener(props.parsedUrl.sepEventName, onSepEvent);
      };
    }
  }, [map]);

  useEffect(() => {
    if (props.parsedUrl && props.parsedUrl.sepEventName && !map) {
      const onSepEvent = (event) => {
        log.debug(`${fnName} - onSepEvent`, event);
        if (
          event.detail
          && event.detail.action === 'init-sep-map'
          && event.detail.payload
          && event.detail.payload.mapContainerId
        ) {
          log.debug(`${fnName} - onSepEvent - setting up the container`, event);
          setContainer(document.getElementById(event.detail.payload.mapContainerId));
        }
      };
      window.addEventListener(props.parsedUrl.sepEventName, onSepEvent);
      const myEvent = new CustomEvent(props.parsedUrl.sepEventName, {
        detail: {
          action: 'loaded-marketsense',
          payload: true,
        },
      });

      // set the uuid for an unique leaflet container id
      const uuid = uuidv4();
      setUuid(uuid);

      try {
        const overview = JSON.parse(props.parsedUrl.overview);
        const { filterCountViewId } = overview;
        const { filterViewId } = overview;
        setFilter({ filterViewId, filterCountViewId });
      } catch (e) {
        log.debug('no overview settings have been found or could be parsed', e);
      }

      window.dispatchEvent(myEvent);

      return () => {
        window.removeEventListener(props.parsedUrl.sepEventName, onSepEvent);
      };
    }
  }, [props.parsedUrl]);

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [uuid, container]`, {
      process, props, uuid, container,
    });
    if (uuid && container) {
      const myMap = initLeaflet(uuid);
      // draw the heatmap
      drawHeatmap(
        myMap,
        {
          radius: 25,
          gradient: {
            '0.80': props.theme.palette.secondary.light,
            '0.90': props.theme.palette.secondary.main,
            0.95: props.theme.palette.primary.light,
            '1.0': props.theme.palette.primary.main,
          },
        },
      );
      setMap(myMap);
    }
  }, [uuid, container]);

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [filter]`, {
      process, props, uuid, container,
    });
    if (filter && map) {
      drawHeatmap(
        map,
        {
          radius: 25,
          gradient: {
            '0.80': props.theme.palette.secondary.light,
            '0.90': props.theme.palette.secondary.main,
            0.95: props.theme.palette.primary.light,
            '1.0': props.theme.palette.primary.main,
          },
        },
      );
    }
  }, [filter]);

  const renderMapPortal = () => {
    if (container) {
      return ReactDOM.createPortal((
        <React.Fragment>
          {isLoadingOverview ? <LinearProgress /> : null}
          <div
            id={`leaflet-${uuid}`}
            css={{
              width: '100%',
              height: '100%',
            }}
          />
          {isLoadingOverview ? <LinearProgress /> : null}
        </React.Fragment>
      ), container);
    }
    return null;
  };
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
  );
}
