const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch parent directory so Metro can resolve shared code in ../src
config.watchFolders = [monorepoRoot];

// Explicit alias resolution for shared domain, services, and i18n
config.resolver.extraNodeModules = {
  "@domain": path.resolve(monorepoRoot, "src/domain"),
  "@services": path.resolve(monorepoRoot, "src/services"),
  "@i18n": path.resolve(monorepoRoot, "src/i18n"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
