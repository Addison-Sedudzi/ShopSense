const { execSync } = require('child_process');

const CONTAINER_NAME = 'shopsense-e2e-postgres';

module.exports = async () => {
  try {
    execSync(`podman stop ${CONTAINER_NAME}`, { stdio: 'ignore' });
  } catch {
    // already gone -- fine
  }
};
