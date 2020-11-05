// eslint-disable-next-line max-classes-per-file
import * as BABYLON from '@babylonjs/core';
// import * as OIMO from 'oimo/build/oimo';
import * as CANNON from 'cannon';

// const { Util } = require('../../src/components/game/game');

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const log = require('loglevel');

log.setLevel(log.levels.DEBUG);

const port = process.env.PORT;
if (!port) {
  throw Error('Please define a port to run on.');
}

class HeadlessBabylon {
  createScene() {
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = BABYLON.Color3.Purple();
    return this.scene;
  }

  run() {
    this.engine = new BABYLON.NullEngine();
    const scene = this.createScene(); // Call the createScene function
    // Register a render loop to repeatedly render the scene
    this.engine.runRenderLoop(() => {
      const myFps = this.engine.getFps().toFixed();
      log.debug(`virual scene is running at ${myFps} fps`);
      scene.render();
    });
  }
}

class Game {
  constructor(name = '') {
    this.name = name;
    this.sockets = [];
    this.state = {
      players: [],
    };
  }

  addConnections(sockets) {
    this.sockets = [...this.sockets, ...sockets];

    sockets.forEach((socket) => {
      this.state.players
        .push({
          addedOn: Date.now(),
          socketId: socket.id,
          color: {
            r: Math.random(),
            g: Math.random(),
            b: Math.random(),
          },
          position: {
            x: 0 + this.state.players.length * 3,
            y: 0 + this.state.players.length * 3,
            z: 0 + this.state.players.length * 3,
          },
        });
      this.state.players
        .sort((a, b) => (a.addedOn > b.addedOn ? 1 : 0));
    });
    this.sendStateToClients();
  }

  removeConnection(socket) {
    this.sockets = this.sockets.filter((mySocket) => mySocket.id !== socket.id);
    this.state.players = this.state.players.filter((player) => player.socketId !== socket.id);
    this.sendStateToClients();
  }

  toString() {
    return JSON.stringify({
      name: this.name,
      sockets: this.sockets.map((socket) => socket.id),
    }, null, 4);
  }

  sendStateToClients() {
    this.sockets.forEach((socket) => {
      socket.emit('update', JSON.stringify(this.state));
    });
  }

  start() {
    io.on('connection', (socket) => {
      this.addConnections([socket]);
      log.debug('new player connected:\n', this.toString());
      socket.on('disconnect', () => {
        this.removeConnection(socket);
        log.debug('player disconnected:\n', this.toString());
      });

      socket.on('update:player:position', (message) => {
        log.debug(`got message ${'update:player:position'}`, message);
        const position = JSON.parse(message);
        this.state.players = this.state.players.map((player) => {
          if (player.socketId === socket.id) {
            return {
              ...player,
              position,
            };
          }
          return player;
        });
        this.sendStateToClients();
      });
    });
  }
}

http.listen(port, () => {
  log.debug(`listening on port ${port}`);
  const babylon = new HeadlessBabylon();
  babylon.run();
  // const game = new Game('myGame');
  // game.start();
});
