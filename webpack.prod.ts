import * as webpack from 'webpack';
import { merge } from 'webpack-merge';
import TerserPlugin from 'terser-webpack-plugin';
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const HtmlCriticalWebpackPlugin = require("html-critical-webpack-plugin");

import common from './webpack.common';

const config: webpack.Configuration = merge<webpack.Configuration>(common, {
  mode: 'production',
  target: ['web'],
  output: {
    publicPath: './build/'
  },
  devtool: 'source-map',
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new MiniCssExtractPlugin({
      filename: 'style.css',
      chunkFilename: '[id].css',
    }),
    // new HtmlCriticalWebpackPlugin({
    //   base: __dirname + '/prod',
    //   src: 'index.html',
    //   dest: 'index.html',
    //   inline: true,
    //   minify: true,
    //   extract: true,
    //   // width: 375,
    //   // height: 565,
    //   penthouse: {
    //     blockJSRequests: false
    //   }
    // })
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true
      }),
      new CssMinimizerPlugin({
        parallel: true,
        // sourceMap: true,
      })
    ],
  },
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        use: [{
          loader: MiniCssExtractPlugin.loader,
          options: {
            publicPath: './'
          }
        }, {
          loader: 'css-loader',
          options: {
            importLoaders: 2,
            sourceMap: true
          }
        }, {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              plugins: {
                'postcss-preset-env': {
                  browsers: 'last 2 versions',
                  autoprefixer: { grid: true }
                }
              }
            }
          }
        }, {
          loader: 'sass-loader',
          options: {
            sourceMap: true,
            additionalData: '@charset "utf-8";\n @import "variables";',
            sassOptions: {
              includePaths: ['./dev/scss']
            }
          }
        }]
      }
    ]
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
});


export default config;