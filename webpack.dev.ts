import * as webpack from 'webpack';
import { merge } from 'webpack-merge';
import { Configuration as WebpackConfiguration } from 'webpack';
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';

import common from './webpack.common';
import path from 'path';

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

const config: Configuration = merge<Configuration>(common, {
  mode: 'development',
  output: {
    publicPath: '/build'
  },
  watchOptions: {
    aggregateTimeout: 100,
    ignored: ['node_modules/**', 'dev/**']
  },
  devtool: 'inline-source-map',
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ],
  devServer: {
    // host: process.platform === 'win32' ? '127.0.0.1' : '0.0.0.0',
    host: process.platform === 'win32' ? 'local-ip' : '0.0.0.0',
    port: 9000,
    open: true,
    static: {
      directory: path.join(__dirname, 'prod')
    },
    client: {
      // logging: "info",
      // Can be used only for `errors`/`warnings`
      //
      // overlay: {
      //   errors: true,
      //   warnings: true,
      // }
      overlay: true,
      // progress: true,
    },
    // devMiddleware: {
    //   // index: true,
    //   // mimeTypes: { "text/html": ["phtml"] },
    //   // publicPath: "/publicPathForDevServe",
    //   // serverSideRender: true,
    //   writeToDisk: true,
    // },
    // https: true,
    // historyApiFallback: true,
    // hot: true, //"hot: true" automatically applies HMR plugin, you don't have to add it manually to your webpack configuration.
    onBeforeSetupMiddleware: (devServer) => {
      const arr = [
        '/test-response.json'
      ];
      for (let i = 0; i < arr.length; i++) {
        devServer.app.post(arr[i], (req: any, res: { redirect: (arg0: string) => void; }) => {
          res.redirect(arr[i]);
        });
      }
    }
  },
  module: {
    rules: [{
      test: /\.(sa|sc|c)ss$/,
      use: [
        'style-loader',
        {
          loader: 'css-loader',
          options: {
            sourceMap: true,
            importLoaders: 1
          }
        }, {
        //   loader: 'postcss-loader',
        //   options: {
        //     sourceMap: true
        //   }
        // }, {
          loader: 'sass-loader',
          options: {
            sourceMap: true
          }
      }]
    }]
  }
});

export default config;