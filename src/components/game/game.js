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

class Util {
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

class InputController {
  constructor(scene, options = { speed: 0.2 }) {
    this.speed = options.speed;
    this.targets = [];
    this.scene = scene;
    this.inputMap = {};
    this.listener = null;
    this.onBeforeRender = () => {
      this.targets.forEach((myTarget) => {
        const myRenderTarget = myTarget;
        // Impulse Settings
        const speed = 0.01 * scene.getEngine().getDeltaTime();
        const move = (axis, amount) => {
          myRenderTarget.position[axis] += amount;
          if (this.listener) {
            this.listener(myRenderTarget.position);
          }
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

  addListener(myListener) {
    this.listener = myListener;
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
  const socketRef = useRef(null);

  const sceneRef = useRef(null);
  const controllerRef = useRef(null);
  const [fps, setFps] = useState(null);
  const performanceMonitor = useRef(null);

  const [clientGameState, setClientGameState] = useState(null);
  const [serverGameState, setServerGameState] = useState(null);

  const getPlayerMaterial = (scene, player) => {
    // Player Material
    const material = new BABYLON.StandardMaterial('playerMaterial', scene);
    material.diffuseColor = new BABYLON.Color3(player.color.r, player.color.g, player.color.b);
    material.emissiveColor = new BABYLON.Color3(player.color.r, player.color.g, player.color.b);
    return material;
  };
  const getPlayerMesh = (scene, player) => {
    const sphere = BABYLON.Mesh.CreateSphere(player.socketId, 16, 3, scene);
    sphere.physicsImpostor = new BABYLON.PhysicsImpostor(
      sphere,
      BABYLON.PhysicsImpostor.SphereImpostor,
      { mass: 0, friction: 0.1, restitution: 0.3 },
      scene,
    );
    sphere.material = getPlayerMaterial(scene, player);
    sphere.position = new BABYLON.Vector3(
      player.position.x,
      player.position.y,
      player.position.z,
    );
    return sphere;
  };
  const getPlayerBySocketId = (gameState, id) => gameState.players
    .filter(
      (player) => player.socketId === id,
    )[0] || null;
  const syncToServerState = (scene, myServerGameState) => {
    const initialState = {
      players: [],
    };
    const newClientGameState = initialState;

    // save the player controller
    const controller = new InputController(sceneRef.current);
    controller.addListener((data) => {
      socketRef.current.emit('update:player:position', JSON.stringify(data));
    });
    newClientGameState.playerController = controller;

    myServerGameState.players.forEach((serverPlayer) => {
      const sphere = getPlayerMesh(scene, serverPlayer);
      newClientGameState.players.push({
        socketId: serverPlayer.socketId,
        mesh: sphere,
      });
      if (serverPlayer.socketId === socketRef.current.id) {
        newClientGameState.playerController.addTarget(sphere);
      }
    });
    setClientGameState(newClientGameState);
  };
  const updateClientFromServer = (scene, myServerGameState) => {
    log.debug('updateClientFromServer', { scene, myServerGameState });
    const newClientGameState = clientGameState;
    // add players that are in the server state but are not in the client state
    myServerGameState.players.forEach((serverPlayer) => {
      const clientPlayer = getPlayerBySocketId(clientGameState, serverPlayer.socketId);
      if (!clientPlayer) {
        const sphere = getPlayerMesh(scene, serverPlayer);
        newClientGameState.players.push({
          socketId: serverPlayer.socketId,
          mesh: sphere,
        });
        if (serverPlayer.socketId === socketRef.current.id) {
          controllerRef.current.addTarget(sphere);
        }
      }
    });
    // remove players that are not in the server state but are in the client state
    newClientGameState.players.forEach((clientPlayer) => {
      const serverPlayer = getPlayerBySocketId(myServerGameState, clientPlayer.socketId);
      if (!serverPlayer) {
        clientPlayer.mesh.dispose();
      }
    });

    newClientGameState.players = newClientGameState.players.map((clientPlayer) => {
      let newPlayer = clientPlayer;
      myServerGameState.players.forEach((serverPlayer) => {
        if (
          clientPlayer.socketId === serverPlayer.socketId
          && serverPlayer.socketId !== socketRef.current.id
        ) {
          newPlayer = clientPlayer;
          newPlayer.mesh.position = serverPlayer.position;
        }
      });
      return newPlayer;
    });

    setClientGameState(newClientGameState);
  };

  const updateGame = (myServerGameState) => {
    if (sceneRef.current && socketRef.current) {
      if (
        !clientGameState
      ) {
        syncToServerState(sceneRef.current, myServerGameState);
      } else {
        updateClientFromServer(sceneRef.current, myServerGameState);
      }
    }
  };

  useEffect(() => {
    log.debug('serverGameState changed', {
      clientGameState, serverGameState, sceneRef, socketRef,
    });
    updateGame(serverGameState);
  }, [serverGameState]);

  useEffect(() => {
    const target = 'http://localhost:3001';
    const mySocket = io(target);
    mySocket.on('connect', () => {
      log.debug('connected');
    });
    mySocket.on('update', (messageString) => {
      try {
        const message = JSON.parse(messageString);
        log.debug('update', message);
        setServerGameState(message);
      } catch (e) {
        log.error('could not parse message', messageString);
      }
    });
    mySocket.on('disconnect', () => {
      log.debug('disconnected');
    });
    socketRef.current = mySocket;
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

      // Util.showWorldAxis(scene, 5);

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

    sceneRef.current = scene;
  }, []);
  return (
    <div css={styleDiv}>
      <canvas
        css={styleDiv}
        id="renderCanvas"
        touch-action="none"
      />
      <div
        css={performanceMonitorStyle}
      >
        {`${fps} fps`}
      </div>
    </div>
  );
}
