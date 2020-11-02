import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core/Legacy/legacy';
// import * as OIMO from 'oimo/build/oimo';
import * as CANNON from 'cannon';
import { jsx, css } from '@emotion/core';
import * as log from 'loglevel';

// with ES6 import
import io from 'socket.io-client';

import metalTexture from './textures/metal-rust.png';

log.setLevel(log.levels.DEBUG);
// eslint-disable-next-line max-len
// this comment tells babel to convert jsx to calls to a function called jsx instead of React.createElement
/** @jsx jsx */
const styleDiv = css`
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
`;
/** @jsx jsx */
const performanceMonitorStyle = css`
  position: fixed;
  background: black;
  color: white;
  left: 0;
  top: 0;
`;

class InputController {
  constructor(scene, options = { speed: 0.2 }) {
    this.speed = options.speed;
    this.targets = [];
    this.scene = scene;
    this.inputMap = {};
    this.onBeforeRender = () => {
      this.targets.forEach((myTarget) => {
        const myRenderTarget = myTarget;
        // Impulse Settings
        let impulseDirection = null;
        const impulseMagnitude = 5;
        const contactLocalRefPoint = BABYLON.Vector3.Zero();
        const applyImpulse = function () {
          myRenderTarget.physicsImpostor
            .applyImpulse(
              impulseDirection.scale(impulseMagnitude),
              myRenderTarget.getAbsolutePosition().add(contactLocalRefPoint),
            );
        };

        if (this.inputMap.w /* || this.inputMap.ArrowUp */) {
          impulseDirection = new BABYLON.Vector3(0, 0, 1);
          applyImpulse();
        }
        if (this.inputMap.a /* || this.inputMap.ArrowLeft */) {
          impulseDirection = new BABYLON.Vector3(1, 0, 0);
          applyImpulse();
        }
        if (this.inputMap.s /* || this.inputMap.ArrowDown */) {
          impulseDirection = new BABYLON.Vector3(0, 0, -1);
          applyImpulse();
        }
        if (this.inputMap.d /* || this.inputMap.ArrowRight */) {
          impulseDirection = new BABYLON.Vector3(-1, 0, 0);
          applyImpulse();
        }
      });
    };
    this.scene.actionManager = new BABYLON.ActionManager(this.scene);
    this.scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, ((evt) => {
        this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type === 'keydown';
      })),
    );
    this.scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, ((evt) => {
        this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type === 'keydown';
      })),
    );
    this.scene.onBeforeRenderObservable.add(this.onBeforeRender);
  }

  addTarget(target) {
    this.scene.onBeforeRenderObservable.remove(this.onBeforeRender);
    this.targets = [...this.targets, target];
    this.scene.onBeforeRenderObservable.add(this.onBeforeRender);
  }
}

// eslint-disable-next-line no-unused-vars
export default function Game(props) {
  // const fnName = 'Game';
  // eslint-disable-next-line no-unused-vars
  const [socket, setSocket] = useState(null);
  const [fps, setFps] = useState(null);
  const performanceMonitor = useRef(null);
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
      const materialMetal = new BABYLON.StandardMaterial('metalMaterial', scene);
      materialMetal.diffuseTexture = new BABYLON.Texture(metalTexture, scene);
      materialMetal.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
      materialMetal.diffuseTexture.uScale = 5;
      materialMetal.diffuseTexture.vScale = 5;

      // Shadows
      const shadowGenerator = new BABYLON.ShadowGenerator(2048, light);

      // Physics
      scene.enablePhysics(null, new BABYLON.CannonJSPlugin(true, 10, CANNON));
      const staticElementsOption = {
        mass: 0,
        friction: 0.5,
        restitution: 0.7,
      };

      shadowGenerator.useBlurExponentialShadowMap = true;
      shadowGenerator.useKernelBlur = true;
      shadowGenerator.blurKernel = 32;

      // Playground
      const ground = BABYLON.Mesh.CreateBox('Ground', 1, scene);
      ground.scaling = new BABYLON.Vector3(100, 1, 100);
      ground.position.y = -5.0;
      ground.checkCollisions = true;
      ground.physicsImpostor = new BABYLON.PhysicsImpostor(
        ground,
        BABYLON.PhysicsImpostor.BoxImpostor,
        staticElementsOption, scene,
      );

      const border0 = BABYLON.Mesh.CreateBox('border0', 1, scene);
      border0.scaling = new BABYLON.Vector3(1, 100, 100);
      border0.position.y = -5.0;
      border0.position.x = -51.0;
      border0.checkCollisions = true;
      border0.physicsImpostor = new BABYLON.PhysicsImpostor(
        border0,
        BABYLON.PhysicsImpostor.BoxImpostor,
        staticElementsOption,
        scene,
      );

      const border1 = BABYLON.Mesh.CreateBox('border1', 1, scene);
      border1.scaling = new BABYLON.Vector3(1, 100, 100);
      border1.position.y = -5.0;
      border1.position.x = 51.0;
      border1.checkCollisions = true;

      border1.physicsImpostor = new BABYLON.PhysicsImpostor(
        border1,
        BABYLON.PhysicsImpostor.BoxImpostor,
        staticElementsOption,
        scene,
      );

      const border2 = BABYLON.Mesh.CreateBox('border2', 1, scene);
      border2.scaling = new BABYLON.Vector3(100, 100, 1);
      border2.position.y = -5.0;
      border2.position.z = 51.0;
      border2.checkCollisions = true;
      border2.physicsImpostor = new BABYLON.PhysicsImpostor(
        border2,
        BABYLON.PhysicsImpostor.BoxImpostor,
        staticElementsOption,
        scene,
      );

      const border3 = BABYLON.Mesh.CreateBox('border3', 1, scene);
      border3.scaling = new BABYLON.Vector3(100, 100, 1);
      border3.position.y = -5.0;
      border3.position.z = -51.0;
      border3.checkCollisions = true;
      border3.physicsImpostor = new BABYLON.PhysicsImpostor(
        border3,
        BABYLON.PhysicsImpostor.BoxImpostor,
        staticElementsOption,
        scene,
      );

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

      // Spheres
      let y = 0;
      const controller = new InputController(scene);

      for (let index = 0; index < 1; index += 1) {
        const sphere = BABYLON.Mesh.CreateSphere('Sphere0', 16, 3, scene);
        sphere.physicsImpostor = new BABYLON.PhysicsImpostor(
          sphere,
          BABYLON.PhysicsImpostor.SphereImpostor,
          { mass: 1, friction: 0.1, restitution: 0.3 },
          scene,
        );
        sphere.material = materialMetal;
        sphere.position = new BABYLON.Vector3(Math.random() * 20 - 10, y, Math.random() * 10 - 5);
        /*        sphere.physicsImpostor.registerOnPhysicsCollide([
          border0.physicsImpostor,
          border1.physicsImpostor,
          border2.physicsImpostor,
          border3.physicsImpostor,
        ], (collider, collideAgainst) => {
          log.debug('collision', { collider, collideAgainst });
        }); */
        shadowGenerator.addShadowCaster(sphere);
        controller.addTarget(sphere);
        y += 2;
      }

      return scene;
    };
    /** ***** End of the create scene function ***** */

    const scene = createScene(); // Call the createScene function

    const myPerformanceMonitor = new BABYLON.PerformanceMonitor(60);
    myPerformanceMonitor.enable();
    log.debug('enabled performance monitoring', myPerformanceMonitor);
    performanceMonitor.current = myPerformanceMonitor;

    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(() => {
      const myFps = engine.getFps().toFixed();
      setFps(myFps);
      scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener('resize', () => {
      engine.resize();
    });
  }, []);
  return (
    <div css={styleDiv}>
      <canvas key={1} css={styleDiv} id="renderCanvas" touch-action="none" />
      <div
        key={2}
        css={{
          position: 'fixed',
          background: 'black',
          color: 'white',
          left: 0,
          top: 0,
        }}
      >
        {`${fps} fps`}
      </div>
    </div>
  );
}
