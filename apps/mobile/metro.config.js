const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// SDK 54's `expo/metro-config` seeds `watchFolders` with the root `node_modules` plus each
// workspace *package* directory, but not the monorepo root itself. Shared brand assets live in
// `<root>/assets` and are `require()`d from screens, so without this they fall outside Metro's
// file map and fail to resolve. (SDK 57 watched the root implicitly; keep this until we move off
// Expo Go and can drop the pin.)
config.watchFolders = [...config.watchFolders, path.resolve(workspaceRoot, 'assets')];

module.exports = config;
