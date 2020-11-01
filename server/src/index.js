const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const log = require('loglevel');

log.setLevel(log.levels.DEBUG);

const port = process.env.PORT;
if (!port) {
  throw Error('Please define a port to run on.');
}

class Game {
  constructor(name = '') {
    this.name = name;
    this.sockets = [];
  }

  addConnections = (sockets) => {
    this.sockets = [...this.sockets, ...sockets];
  }

  removeConnection = (socket) => {
    this.sockets = this.sockets.filter((mySocket) => mySocket.id !== socket.id);
  };

  toString() {
    return JSON.stringify({
      name: this.name,
      sockets: this.sockets.map((socket) => socket.id),
    }, null, 4);
  }
}

const game = new Game('myGame');
io.on('connection', (socket) => {
  game.addConnections([socket]);
  log.debug('new player connected:\n', game.toString());
  socket.on('disconnect', () => {
    game.removeConnection(socket);
    log.debug('player disconnected:\n', game.toString());
  });

  socket.on('my-message', (msg) => {
    io.emit('my-message', msg);
  });
});

http.listen(port, () => {
  log.debug(`listening on port ${port}`);
});
