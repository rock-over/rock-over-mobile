const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolver polyfills para React Native
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: require.resolve('react-native-crypto'),
  stream: require.resolve('readable-stream'),
  url: require.resolve('react-native-url-polyfill'),
};

// Adicionar extensões de arquivo
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'cjs',
];

module.exports = config;

