const webpack = require('webpack')
const path = require('path')

const NODE_ENV = process.env.NODE_ENV || 'development'

module.exports = (env, argv) => {
  console.log('applying webpack config: ', { env, argv })
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
              loader: 'file-loader'
            },
          ],
        },

      ]
    },
    target: 'web',
    mode: NODE_ENV,
    optimization: {
      minimize: NODE_ENV === 'production',
      nodeEnv: NODE_ENV
    },
    resolve: {
      extensions: ['*', '.js', '.jsx']
    },
    output: {
      path: path.resolve(__dirname, 'public'),
      publicPath: '/',
      filename: 'bundle.js'
    },
    plugins: [
      new webpack.HotModuleReplacementPlugin(),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(NODE_ENV)
      })
    ],
    devServer: {
      contentBase: path.join(__dirname, 'public'),
      port: 3000,
      hot: NODE_ENV === 'production'
    }
  }
  console.log('webpack is using config', config)
  config.plugins.forEach((plugin) => {
    console.log('webpack is using plugin', plugin)
  })
  return config
}

