import React, { useEffect, useState } from 'react';
import * as BABYLON from '@babylonjs/core/Legacy/legacy';
// this comment tells babel to convert jsx to calls to a function called jsx instead of React.createElement
/** @jsx jsx */
import { jsx, css } from '@emotion/core';

const style = css`
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
`;

export default function Game(props) {
  const fnName = 'Game';
  useEffect(() => {
    const canvas = document.getElementById('renderCanvas'); // Get the canvas element
    const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

    /** ***** Add the create scene function ***** */
    const createScene = function () {
      // Create the scene space
      const scene = new BABYLON.Scene(engine);

      // Add a camera to the scene and attach it to the canvas
      const camera = new BABYLON.ArcRotateCamera('Camera', Math.PI / 2, Math.PI / 2, 2, new BABYLON.Vector3(0, 0, 5), scene);
      camera.attachControl(canvas, true);

      // Add lights to the scene
      const light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), scene);
      const light2 = new BABYLON.PointLight('light2', new BABYLON.Vector3(0, 1, -1), scene);

      // Add and manipulate meshes in the scene
      const sphere = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: 2 }, scene);

      return scene;
    };
    /** ***** End of the create scene function ***** */

    const scene = createScene(); // Call the createScene function

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener('resize', () => {
      engine.resize();
    });
  });
  return (
    <div css={style}>
      <canvas css={style} id="renderCanvas" touch-action="none" />
    </div>
  );
}
