const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Tell Metro to treat .tsv as an asset it can bundle
config.resolver.assetExts.push("tsv");
module.exports = config;
