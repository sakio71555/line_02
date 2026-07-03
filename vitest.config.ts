import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@amami-line-crm\/([^/]+)$/,
        replacement: `${root}packages/$1/src`
      },
      {
        find: /^react$/,
        replacement: `${root}apps/admin/node_modules/react`
      },
      {
        find: /^react-dom\/server$/,
        replacement: `${root}apps/admin/node_modules/react-dom/server`
      }
    ]
  },
  test: {
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/tmp/**"
    ]
  }
});
