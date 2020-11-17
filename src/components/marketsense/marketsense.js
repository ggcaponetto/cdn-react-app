import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat/dist/leaflet-heat';
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

import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import leafletIcon from 'leaflet/dist/images/marker-icon.png';

const DefaultIcon = L.icon({
  iconUrl: leafletIcon,
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

const isAllowedEndpoint = (props, endpoint) => {
  const allowedEndpointsRegexArray = JSON.parse(props.parsedUrl.allowedEndpoints)
    .map((regexString) => {
      const regex = new RegExp(regexString, 'g');
      return regex;
    });
  let isAllowed = false;
  allowedEndpointsRegexArray.forEach((allowedEndpointRegex) => {
    const matches = !!endpoint.match(allowedEndpointRegex);
    // log.debug(`isAllowed - filtering ${endpoint}`, { matches, endpoint, allowedEndpointRegex });
    // eslint-disable-next-line no-empty
    if (matches) {
      isAllowed = true;
    }
  });
  return isAllowed;
};
const getNearAddresses = async (props, lat, lng) => {
  const endpoint = `${props.env.APIGatewayBase}/api/addresspoints-nearest-by-coordinates?x=${lng}&y=${lat}&srid=4326`;
  if (!isAllowedEndpoint(props, endpoint)) {
    throw new Error(`the endpoint has to be enabled config and authorized: ${endpoint}`);
  }
  return axios({
    method: 'get',
    url: endpoint,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${props.parsedUrl.token}`,
    },
  });
};
const getAddress = async (props, addressId) => {
  const endpoint = `${props.env.APIGatewayBase}/api/marketsense/addresspoint-by-addressid/${addressId}`;
  if (!isAllowedEndpoint(props, endpoint)) {
    throw new Error(`the endpoint has to be enabled config and authorized: ${endpoint}`);
  }
  return axios({
    method: 'get',
    url: endpoint,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${props.parsedUrl.token}`,
    },
  });
};
const getAddresses = async (props, searchString) => {
  const bodyFormData = new FormData();
  bodyFormData.set('searchtext', searchString);
  const endpoint = `${props.env.APIGatewayBase}/api/searchaddress`;
  if (!isAllowedEndpoint(props, endpoint)) {
    throw new Error(`the endpoint has to be enabled config and authorized: ${endpoint}`);
  }
  const response = await axios(
    {
      method: 'post',
      url: endpoint,
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

    `${props.env.APIGatewayBase}/api/addresspoints/${addressId}/featurecollection-addresspoints-parcel`,
    `${props.env.APIGatewayBase}/api/addresspoints/${addressId}/featurecollection-roofs-parcelbuilding?minflaeche=10`,
    `${props.env.APIGatewayBase}/api/addresspoints/${addressId}/featurecollection-roofs-allparcelbuildings?minflaeche=10`,
  ];
  const requests = endpoints
    .filter((endpoint) => isAllowedEndpoint(props, endpoint))
    .map((endopoint) => axios({
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

const roofColors = [
  '#192f9f',
  '#00c5ff',
  '#ffaa01',
  '#ff5501',
  '#a80000', // dark red
  '#ffffff',
];

const modifyLeafletHeaders = function modifyLeafletHeaders() {
  // https://github.com/Esri/esri-leaflet/issues/743
  L.TileLayer.WMS_Headers = L.TileLayer.WMS.extend({
    setUrl(url, noRedraw) {
      let myNoRedraw = noRedraw;
      if (this._url === url && noRedraw === undefined) {
        myNoRedraw = true;
      }

      this._url = url;

      if (!myNoRedraw) {
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
        return null;
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
      const myTile = tile;
      log.debug('modifyLeafletHeaders _tileOnError', {
        done, tile, e, this: this, L,
      });
      const errorUrl = this.options.errorTileUrl;
      if (errorUrl && tile.getAttribute('src') !== errorUrl) {
        myTile.src = errorUrl;
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

      let i;
      let
        tile;
      // eslint-disable-next-line no-restricted-syntax
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
        return null;
      }
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
          log.error('modifyLeafletHeaders error', e);
          // img.src = URL.createObjectURL(response.data);
          done(null, img);
        });
      return img;
    },
  });
  L.tileLayer.wms_headers = (url, options) => new L.TileLayer.WMS_Headers(url, { ...options });
};

function SimpleCard(props) {
  const fnName = 'SimpleCard';
  const classes = useStyles();
  const { t/* , i18n */ } = useTranslation('open_marketsense', { useSuspense: true });
  const getPropValue = (locizeKey, value) => {
    if (locizeKey === 'addresspoint-by-addressid-gebKategorieShort') {
      return t(`open_marketsense:${locizeKey}-${value}`);
    }
    if (locizeKey === 'districtfeatures-by-addressid-districtType') {
      return t(`open_marketsense:${locizeKey}-${value}`);
    }
    if (locizeKey === 'addresspoint-by-addressid-publicTransportQuality') {
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

          Object.entries(data).forEach(((key, value) => {
            if (allowedPros.includes(`${endpointPrefix}-${key}`)) {
              rows.push(
                <div key={`${dataSetIndex}_${dataIndex}_${key}`}>
                  <b>
                    {t(`open_marketsense:${endpointPrefix}-${key}`)}
                    :
                  </b>
                  {' '}
                  {getPropValue(`${endpointPrefix}-${key}`, value)}
                </div>,
              );
            }
          }));
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
    return () => {};
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
          return null;
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
    return () => {};
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
          value={
            objectAddressResults
              .filter((option) => option.title === objectAddress && objectAddress.title)[0]
          }
          getOptionSelected={(option, value) => {
            log.log('autocomplete - getOptionSelected', { option, value });
            return option.title === value.title;
          }}
          onChange={(event, value) => {
            event.persist();
            log.log('autocomplete - onChange', { event, objectAddressResults, value });
            const address = objectAddressResults
              .filter(
                (option, index) => index === parseInt(event.target.dataset.optionIndex, 10),
              )[0];
            if (address) {
              log.log('autocomplete - onChange - address', { address, objectAddress });
              setObjectAddress(address);
            }
          }}
          onInputChange={(event, value) => {
            log.log('onInputChange', { event, value });
            const debounced = debounce(onInputChange, 300, { leading: true });
            debounced(value);

            const address = objectAddressResults.filter((option) => option.title === value)[0];
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
  // eslint-disable-next-line
  const {  t, i18n  } = useTranslation('open_marketsense', { useSuspense: true });
  const [uuid, setUuid] = useState(null);
  const [container, setContainer] = useState(null);
  const [map, setMap] = useState(null);
  const heatLayer = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const [searchMarker, setSearchMarker] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [parcelLayer, setParcelLayer] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [buildingRoofsLayer, setBuildingRoofsLayer] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [parcelRoofsLayer, setParcelRoofsLayer] = useState(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingAddressData, setIsLoadingAddressData] = useState(false);
  const [filter, setFilter] = useState(null);

  const getPotentialsFromCloudant = async (filterViewId, filterCountViewId) => {
    const urlPublic = 'https://washeduandishestylierger:b45b00cb570a9e649f159e1745b207266bb4005a@6c2fef2d-1c79-4b48-ba34-96193c57f4dd-bluemix.cloudantnosqldb.appdomain.cloud';
    const dbName = 'sync_addr_db';

    const remoteDB = new PouchDB(`${urlPublic}/${dbName}`);

    let docsCount = 0;
    docsCount = await remoteDB.query(filterCountViewId, {}).then((result) => {
      // handle result
      log.debug(`${fnName} getPotentialsFromCloudant - result`, result);
      let documentCount = 0;
      if (typeof result.rows[0] !== 'undefined') {
        documentCount = result.rows[0].value;
      }
      return documentCount;
    }).catch((e) => {
      log.warn(`${fnName} getPotentialsFromCloudant - result`, { e });
      return 0;
    });
    log.warn(`${fnName} getPotentialsFromCloudant - docsCount`, { docsCount });

    const chunkSize = 500 * 1000;
    const promises = [];
    for (let i = 0; i < docsCount; i += chunkSize) {
      const percentage = (i / docsCount) * 100;
      log.debug(`${fnName} getPotentialsFromCloudant - progress ${percentage}`, {
        percentage,
      });
      const result = remoteDB.query(filterViewId, {
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
      promises.push(result);
      log.debug(`${fnName} getPotentialsFromCloudant - results`, {
        docsCount,
      });
    }
    const results = await Promise.all(promises);
    const allDocs = results.reduce((acc, curr) => acc.concat(curr.rows), []);
    return allDocs;
  };

  const drawHeatmap = async function drawHeatmap(myMap, options) {
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

    if (heatLayer && heatLayer.current) {
      myMap.removeLayer(heatLayer.current);
    }

    heatLayer.current = myHeatLayer;
    myHeatLayer.addTo(myMap);
    setIsLoadingOverview(false);
  };
  async function onLeafletMapClick(e) {
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
  async function onLeafletZoomEnd(e) {
    log.debug(`${fnName} onLeafletZoomEnd`, { e, props });
    try {
      const overview = getOverviewConfig();
      if (overview) {
        if (overview.options && overview.options.maxZoom) {
          const { maxZoom } = overview.options;
          const currentZoom = e.target.getZoom();
          if (maxZoom) {
            log.debug(`${fnName} onLeafletZoomEnd - automatic overview hiding`, { props, currentZoom, maxZoom });
            if (currentZoom > maxZoom) {
              log.debug(`${fnName} onLeafletZoomEnd - hiding overview`, { props });
              e.target.removeLayer(heatLayer.current);
            } else {
              log.debug(`${fnName} onLeafletZoomEnd - restoring overview`, { props });
              e.target.addLayer(heatLayer.current);
            }
          }
        }
      }
    } catch (error) {
      log.debug(`${fnName} onLeafletZoomEnd - overview autohide is not configured`, error);
    }
  }
  const setLayer = (myMap) => {
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
        layers: {
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

    let baseLayersGroup = null;
    if (props.parsedUrl.mapLayer === 'MAP_OSM') {
      const osmLayer = L.tileLayer(
        baseLayers.MAP_OSM.layers.MAP_OSM.url, baseLayers.MAP_OSM.layers.MAP_OSM.options,
      );
      const layerGroup = L.layerGroup([osmLayer]);
      baseLayersGroup = layerGroup;
    } else {
      baseLayersGroup = getLayerGroup(baseLayers[`${props.parsedUrl.mapLayer}`]);
    }
    baseLayersGroup.addTo(myMap);
  };
  const initLeaflet = (myUuid) => {
    log.debug(`${fnName} initLeaflet`, { props });
    const myMap = L.map(`leaflet-${myUuid}`, {});
    const defaultPosition = [46.948484, 8.358491];
    const defaultZoom = 8;
    myMap.setView(defaultPosition, defaultZoom);
    myMap.on('click', onLeafletMapClick);
    myMap.on('zoomend', onLeafletZoomEnd);
    setLayer(myMap);
    const sepAttribution = (
      <div css={{
        fontSize: '1.5em',
      }}
      >
        Map layers by
        {' '}
        <a href="https://www.swisstopo.admin.ch" target="_blank" rel="noreferrer">swisstopo</a>
        {' | '}
        <a href="https://swissenergyplanning.ch" target="_blank" rel="noreferrer">&copy;SEP</a>
        {' '}
        by
        {' '}
        <a href="https://geoimpact.ch" target="_blank" rel="noreferrer">geoimpact</a>
      </div>
    );
    myMap.attributionControl.setPrefix(null);
    myMap.attributionControl.setPosition('bottomleft');
    myMap.attributionControl
      .addAttribution(ReactDOMServer.renderToStaticMarkup(sepAttribution));
    return myMap;
  };
  const getOverviewConfig = () => {
    try {
      return JSON.parse(props.parsedUrl.overview);
    } catch (e) {
      log.debug(`${fnName} - getOverviewConfig - no overview config found`);
      return null;
    }
  };

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [map]`, { props });
  }, [map]);

  useEffect(() => {
    log.debug(`${fnName} - useEffect - []`, { props });
    setupLogs();
  }, []);

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [map]`, { props });
    if (props.parsedUrl && props.parsedUrl.sepEventName) {
      const displayParcelGeometry = (addressData) => {
        log.debug(`${fnName} displayParcelGeometry`, { addressData });
        const parcelFeatureCollection = addressData.filter(
          (data) => {
            const replace = `${props.env.APIGatewayBase}/api/addresspoints/[0-9]+/featurecollection-addresspoints-parcel`;
            const regex = new RegExp(replace, 'g');
            const matches = !!data.config.url.match(regex);
            return matches;
          },
        )[0];
        log.debug(`${fnName} displayParcelGeometry`, { addressData, parcelFeatureCollection });
        if (parcelFeatureCollection) {
          const newParcelLayer = L.geoJSON(parcelFeatureCollection.data);
          newParcelLayer.setStyle({
            fillColor: props.theme.palette.primary.main,
            color: props.theme.palette.primary.main,
          });

          setParcelLayer((prevLayer) => {
            if (prevLayer) {
              map.removeLayer(prevLayer);
            }
            newParcelLayer.addTo(map);
            return newParcelLayer;
          });
        }
      };
      const displayBuildingRoofsGeometry = (addressData) => {
        log.debug(`${fnName} displayBuildingRoofsGeometry`, { addressData });
        const buildingRoofsFeatureCollection = addressData.filter(
          (data) => {
            const replace = `${props.env.APIGatewayBase}/api/addresspoints/[0-9]+/featurecollection-roofs-parcelbuilding[.]*`;
            const regex = new RegExp(replace, 'g');
            const matches = !!data.config.url.match(regex);
            return matches;
          },
        )[0];
        log.debug(`${fnName} displayBuildingRoofsGeometry`, { addressData, buildingRoofsFeatureCollection });
        if (buildingRoofsFeatureCollection) {
          const newBuildingRoofsLayer = L.geoJSON(buildingRoofsFeatureCollection.data, {
            style(feature) {
              try {
                return {
                  color: roofColors[feature.properties.klasse - 1],
                };
              } catch (e) {
                log.debug(`${fnName} cannot set the roof color based on the roof class`, { addressData, buildingRoofsFeatureCollection });
                return {
                  color: '#ff0000',
                };
              }
            },
          });

          /*          newBuildingRoofsLayer.setStyle({
            fillColor: props.theme.palette.secondary.main,
            color: props.theme.palette.secondary.main,
          }); */

          setBuildingRoofsLayer((prevLayer) => {
            if (prevLayer) {
              map.removeLayer(prevLayer);
            }
            newBuildingRoofsLayer.addTo(map);
            return newBuildingRoofsLayer;
          });
        }
      };
      const displayParcelRoofsGeometry = (addressData) => {
        log.debug(`${fnName} displayParcelRoofsGeometry`, { addressData });
        const parcelRoofsFeatureCollection = addressData.filter(
          (data) => {
            const replace = `${props.env.APIGatewayBase}/api/addresspoints/[0-9]+/featurecollection-roofs-allparcelbuildings[.]*`;
            const regex = new RegExp(replace, 'g');
            const matches = !!data.config.url.match(regex);
            return matches;
          },
        )[0];
        log.debug(`${fnName} displayParcelRoofsGeometry`, { addressData, parcelRoofsFeatureCollection });
        if (parcelRoofsFeatureCollection) {
          const newParcelRoofsLayer = L.geoJSON(parcelRoofsFeatureCollection.data, {
            style(feature) {
              try {
                return {
                  color: roofColors[feature.properties.klasse - 1],
                };
              } catch (e) {
                log.debug(`${fnName} cannot set the roof color based on the roof class`, { addressData, parcelRoofsFeatureCollection });
                return {
                  color: '#ff0000',
                };
              }
            },
          });

          setParcelRoofsLayer((prevLayer) => {
            if (prevLayer) {
              map.removeLayer(prevLayer);
            }
            newParcelRoofsLayer.addTo(map);
            return newParcelRoofsLayer;
          });
        }
      };
      const displayMarker = async (address) => {
        const markerIcon = L.icon({
          iconUrl: leafletIcon,
          iconAnchor: [12, 41],
        });
        const marker = L.marker([address.lat, address.long], {
          icon: markerIcon,
        });

        /*
        const circle = L.circle([address.lat, address.long], {
          color: 'red',
          fillColor: '#f03',
          fillOpacity: 0.5,
          radius: 10,
        });
        */

        const layerGroup = L.layerGroup([marker]);
        setSearchMarker((prevLayerGroup) => {
          if (prevLayerGroup) {
            map.removeLayer(prevLayerGroup);
          }
          layerGroup.addTo(map);
          return layerGroup;
        });
      };

      const getAddressById = async (addressId) => {
        const addressResponse = await getAddress(props, addressId);
        const address = addressResponse.data[0];
        return address;
      };
      const setInitialMapView = (address) => {
        log.debug(`${fnName} - onSepEvent - search address changed - address`, { address });
        const defaultPosition = [address.lat, address.long];
        const defaultZoom = 21;
        map.setView(defaultPosition, defaultZoom);
      };

      const onSepEvent = async (event) => {
        log.debug(`${fnName} - onSepEvent`, event);
        const draw = (address, addressData) => {
          displayParcelGeometry(addressData);
          displayBuildingRoofsGeometry(addressData);
          // displayParcelRoofsGeometry(addressData);
          // TODO make it dynamic from the config
          displayMarker(address);
        };
        const dispatchGlobalEvent = (data) => {
          const myEvent = new CustomEvent(props.parsedUrl.sepEventName, {
            detail: {
              action: 'marketsense-data-changed',
              payload: data,
            },
          });
          window.dispatchEvent(myEvent);
        };
        if (
          event.detail
          && event.detail.action === 'AddressSearch:onObjectAddressChange'
          && event.detail.payload
        ) {
          log.debug(`${fnName} - onSepEvent - search address changed`, event);
          const address = await getAddressById(event.detail.payload.row.fields.id);
          const addressData = await getPublicSEPData(props, address.id);
          setInitialMapView(address);
          draw(address, addressData);
          dispatchGlobalEvent({ address, addressData });
        }
        if (
          event.detail
          && event.detail.action === 'Marketsense:onMapClick'
          && event.detail.payload
        ) {
          log.debug(`${fnName} - onSepEvent - map click`, event);
          const { address } = event.detail.payload;
          const { addressData } = event.detail.payload;
          // do not set the map position and zoom if the user interacts with the map
          // setInitialMapView(address);
          draw(address, addressData);
          dispatchGlobalEvent({ address, addressData });
        }
      };
      window.addEventListener(props.parsedUrl.sepEventName, onSepEvent);
      return () => {
        window.removeEventListener(props.parsedUrl.sepEventName, onSepEvent);
      };
    }
    return () => {};
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
      const myUuid = uuidv4();
      setUuid(myUuid);

      const overview = getOverviewConfig();
      if (overview) {
        const { filterCountViewId } = overview;
        const { filterViewId } = overview;
        setFilter({ filterViewId, filterCountViewId });
      }

      window.dispatchEvent(myEvent);

      return () => {
        window.removeEventListener(props.parsedUrl.sepEventName, onSepEvent);
      };
    }
    return () => {};
  }, [props.parsedUrl]);

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [uuid, container]`, {
      process, props, uuid, container,
    });
    if (uuid && container) {
      const myMap = initLeaflet(uuid);
      // draw the heatmap
      const overview = getOverviewConfig();
      if (overview) {
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
      }
      setMap(myMap);
    }
  }, [uuid, container]);

  useEffect(() => {
    log.debug(`${fnName} - useEffect - [filter]`, {
      process, props, uuid, container,
    });
    if (filter && map) {
      const overview = getOverviewConfig();
      if (overview) {
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
    }
  }, [filter]);

  const renderMapPortal = (key) => {
    if (container) {
      return ReactDOM.createPortal((
        <React.Fragment
          key={key}
        >
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
  const getEnabledComponents = () => {
    const enabledComponents = JSON.parse(props.parsedUrl.components)
      .filter((component) => component.enabled)
      .map((component, index) => {
        if (component.name === 'sep-map') {
          return renderMapPortal(index);
        } if (component.name === 'sep-address') {
          return (
            <AddressSearch
              key={index}
              {...props}
              setFilter={setFilter}
            />
          );
        } if (component.name === 'sep-object-display') {
          return (
            <ObjectDisplay
              key={index}
              {...props}
              isLoadingAddressData={isLoadingAddressData}
            />
          );
        }
        return null;
      });
    return enabledComponents;
  };
  return (
    <React.Fragment>
      {getEnabledComponents()}
    </React.Fragment>
  );
}
