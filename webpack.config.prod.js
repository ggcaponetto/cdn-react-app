const webpack = require('webpack');
const path = require('path');
const { getDefinePlugin } = require('./webpack.util');

const NODE_ENV = process.env.NODE_ENV || 'development';

module.exports = (env, argv) => {
  console.log('applying webpack config: ', { env, argv, NODE_ENV });
  const config = {
    entry: './src/entry.js',
    devtool: false,
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /(node_modules|bower_components)/,
          use: ['babel-loader'],
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                modules: true,
              },
            },
          ],
          include: /\.module\.css$/,
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
          ],
          exclude: /\.module\.css$/,
        },
        {
          test: /\.(png|jpe?g|gif)$/i,
          use: [
            {
              loader: 'file-loader',
            },
          ],
        },
      ],
    },
    target: 'web',
    mode: NODE_ENV,
    optimization: {
      minimize: NODE_ENV === 'production',
      nodeEnv: NODE_ENV,
      namedModules: true,
      namedChunks: true,
    },
    resolve: {
      extensions: ['*', '.js', '.jsx'],
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      // publicPath: 'https://geoimpactstorage.blob.core.windows.net/open-marketsense/1.0.0/',
      publicPath: '/',
      filename: '[name].bundle.js',
    },
    plugins: [
      getDefinePlugin(),
    ],
  };
  console.log('webpack is using config', config);
  config.plugins.forEach((plugin) => {
    console.log('webpack is using plugin', plugin);
  });
  return config;
};
