const { copyFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const distDir = join(__dirname, '..', 'node_modules', '@vitejs', 'plugin-react', 'dist');
const source = join(distDir, 'refreshUtils.js');
const target = join(distDir, 'refresh-runtime.js');

try {
  if (!existsSync(target) && existsSync(source)) {
    copyFileSync(source, target);
    console.log('[postinstall] Added @vitejs/plugin-react/dist/refresh-runtime.js');
  }
} catch (error) {
    console.warn('[postinstall] Unable to ensure react refresh runtime:', error);
}
