const webpack = require('webpack')
const path = require('path')

const NODE_ENV = process.env.NODE_ENV || "development";

module.exports = (env, argv) => {
  console.log('applying webpack config: ', {env, argv, NODE_ENV});
  let config = {
    entry: './src/index.js',
    devtool: 'inline-source-map',
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: ['babel-loader']
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                modules: true
              }
            }
          ],
          include: /\.module\.css$/
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader'
          ],
          exclude: /\.module\.css$/
        },
        {
          test: /\.(png|jpe?g|gif)$/i,
          use: [
            {
              loader: 'file-loader',
            },
          ],
        }
      ]
    },
    mode: NODE_ENV,
    resolve: {
      extensions: ['*', '.js', '.jsx']
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/',
      filename: 'bundle.js'
    },
    plugins: [
      new webpack.EnvironmentPlugin({
        NODE_ENV: NODE_ENV, // use 'development' unless process.env.NODE_ENV is defined
        DEBUG: false
      })
    ]
  }
  console.log("webpack is using config", config);
  config.plugins.forEach((plugin) => {
    console.log("webpack is using plugin", plugin);
  });
  return config;
}
