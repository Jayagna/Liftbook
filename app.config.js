// Adds the one setting that depends on where the web build is hosted.
// A site served from a sub-folder (GitHub Pages serves a repo at /<repo-name>) needs that folder as its base path.
// Set LIFTBOOK_BASE_URL=/<repo-name> when exporting for such a host. Leave it unset for local runs and native builds.
module.exports = ({ config }) => {
  const baseUrl = (process.env.LIFTBOOK_BASE_URL || '').replace(/\/+$/, '');
  return baseUrl ? { ...config, experiments: { ...config.experiments, baseUrl } } : config;
};
