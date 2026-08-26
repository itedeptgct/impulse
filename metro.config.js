const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
	// relative path to your global.css file (from previous step)
	cssEntryFile: "./src/theme/global.css",
	// (optional) path where we gonna auto-generate typings
	// defaults to project's root
	dtsFile: "./src/types/uniwind-types.d.ts",
});
