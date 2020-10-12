import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import qs from 'qs';
import { LinearProgress } from '@material-ui/core';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import AnotherSample from '../sample/another-sample'

import { Helmet } from 'react-helmet';

import log from 'loglevel';

const Sample = React.lazy(() => import(/* webpackChunkName: "sample" */ './../sample/sample.js'));

log.setLevel('debug');

const script = document.currentScript;

const getParsedUrl = () => {
  try {
    const url = new URL(script.src);
    const parsedUrl = qs.parse(url.search.substr(1, url.search.length));
    return parsedUrl;
  } catch (e) {
    log.warn('getParsedUrl', { e });
    throw e;
  }
};

function App() {
  const fnName = 'App';
  const [appProps, setAppProps] = useState({
    env: {
      APIGatewayBase: 'https://services.swissenergyplanning.ch',
    },
  });

  const getDefaultTheme = () => {
    const defaultTheme = {
      palette: {
        primary: {
          main: '#689F38',
        },
        secondary: {
          main: '#0e72b5',
        },
      },
    };
    let theme = null;
    theme = createMuiTheme(
      defaultTheme,
    );
    log.debug(`${fnName} - getTheme - no override`, { defaultTheme, theme });
    return theme;
  };
  const getComponent = () => {
    if (appProps) {
      const getLoadingComponent = () => (
        <div>
          <LinearProgress />
        </div>
      );
      return (
        <>
          <React.Suspense fallback={getLoadingComponent()}>
            <Sample appProps />
            <AnotherSample />
          </React.Suspense>
        </>
      );
    }
    return (
      <>
        <h3>loading...</h3>
      </>
    );
  };
  const getTheme = (parsedUrl) => {
    const defaultTheme = {
      palette: {
        primary: {
          main: '#689F38',
        },
        secondary: {
          main: '#0e72b5',
        },
      },
    };
    let theme = null;
    if (parsedUrl && parsedUrl.theme) {
      const parsedTheme = JSON.parse(parsedUrl.theme);
      theme = createMuiTheme(
        {
          ...defaultTheme,
          ...parsedTheme,
        },
      );
      log.debug(`${fnName} - getTheme - override`, { defaultTheme, parsedTheme, theme });
    } else {
      theme = getDefaultTheme();
    }
    return theme;
  };

  useEffect(() => {
    const url = new URL(script.src);
    const parsedUrl = getParsedUrl();
    log.debug(`${fnName} - constructor`, { url, parsedUrl, appProps });
    setAppProps((myAppProps) => ({
      ...myAppProps,
      parsedUrl,
      theme: getTheme(parsedUrl),
    }));
    const myEvent = new CustomEvent(parsedUrl.sepEventName, {
      detail: {
        action: 'loaded-app',
        payload: true,
      },
    });
    window.dispatchEvent(myEvent);
  }, []);
  return (
    <ThemeProvider theme={appProps.theme || getDefaultTheme()}>
      <Helmet>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
      </Helmet>
      <div>
        {getComponent()}
      </div>
    </ThemeProvider>
  );
}

if (module.hot) {
  module.hot.accept([
    '../sample/sample',
    '../sample/another-sample',
  ], () => {
    log.trace('Accepting the updated sample.js module!');
    ReactDOM.render(
      <App />,
      document.getElementById('app'),
    );
  });
}

export function run() {
  ReactDOM.render(
    <App />,
    document.getElementById(getParsedUrl().scriptId),
  );
}
