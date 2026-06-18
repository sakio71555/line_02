import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_API_DEVELOPMENT_PORT,
  DEFAULT_API_PRODUCTION_HOST,
  DEFAULT_API_PRODUCTION_PORT,
  resolveApiServerListenOptions
} from "../../apps/api/src/index";

const repoRoot = process.cwd();
const apiPackagePath = join(repoRoot, "apps/api/package.json");
const adminPackagePath = join(repoRoot, "apps/admin/package.json");
const apiRuntimePackagePaths = [
  join(repoRoot, "packages/ai/package.json"),
  join(repoRoot, "packages/config/package.json"),
  join(repoRoot, "packages/domain/package.json"),
  join(repoRoot, "packages/line/package.json"),
  join(repoRoot, "packages/rag/package.json")
];
const apiSystemdPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/systemd/amami-line-crm-api.service.template"
);
const adminSystemdPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/systemd/amami-line-crm-admin.service.template"
);
const apiEnvPath = join(repoRoot, "deploy/vps/taiyolabel/env/api.env.example");
const adminEnvPath = join(repoRoot, "deploy/vps/taiyolabel/env/admin.env.example");
const httpNginxPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm-http-bootstrap.conf.template"
);
const sslNginxPath = join(
  repoRoot,
  "deploy/vps/taiyolabel/nginx/amami-line-crm-ssl.conf.template"
);
const taskDocPath = join(
  repoRoot,
  "docs/11_codex_tasks/107_production_start_script_and_port_boundary.md"
);
const runbookPath = join(
  repoRoot,
  "docs/15_runbooks/production_start_script_and_port_boundary.md"
);
const productionReadinessPath = join(
  repoRoot,
  "docs/15_runbooks/production_readiness_final.md"
);

describe("Loop 107 production start script and port boundary", () => {
  it("keeps API development default compatible and production default fail-closed to localhost", () => {
    expect(resolveApiServerListenOptions({ NODE_ENV: "development" })).toEqual({
      port: DEFAULT_API_DEVELOPMENT_PORT
    });

    expect(resolveApiServerListenOptions({ NODE_ENV: "production" })).toEqual({
      hostname: DEFAULT_API_PRODUCTION_HOST,
      port: DEFAULT_API_PRODUCTION_PORT
    });
  });

  it("lets API_HOST/API_PORT override HOST/PORT for the production API service", () => {
    expect(
      resolveApiServerListenOptions({
        NODE_ENV: "production",
        API_HOST: "127.0.0.2",
        HOST: "0.0.0.0",
        API_PORT: "8789",
        PORT: "9999"
      })
    ).toEqual({
      hostname: "127.0.0.2",
      port: 8789
    });
  });

  it("falls back to safe production defaults for invalid or missing API port env", () => {
    expect(
      resolveApiServerListenOptions({
        APP_ENV: "production",
        API_PORT: "not-a-port",
        PORT: "70000"
      })
    ).toEqual({
      hostname: DEFAULT_API_PRODUCTION_HOST,
      port: DEFAULT_API_PRODUCTION_PORT
    });
  });

  it("defines production start scripts without adding dependency scripts", () => {
    const apiPackage = readJsonPackage(apiPackagePath);
    const adminPackage = readJsonPackage(adminPackagePath);

    expect(apiPackage.scripts.start).toBe("tsx src/index.ts");
    expect(apiPackage.scripts.build).toContain("tsc -p tsconfig.json");
    expect(apiPackage.dependencies["@amami-line-crm/rag"]).toBe("workspace:*");
    expect(adminPackage.scripts.start).toBe("next start --hostname 127.0.0.1");
    expect(adminPackage.scripts.build).toBe("next build");
  });

  it("keeps workspace package exports aligned with the API production build output", () => {
    for (const packagePath of apiRuntimePackagePaths) {
      const packageJson = readJsonPackage(packagePath);
      const packageName = packageJson.name.replace("@amami-line-crm/", "");

      expect(packageJson.main).toBe(`./dist/${packageName}/src/index.js`);
      expect(packageJson.types).toBe(`./dist/${packageName}/src/index.d.ts`);
      expect(packageJson.exports["."].default).toBe(`./dist/${packageName}/src/index.js`);
      expect(packageJson.exports["."].types).toBe(`./dist/${packageName}/src/index.d.ts`);
    }
  });

  it("wires systemd templates to existing start scripts and planned local ports", () => {
    const apiSystemd = readText(apiSystemdPath);
    const adminSystemd = readText(adminSystemdPath);

    expect(apiSystemd).toContain(
      "ExecStart=/usr/bin/env npx pnpm@10.12.1 --filter @amami-line-crm/api start"
    );
    expect(adminSystemd).toContain(
      "ExecStart=/usr/bin/env npx pnpm@10.12.1 --filter @amami-line-crm/admin start"
    );
    expect(apiSystemd).toContain("Environment=API_HOST=127.0.0.1");
    expect(apiSystemd).toContain("Environment=API_PORT=8788");
    expect(adminSystemd).toContain("Environment=HOSTNAME=127.0.0.1");
    expect(adminSystemd).toContain("Environment=PORT=3002");
    expect(`${apiSystemd}\n${adminSystemd}`).not.toContain("No production");
    expect(`${apiSystemd}\n${adminSystemd}`).not.toContain("Fail closed");
  });

  it("keeps env examples aligned with nginx planned upstreams and without secrets", () => {
    const combined = `${readText(apiEnvPath)}\n${readText(adminEnvPath)}`;

    expect(combined).toContain("API_HOST=127.0.0.1");
    expect(combined).toContain("API_PORT=8788");
    expect(combined).toContain("HOSTNAME=127.0.0.1");
    expect(combined).toContain("ADMIN_PORT=3002");
    expect(combined).toContain("PORT=3002");
    expect(combined).not.toMatch(new RegExp(`${"sk"}-[A-Za-z0-9_-]{10,}`, "u"));
    expect(combined).not.toMatch(new RegExp(`${"ey"}J[A-Za-z0-9_-]{20,}`, "u"));
    expect(combined).not.toMatch(/postgres(?:ql)?:\/\//iu);
  });

  it("keeps nginx scoped to taiyolabel upstreams without default server or reused ajnl certs", () => {
    const combined = `${readText(httpNginxPath)}\n${readText(sslNginxPath)}`;

    expect(combined).toContain("proxy_pass http://127.0.0.1:3002");
    expect(combined).toContain("proxy_pass http://127.0.0.1:8788");
    expect(combined).not.toContain("default_server");
    expect(combined).not.toContain("server_name _");
    expect(combined).not.toContain("/etc/letsencrypt/live/app.ajnl.net");
  });

  it("adds Loop 107 docs while keeping production readiness as production_no_go", () => {
    for (const filePath of [taskDocPath, runbookPath]) {
      expect(existsSync(filePath), filePath).toBe(true);
    }

    const combined = `${readText(taskDocPath)}\n${readText(runbookPath)}\n${readText(
      productionReadinessPath
    )}`;

    expect(combined).toContain("Loop 107");
    expect(combined).toContain("production start scripts");
    expect(combined).toContain("API_HOST");
    expect(combined).toContain("API_PORT");
    expect(combined).toContain("127.0.0.1:8788");
    expect(combined).toContain("127.0.0.1:3002");
    expect(combined).toContain("production_no_go");
  });
});

function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function readJsonPackage(filePath: string): {
  name: string;
  main: string;
  types: string;
  exports: Record<string, { default: string; types: string }>;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
} {
  return JSON.parse(readText(filePath)) as {
    name: string;
    main: string;
    types: string;
    exports: Record<string, { default: string; types: string }>;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
  };
}
