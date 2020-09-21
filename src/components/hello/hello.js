import React, { useEffect, useState, useContext, useReducer, useRef } from 'react'
import styles from "./hello.module.css"
/** @jsx jsx */
import { jsx } from '@emotion/core'


function Hello (props) {
  useEffect(() => {
    console.log('useEffect', { props, styles, process })
    import("./hello-split").then(math => {
      console.log("dynamic import of hello-split.js has completed.", {result: math.add(16, 26)});
    });
  }, [])
  return (
    <div
      css={{
        color: 'hotpink'
      }}
    >
      <h3>Hello world</h3>
    </div>
  )
}

export {
  Hello
}

