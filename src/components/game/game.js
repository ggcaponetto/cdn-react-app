import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core/Legacy/legacy';
// import * as OIMO from 'oimo/build/oimo';
import * as CANNON from 'cannon';
import { jsx, css } from '@emotion/core';
import * as log from 'loglevel';
import { createScene } from './scene.js';

// with ES6 import
import io from 'socket.io-client';

// import metalTexture from './textures/metal-rust.png';

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

/* eslint-disable-next-line no-unused-vars */
export class Util {
  static showWorldAxis(scene, size) {
    const makeTextPlane = function (text, color, mySize) {
      const dynamicTexture = new BABYLON.DynamicTexture('DynamicTexture', 50, scene, true);
      dynamicTexture.hasAlpha = true;
      dynamicTexture.drawText(text, 5, 40, 'bold 36px Arial', color, 'transparent', true);
      const plane = BABYLON.Mesh.CreatePlane('TextPlane', mySize, scene, true);
      plane.material = new BABYLON.StandardMaterial('TextPlaneMaterial', scene);
      plane.material.backFaceCulling = false;
      plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
      plane.material.diffuseTexture = dynamicTexture;
      return plane;
    };
    const axisX = BABYLON.Mesh.CreateLines('axisX', [
      BABYLON.Vector3.Zero(),
      new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
      new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0),
    ], scene);
    axisX.color = new BABYLON.Color3(1, 0, 0);
    const xChar = makeTextPlane('X', 'red', size / 10);
    xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
    const axisY = BABYLON.Mesh.CreateLines('axisY', [
      BABYLON.Vector3.Zero(),
      new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
      new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(0.05 * size, size * 0.95, 0),
    ], scene);
    axisY.color = new BABYLON.Color3(0, 1, 0);
    const yChar = makeTextPlane('Y', 'green', size / 10);
    yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
    const axisZ = BABYLON.Mesh.CreateLines('axisZ', [
      BABYLON.Vector3.Zero(),
      new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, -0.05 * size, size * 0.95),
      new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, 0.05 * size, size * 0.95),
    ], scene);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
    const zChar = makeTextPlane('Z', 'blue', size / 10);
    zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
  }
}

// eslint-disable-next-line no-unused-vars
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
        const speed = 0.01 * scene.getEngine().getDeltaTime();
        const move = (axis, amount) => {
          myRenderTarget.position[axis] += amount;
        };

        const impulse = (impulseDirection, amount) => {
          // Impulse Settings
          const impulseMagnitude = amount;
          const contactLocalRefPoint = BABYLON.Vector3.Zero();
          myRenderTarget.physicsImpostor.applyImpulse(
            impulseDirection.scale(impulseMagnitude),
            myRenderTarget.getAbsolutePosition().add(contactLocalRefPoint),
          );
        };

        if (this.inputMap.w /* || this.inputMap.ArrowUp */) {
          move('z', speed);
        }
        if (this.inputMap.a /* || this.inputMap.ArrowLeft */) {
          move('x', speed);
        }
        if (this.inputMap.s /* || this.inputMap.ArrowDown */) {
          move('z', -speed);
        }
        if (this.inputMap.d /* || this.inputMap.ArrowRight */) {
          move('x', -speed);
        }
        if (this.inputMap.i /* || this.inputMap.ArrowRight */) {
          impulse(new BABYLON.Vector3(0, 0, 1), 80);
        }
        if (this.inputMap.k /* || this.inputMap.ArrowRight */) {
          impulse(new BABYLON.Vector3(0, 0, -1), 80);
        }
        if (this.inputMap.j /* || this.inputMap.ArrowRight */) {
          impulse(new BABYLON.Vector3(1, 0, 0), 80);
        }
        if (this.inputMap.l /* || this.inputMap.ArrowRight */) {
          impulse(new BABYLON.Vector3(-1, 0, 0), 80);
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
  const fnName = 'Game';
  // eslint-disable-next-line no-unused-vars
  useEffect(() => {
    const target = process.env.REACT_GAME_SERVER;
    log.debug(`${fnName} - constructor`, {
      process,
    });
    const mySocket = io(target);
    mySocket.on('connect', () => {
      log.debug('connected');
    });
    mySocket.on('update', (messageString) => {
      try {
        const message = JSON.parse(messageString);
        log.debug('update', message);
      } catch (e) {
        log.error('could not parse message', messageString);
      }
    });
    mySocket.on('disconnect', () => {
      log.debug('disconnected');
    });
  }, []);

  useEffect(() => {
    const canvas = document.getElementById('renderCanvas'); // Get the canvas element
    const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine
    /*const createScene = function () {
      const scene = new BABYLON.Scene(engine);
      scene.clearColor = BABYLON.Color3.Purple();

      const camera = new BABYLON.FreeCamera('Camera', new BABYLON.Vector3(0, 0, -20), scene);
      camera.attachControl(canvas, true);
      camera.checkCollisions = true;
      camera.applyGravity = true;
      camera.setTarget(new BABYLON.Vector3(0, 0, 0));

      const light = new BABYLON.DirectionalLight('dir02', new BABYLON.Vector3(0.2, -1, 0), scene);
      light.position = new BABYLON.Vector3(0, 80, 0);

      // Shadows
      const shadowGenerator = new BABYLON.ShadowGenerator(2048, light);

      // Physics
      scene.enablePhysics(null, new BABYLON.CannonJSPlugin(true, 10, CANNON));
      // scene.enablePhysics(null, new BABYLON.OimoJSPlugin());

      // Spheres
      let y = 0;
      for (let index = 0; index < 100; index += 1) {
        const sphere = BABYLON.Mesh.CreateSphere('Sphere0', 16, 3, scene);

        sphere.position = new BABYLON.Vector3(Math.random() * 20 - 10, y, Math.random() * 10 - 5);

        shadowGenerator.addShadowCaster(sphere);

        sphere.physicsImpostor = new BABYLON.PhysicsImpostor(
          sphere, BABYLON.PhysicsImpostor.SphereImpostor, { mass: 1 }, scene,
        );

        y += 2;
      }

      // Box
      const box0 = BABYLON.Mesh.CreateBox('Box0', 3, scene);
      box0.position = new BABYLON.Vector3(3, 30, 0);

      shadowGenerator.addShadowCaster(box0);

      // Compound
      const part0 = BABYLON.Mesh.CreateBox('part0', 3, scene);
      part0.position = new BABYLON.Vector3(3, 30, 0);

      const part1 = BABYLON.Mesh.CreateBox('part1', 3, scene);
      part1.parent = part0; // We need a hierarchy for compound objects
      part1.position = new BABYLON.Vector3(0, 3, 0);

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
      box0.physicsImpostor = new BABYLON.PhysicsImpostor(
        box0, BABYLON.PhysicsImpostor.BoxImpostor, {
          mass: 2,
          friction: 0.4,
          restitution: 0.3,
        }, scene,
      );
      ground.physicsImpostor = new BABYLON.PhysicsImpostor(
        ground, BABYLON.PhysicsImpostor.BoxImpostor, {
          mass: 0,
          friction: 0.5,
          restitution: 0.7,
        }, scene,
      );
      border0.physicsImpostor = new BABYLON.PhysicsImpostor(
        border0, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene,
      );
      border1.physicsImpostor = new BABYLON.PhysicsImpostor(
        border1, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene,
      );
      border2.physicsImpostor = new BABYLON.PhysicsImpostor(
        border2, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene,
      );
      border3.physicsImpostor = new BABYLON.PhysicsImpostor(
        border3, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene,
      );

      part0.physicsImpostor = new BABYLON.PhysicsImpostor(
        part0, BABYLON.PhysicsImpostor.BoxImpostor, {
          mass: 2,
          friction: 0.4,
          restitution: 0.3,
        }, scene,
      );

      return scene;
    };*/
    const scene = createScene(engine, canvas);
    // Register a render loop to repeatedly render the scene
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Watch for browser/canvas resize events
    window.addEventListener('resize', () => {
      engine.resize();
    });

    const fpsReporterHandle = setInterval(() => {
      const myFps = engine.getFps().toFixed();
      log.debug(`scene is running at ${myFps} fps`);
    }, 1000);
    return () => {
      clearInterval(fpsReporterHandle);
    };
  }, []);
  return (
    <div css={styleDiv}>
      <canvas
        css={styleDiv}
        id="renderCanvas"
        touch-action="none"
      />
    </div>
  );
}
