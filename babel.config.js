module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated MUST be last
      // In Reanimated v4, its plugin handles ALL 'worklet' directives
      // (no need for react-native-worklets-core/plugin)
      'react-native-reanimated/plugin',
    ],
  };
};
