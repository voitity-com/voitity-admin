import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

// https://github.com/vitejs/vite/issues/15012#issuecomment-1825035992
function muteWarningsPlugin(warningsToIgnore: string[][]): Plugin {
  const mutedMessages = new Set();

  return {
    name: 'mute-warnings',
    enforce: 'pre',
    config: (userConfig) => ({
      build: {
        rollupOptions: {
          onwarn(warning, defaultHandler) {
            if (warning.code) {
              const muted = warningsToIgnore.find(
                ([code, message]) => code == warning.code && warning.message.includes(message)
              );

              if (muted) {
                mutedMessages.add(muted.join());
                return;
              }
            }

            if (userConfig.build?.rollupOptions?.onwarn) {
              userConfig.build.rollupOptions.onwarn(warning, defaultHandler);
            } else {
              defaultHandler(warning);
            }
          },
        },
      },
    }),
    closeBundle() {
      const diff = warningsToIgnore.filter((x) => !mutedMessages.has(x.join()));
      if (diff.length > 0) {
        this.warn('Some of your muted warnings never appeared during the build process:');
        diff.forEach((m) => this.warn(`- ${m.join(': ')}`));
      }
    },
  };
}

// See this: https://github.com/vitejs/vite/issues/15012
const warningsToIgnore = [
  ['SOURCEMAP_ERROR', "Can't resolve original location of error"],
  ['INVALID_ANNOTATION', 'contains an annotation that Rollup cannot interpret'],
];

function vendorChunk(id: string): string | undefined {
  const moduleId = id.replaceAll('\\', '/');

  if (!moduleId.includes('/node_modules/')) {
    return undefined;
  }

  const groups: Array<[string, string[]]> = [
    ['maps', ['/mapbox-gl/', '/react-map-gl/']],
    ['pdf', ['/@react-pdf/', '/pdfjs-dist/']],
    ['code-highlighter', ['/react-syntax-highlighter/', '/highlight.js/', '/refractor/']],
    ['calendar', ['/@fullcalendar/']],
    ['charts', ['/recharts/', '/d3-']],
    ['editor', ['/@tiptap/', '/prosemirror-']],
    ['mui', ['/@mui/', '/@emotion/']],
    ['cloud-auth', ['/@aws-amplify/', '/aws-amplify/', '/firebase/', '/@supabase/']],
    [
      'react',
      [
        '/node_modules/react/',
        '/node_modules/react-dom/',
        '/node_modules/react-router/',
        '/node_modules/react-router-dom/',
        '/node_modules/react-helmet-async/',
        '/node_modules/scheduler/',
      ],
    ],
  ];

  return groups.find(([, packages]) => packages.some((packageName) => moduleId.includes(packageName)))?.[0];
}

export default defineConfig({
  plugins: [react(), muteWarningsPlugin(warningsToIgnore)],
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^~(.+)/,
        replacement: path.join(process.cwd(), 'node_modules/$1'),
      },
      {
        find: /^@\/(.+)/,
        replacement: path.join(process.cwd(), 'src/$1'),
      },
    ],
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});
