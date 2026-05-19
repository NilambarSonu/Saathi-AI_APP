const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.resolver = {
  ...resolver,
  sourceExts: [...resolver.sourceExts, 'mjs'],
  blockList: [
    ...(Array.isArray(resolver.blockList) ? resolver.blockList : []),
    /.*\/android\/\.gradle\/.*/,
    /.*\/android\/build\/.*/,
    /.*\/android\/app\/build\/.*/,
    /.*\/node_modules\/.*\/android\/.*\/build\/.*/,
    /.*\/ios\/build\/.*/,
    /.*\/ios\/Pods\/.*/,
  ],
};

module.exports = config;
