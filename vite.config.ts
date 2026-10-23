import { createHash } from "node:crypto";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { defineConfig } from "vitest/config";

function inlineHashes(html: string, tag: "script" | "style"): string[] {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  return [...html.matchAll(pattern)].map(
    ([, body]) => `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`,
  );
}

function contentSecurityPolicy(): Plugin {
  return {
    name: "quire-content-security-policy",
    apply: "build",
    enforce: "post",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type !== "asset" || !file.fileName.endsWith(".html")) continue;
          const html = String(file.source);
          const policy = [
            "default-src 'none'",
            `script-src ${inlineHashes(html, "script").join(" ")}`,
            `style-src ${inlineHashes(html, "style").join(" ")}`,
            "img-src blob: data:",
            "font-src data:",
            "worker-src blob: data:",
            "connect-src 'none'",
            "form-action 'none'",
            "base-uri 'none'",
            "object-src 'none'",
          ].join("; ");
          file.source = html.replace(
            "<head>",
            `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
          );
        }
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true }), contentSecurityPolicy()],
  build: {
    target: "es2023",
    chunkSizeWarningLimit: 5000,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
