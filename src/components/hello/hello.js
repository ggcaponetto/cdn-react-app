import React, { useEffect, useState, useContext, useReducer, useRef } from 'react'
import styles from "./hello.module.css"
/** @jsx jsx */
import { jsx } from '@emotion/core'

function Hello (props) {
  useEffect(() => {
    console.log('useEffect', { props, styles })
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

