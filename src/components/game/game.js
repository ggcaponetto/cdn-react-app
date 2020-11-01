import React, { useEffect, useState } from 'react';
import * as BABYLON from '@babylonjs/core/Legacy/legacy';
import * as OIMO from 'oimo/build/oimo';
import * as CANNON from 'cannon';
import { jsx, css } from '@emotion/core';
import * as log from 'loglevel';

// with ES6 import
import io from 'socket.io-client';

import metalTexture from './textures/metal-rust.png';

log.setLevel(log.levels.DEBUG);
// this comment tells babel to convert jsx to calls to a function called jsx instead of React.createElement
/** @jsx jsx */

const style = css`
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
`;

export default function Game(props) {
  const fnName = 'Game';
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    const target = 'http://localhost:3001';
    const mySocket = io(target);
    mySocket.on('connect', () => {
      log.debug('connected');
    });
    mySocket.on('my-message', (data) => {
      log.debug('got message', data);
    });
    mySocket.on('disconnect', () => {
      log.debug('disconnected');
    });
    setSocket(mySocket);
  }, []);
  useEffect(() => {
    const canvas = document.getElementById('renderCanvas'); // Get the canvas element
    const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

    /** ***** Add the create scene function ***** */
    const createScene = function () {
      const scene = new BABYLON.Scene(engine);
      scene.clearColor = BABYLON.Color3.Purple();

      const camera = new BABYLON.FreeCamera('Camera', new BABYLON.Vector3(0, 0, -20), scene);
      camera.attachControl(canvas, true);
      camera.checkCollisions = true;
      camera.applyGravity = false;
      camera.setTarget(new BABYLON.Vector3(0, 0, 0));

      const light = new BABYLON.DirectionalLight('dir02', new BABYLON.Vector3(0.2, -1, 0), scene);
      light.position = new BABYLON.Vector3(0, 80, 0);

      // Material
      const materialAmiga = new BABYLON.StandardMaterial('amiga', scene);
      materialAmiga.diffuseTexture = new BABYLON.Texture(metalTexture, scene);
      materialAmiga.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
      materialAmiga.diffuseTexture.uScale = 5;
      materialAmiga.diffuseTexture.vScale = 5;

      const materialAmiga2 = new BABYLON.StandardMaterial('amiga', scene);
      materialAmiga2.diffuseTexture = new BABYLON.Texture('textures/amiga.jpg', scene);
      materialAmiga2.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);

      // Shadows
      const shadowGenerator = new BABYLON.ShadowGenerator(2048, light);

      // Physics
      scene.enablePhysics(null, new BABYLON.CannonJSPlugin(true, 10, CANNON));
      // scene.enablePhysics(null, new BABYLON.OimoJSPlugin('undefined', OIMO));

      // Spheres
      let y = 0;
      for (var index = 0; index < 100; index++) {
        var sphere = BABYLON.Mesh.CreateSphere('Sphere0', 16, 3, scene);
        sphere.material = materialAmiga;

        sphere.position = new BABYLON.Vector3(Math.random() * 20 - 10, y, Math.random() * 10 - 5);

        shadowGenerator.addShadowCaster(sphere);

        sphere.physicsImpostor = new BABYLON.PhysicsImpostor(sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1 }, scene);

        y += 2;
      }

      // Link
      const spheres = [];
      for (index = 0; index < 10; index++) {
        sphere = BABYLON.Mesh.CreateSphere('Sphere0', 16, 1, scene);
        spheres.push(sphere);
        sphere.material = materialAmiga2;
        sphere.position = new BABYLON.Vector3(Math.random() * 20 - 10, y, Math.random() * 10 - 5);

        shadowGenerator.addShadowCaster(sphere);

        sphere.physicsImpostor = new BABYLON.PhysicsImpostor(sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1 }, scene);
      }

      for (index = 0; index < 9; index++) {
        spheres[index].setPhysicsLinkWith(spheres[index + 1], new BABYLON.Vector3(0, 0.5, 0), new BABYLON.Vector3(0, -0.5, 0));
      }

      // Box
      const box0 = BABYLON.Mesh.CreateBox('Box0', 3, scene);
      box0.position = new BABYLON.Vector3(3, 30, 0);
      const materialWood = new BABYLON.StandardMaterial('wood', scene);
      materialWood.diffuseTexture = new BABYLON.Texture('textures/crate.png', scene);
      materialWood.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
      box0.material = materialWood;

      shadowGenerator.addShadowCaster(box0);

      // Compound
      const part0 = BABYLON.Mesh.CreateBox('part0', 3, scene);
      part0.position = new BABYLON.Vector3(3, 30, 0);
      part0.material = materialWood;

      const part1 = BABYLON.Mesh.CreateBox('part1', 3, scene);
      part1.parent = part0; // We need a hierarchy for compound objects
      part1.position = new BABYLON.Vector3(0, 3, 0);
      part1.material = materialWood;

      shadowGenerator.addShadowCaster(part0);
      shadowGenerator.addShadowCaster(part1);
      shadowGenerator.useBlurExponentialShadowMap = true;
      shadowGenerator.useKernelBlur = true;
      shadowGenerator.blurKernel = 32;

      // Playground
      const ground = BABYLON.Mesh.CreateBox('Ground', 1, scene);
      ground.scaling = new BABYLON.Vector3(100, 1, 100);
      ground.position.y = -5.0;
      ground.checkCollisions = true;

      const border0 = BABYLON.Mesh.CreateBox('border0', 1, scene);
      border0.scaling = new BABYLON.Vector3(1, 100, 100);
      border0.position.y = -5.0;
      border0.position.x = -50.0;
      border0.checkCollisions = true;

      const border1 = BABYLON.Mesh.CreateBox('border1', 1, scene);
      border1.scaling = new BABYLON.Vector3(1, 100, 100);
      border1.position.y = -5.0;
      border1.position.x = 50.0;
      border1.checkCollisions = true;

      const border2 = BABYLON.Mesh.CreateBox('border2', 1, scene);
      border2.scaling = new BABYLON.Vector3(100, 100, 1);
      border2.position.y = -5.0;
      border2.position.z = 50.0;
      border2.checkCollisions = true;

      const border3 = BABYLON.Mesh.CreateBox('border3', 1, scene);
      border3.scaling = new BABYLON.Vector3(100, 100, 1);
      border3.position.y = -5.0;
      border3.position.z = -50.0;
      border3.checkCollisions = true;

      const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
      groundMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
      groundMat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
      groundMat.backFaceCulling = false;
      ground.material = groundMat;
      border0.material = groundMat;
      border1.material = groundMat;
      border2.material = groundMat;
      border3.material = groundMat;
      ground.receiveShadows = true;

      // Physics
      box0.physicsImpostor = new BABYLON.PhysicsImpostor(box0, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 2, friction: 0.4, restitution: 0.3 }, scene);
      ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.5, restitution: 0.7 }, scene);
      border0.physicsImpostor = new BABYLON.PhysicsImpostor(border0, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene);
      border1.physicsImpostor = new BABYLON.PhysicsImpostor(border1, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene);
      border2.physicsImpostor = new BABYLON.PhysicsImpostor(border2, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene);
      border3.physicsImpostor = new BABYLON.PhysicsImpostor(border3, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene);

      part0.physicsImpostor = new BABYLON.PhysicsImpostor(part0, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 2, friction: 0.4, restitution: 0.3 }, scene);

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
