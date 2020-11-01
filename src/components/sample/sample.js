import { useEffect, useState } from 'react';
import { jsx } from '@emotion/core';
/** @jsx jsx */
import moment from 'moment';
import log from 'loglevel';
import { Button } from '@material-ui/core';
import styles from './sample.module.css';
// this is bad, messes up the host css
// DONT: import "./sample-global.css"

log.setLevel('debug');

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

export default function Sample(props) {
    const fnName = 'Sample';
    const [result, setResult] = useState(null);
    useEffect(() => {
        setupLogs();
        log.debug(`${fnName} - useEffect`, { props, styles, process });
        import('./sample-split.js').then((math) => {
            const myResult = math.add(16, 26);
            log.debug('dynamic import of sample-split.js has completed.', { myResult });
            setResult(myResult);
        });
    }, []);
    return (
      <div
          css={{
                color: 'hotpink',
            }}
        >
          <Button
              variant="contained"
              color="primary"
              onClick={() => {
                }}
            >
              This is a dummy button to test the MaterialUI library.
            </Button>
          <h3>
              This is a dynamically imported module!!
                {/* eslint-disable-next-line new-cap */}
              {(new moment()).toISOString()}
              {' '}
              - (sample-split.js:
                {result}
              )
            </h3>
        </div>
    );
}
