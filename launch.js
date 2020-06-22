import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import { resolve, join } from 'path';

import { Volume } from 'memfs';
import { Union } from 'unionfs';
import { link } from 'linkfs';
import * as realFs from 'fs';
const joinPath = require('memory-fs/lib/join');

const mfs = Volume.fromJSON({
  [join(__dirname, './fromMem.js')]: 'console.log("I am from the memory fs.")'
});
const fs = new Union();
fs.use(realFs).use(mfs);
if (!fs.join) fs.join = join;

const compiler = webpack({
  entry: resolve(__dirname, './testEntry.js'),
  target: 'web',
  mode: process.env.NODE_ENV || 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-env']
        }
      }
    ]
  },
  output: {
    filename: 'output.js',
    path: '/'
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        output: {
          comments: false
        },
      },
      extractComments: false,
      sourceMap: process.env.NODE_ENV === 'development'
    })],
  }
});
compiler.inputFileSystem = fs;
compiler.outputFileSystem = fs;

compiler.run((err, status) => {
  if (err) throw new Error(err);

  if (status.hasErrors()) {
    const info = status.toJson();
    if (status.hasErrors()) info.errors.forEach(e => console.log('error', e));
    if (status.hasWarnings()) info.warnings.forEach(e => console.log('warn', e));
  }

  console.log(fs.readFileSync('/output.js').toString());
});
