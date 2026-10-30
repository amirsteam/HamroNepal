const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const sharedPackage = path.resolve(__dirname, "../../packages/shared");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Use the shared types/BS-date code from packages/shared (TypeScript source).
config.watchFolders = [...(config.watchFolders ?? []), sharedPackage];
// Files in packages/shared must resolve their imports (e.g. Babel helpers)
// from this app's node_modules, not the repo root's.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@hamronepal/shared": path.join(sharedPackage, "src"),
};

module.exports = config;
