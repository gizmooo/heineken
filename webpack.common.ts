import * as webpack from 'webpack';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const path = require('path');
const fs = require('fs');

const generateHtmlPlugins = (templateDir: string) => {
  const templateFiles = fs.readdirSync(path.resolve(__dirname, templateDir));

  return templateFiles.map((item: string) => {
    const parts = item.split('.');
    const name = parts[0];
    const extension = parts[1];
    return new HtmlWebpackPlugin({
      filename: `${name}.html`,
      template: path.resolve(__dirname, `${templateDir}/${name}.${extension}`),
      inject: false,
    });
  })
}

const config: webpack.Configuration = {
  context: __dirname,
  entry: {
    app: ['./dev/entry.ts']
  },
  output: {
    filename: '[name].js',
    path: __dirname + '/prod/build',
    library: '[name]',
    assetModuleFilename: '[name].[hash].[ext]',
    // ie11
    // environment: {
    //   arrowFunction: false,
    //   const: false
    // }
  },
  // target: ['web', 'es5'],
  resolve: {
    extensions: ['*', '.js', '.jsx', '.ts', '.tsx'],
    modules: ['./dev/js', 'node_modules'],
    alias: {
      'MEDIA': path.resolve(__dirname, 'dev/media'),
      'IMAGES': path.resolve(__dirname, 'dev/media/images'),
      'TYPES': path.resolve(__dirname, './dev/js/types'),
      // 'three': path.resolve(__dirname, 'node_modules/three/build/three.min.js'),
    }
  },
  module: {
    rules: [
      {
        test: /\.ts(x)?$/,
        // exclude: [/node_modules/],
        use: [
          {
            loader: 'babel-loader'
          },
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true
            }
          }
        ]
      },
      {
        test: /\.js(x)?$/,
        exclude: [/node_modules/],
        loader: 'babel-loader'
      },
      {
        test: /\.(woff|eot|otf|ttf|png|jp(e)?g|webp|gif|mp3|mp4|vlc|obj|fbx|cfg)$/,
        type: 'asset/resource'
      },
      {
        test: /\.(woff2|svg|)$/,
        type: 'asset/inline',
      },
      {
        test: /\.glsl$/,
        type: 'asset/source'
      },
      {
        test: /\.html$/,
        include: path.resolve(__dirname, './dev/html/includes'),
        type: 'asset/source'
      },
    ]
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin(),
    new CleanWebpackPlugin(),
    ...generateHtmlPlugins('./dev/html/views')
  ]
};

export default config;