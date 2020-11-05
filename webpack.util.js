// eslint-disable-next-line import/no-extraneous-dependencies
const webpack = require('webpack');

const { NODE_ENV } = process.env;
const { APP_VERSION } = process.env;
const { GAME_SERVER } = process.env;

function getDefinePlugin() {
  if (NODE_ENV === 'development') {
    return new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
      'process.env.APP_VERSION': JSON.stringify(APP_VERSION),
      'process.env.GAME_SERVER': JSON.stringify(GAME_SERVER),
    });
  }
  return new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
    'process.env.APP_VERSION': JSON.stringify(APP_VERSION),
    'process.env.GAME_SERVER': JSON.stringify(GAME_SERVER),
  });
}

module.exports = {
  getDefinePlugin,
};
