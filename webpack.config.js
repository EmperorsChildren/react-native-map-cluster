const path = require('path');

const base = (mode) => {
  return {
    mode: mode,
    entry: path.resolve(__dirname, 'src', 'index.tsx'),
    output: {
      path: path.resolve(__dirname, 'lib'),
      filename: `index.module.js`,
      library: 'react-native-map-cluster',
      libraryTarget: 'umd',
      globalObject: 'this',
    },
    externals: {
      'react-native-maps': 'react-native-maps',
      supercluster: 'supercluster',
      '@placemarkio/geo-viewport': '@placemarkio/geo-viewport',
      react: 'react',
      'react-native': 'react-native',
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          enforce: 'pre',
          use: 'tslint-loader',
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: 'ts-loader',
        },
      ],
    },
    resolve: {
      extensions: ['.tsx'],
      modules: ['node_modules'],
    },
  };
};

module.exports = (env, argv) => {
  return [base(argv.mode)];
};
