import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import qs from 'qs';
import { LinearProgress } from '@material-ui/core';
// import { Marketsense } from '../marketsense/marketsense.js'
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';

import { Helmet } from 'react-helmet';

// import Marketsense from '../marketsense/marketsense'
// const Hello = React.lazy(() => import( './../hello/hello'))

import log from 'loglevel';

import i18next from 'i18next';
import Backend from 'i18next-locize-backend';
import { initReactI18next, useTranslation } from 'react-i18next';

// const Marketsense = React.lazy(() => import( './../marketsense/marketsense'))

const Marketsense = React.lazy(() => import(/* webpackChunkName: "marketsense" */ './../marketsense/marketsense.js'));

i18next
  .use(Backend)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // ...other options
    lng: 'de-CH',
    fallbackLng: 'de-CH',
    backend: {
      projectId: 'c016a769-684b-42fe-a8c2-880bff481672',
      apiKey: 'd325343e-8fb0-42f0-b5cb-fde2968a4a3f',
      referenceLng: 'de-CH',
    },
  });

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

function App(props) {
  const fnName = 'App';
  const { t, i18n } = useTranslation('main', { useSuspense: false });
  const [appProps, setAppProps] = useState({
    env: {
      APIGatewayBase: 'https://staging.services.swissenergyplanning.ch',
    },
  });

  useEffect(() => {
    const url = new URL(script.src);
    const parsedUrl = getParsedUrl();
    log.debug(`${fnName} - constructor`, {
      url, parsedUrl, appProps, t, i18n,
    });
    setAppProps((appProps) => ({
      ...appProps,
      parsedUrl,
      theme: getTheme(parsedUrl),
    }));
    if (parsedUrl.lang) {
      i18n.changeLanguage(parsedUrl.lang);
    }
    const myEvent = new CustomEvent(parsedUrl.sepEventName, {
      detail: {
        action: 'loaded-app',
        payload: true,
      },
    });
    window.dispatchEvent(myEvent);
  }, []);

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
            <Marketsense {...appProps} />
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
    '../hello/hello',
    '../marketsense/marketsense',
  ], () => {
    log.trace('Accepting the updated hello.js module!');
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
