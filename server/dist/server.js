"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var BABYLON = _interopRequireWildcard(require("babylonjs"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

// import * as OIMO from 'oimo/build/oimo';
// import * as CANNON from 'cannon';
// const { Util } = require('../../src/components/game/game');
var app = require('express')();

var http = require('http').Server(app);

var io = require('socket.io')(http);

var log = require('loglevel');

log.setLevel(log.levels.DEBUG);
var port = process.env.PORT;

if (!port) {
  throw Error('Please define a port to run on.');
}

log.debug("game server is starting on port: ".concat(port));

var HeadlessBabylon = /*#__PURE__*/function () {
  function HeadlessBabylon() {
    _classCallCheck(this, HeadlessBabylon);
  }

  _createClass(HeadlessBabylon, [{
    key: "createScene",
    value: function createScene() {
      this.scene = new BABYLON.Scene(this.engine);
      this.scene.clearColor = BABYLON.Color3.Purple();
      return this.scene;
    }
  }, {
    key: "run",
    value: function run() {
      var _this = this;

      this.engine = new BABYLON.NullEngine();
      var scene = this.createScene(); // Call the createScene function
      // Register a render loop to repeatedly render the scene

      this.engine.runRenderLoop(function () {
        var myFps = _this.engine.getFps().toFixed();

        log.debug("virual scene is running at ".concat(myFps, " fps"));
        scene.render();
      });
    }
  }]);

  return HeadlessBabylon;
}();

var Game = /*#__PURE__*/function () {
  function Game() {
    var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    _classCallCheck(this, Game);

    this.name = name;
    this.sockets = [];
    this.state = {
      players: []
    };
  }

  _createClass(Game, [{
    key: "addConnections",
    value: function addConnections(sockets) {
      var _this2 = this;

      this.sockets = [].concat(_toConsumableArray(this.sockets), _toConsumableArray(sockets));
      sockets.forEach(function (socket) {
        _this2.state.players.push({
          addedOn: Date.now(),
          socketId: socket.id,
          color: {
            r: Math.random(),
            g: Math.random(),
            b: Math.random()
          },
          position: {
            x: 0 + _this2.state.players.length * 3,
            y: 0 + _this2.state.players.length * 3,
            z: 0 + _this2.state.players.length * 3
          }
        });

        _this2.state.players.sort(function (a, b) {
          return a.addedOn > b.addedOn ? 1 : 0;
        });
      });
      this.sendStateToClients();
    }
  }, {
    key: "removeConnection",
    value: function removeConnection(socket) {
      this.sockets = this.sockets.filter(function (mySocket) {
        return mySocket.id !== socket.id;
      });
      this.state.players = this.state.players.filter(function (player) {
        return player.socketId !== socket.id;
      });
      this.sendStateToClients();
    }
  }, {
    key: "toString",
    value: function toString() {
      return JSON.stringify({
        name: this.name,
        sockets: this.sockets.map(function (socket) {
          return socket.id;
        })
      }, null, 4);
    }
  }, {
    key: "sendStateToClients",
    value: function sendStateToClients() {
      var _this3 = this;

      this.sockets.forEach(function (socket) {
        socket.emit('update', JSON.stringify(_this3.state));
      });
    }
  }, {
    key: "start",
    value: function start() {
      var _this4 = this;

      io.on('connection', function (socket) {
        _this4.addConnections([socket]);

        log.debug('new player connected:\n', _this4.toString());
        socket.on('disconnect', function () {
          _this4.removeConnection(socket);

          log.debug('player disconnected:\n', _this4.toString());
        });
        socket.on('update:player:position', function (message) {
          log.debug("got message ".concat('update:player:position'), message);
          var position = JSON.parse(message);
          _this4.state.players = _this4.state.players.map(function (player) {
            if (player.socketId === socket.id) {
              return _objectSpread(_objectSpread({}, player), {}, {
                position: position
              });
            }

            return player;
          });

          _this4.sendStateToClients();
        });
      });
    }
  }]);

  return Game;
}();

function run() {
  http.listen(port, function () {
    log.debug("listening on port ".concat(port)); // const babylon = new HeadlessBabylon();
    // babylon.run();
    // const game = new Game('myGame');
    // game.start();
  });
}

run();