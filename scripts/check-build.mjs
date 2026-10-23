import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const failures = [];

const files = readdirSync(dist, { recursive: true }).filter((name) => statSync(join(dist, name)).isFile());
if (files.length !== 1 || files[0] !== "index.html") {
  failures.push(`dist must hold exactly one file, index.html. Found: ${files.join(", ")}`);
}

const html = readFileSync(join(dist, "index.html"), "utf8");
const policy = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1];

if (!policy) {
  failures.push("index.html has no Content-Security-Policy meta tag.");
} else {
  const directives = new Map(
    policy.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values];
    }),
  );
  if (directives.get("connect-src")?.join(" ") !== "'none'") failures.push("connect-src must be 'none'.");
  if (directives.get("default-src")?.join(" ") !== "'none'") failures.push("default-src must be 'none'.");
  if (html.indexOf("Content-Security-Policy") > html.indexOf("<script")) {
    failures.push("The policy must come before the first script.");
  }

  for (const tag of ["script", "style"]) {
    const allowed = directives.get(`${tag}-src`) ?? [];
    for (const [, body] of html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g"))) {
      const hash = `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;
      if (!allowed.includes(hash)) failures.push(`An inline ${tag} is missing from ${tag}-src.`);
    }
  }
}

const markup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, "");
for (const [, attribute, value] of markup.matchAll(/\s(src|href)="([^"]*)"/g)) {
  if (!value.startsWith("data:")) failures.push(`External ${attribute} found: ${value.slice(0, 80)}`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `check-build: ${failure}`).join("\n"));
  process.exit(1);
}

const size = (statSync(join(dist, "index.html")).size / 1024 / 1024).toFixed(2);
console.log(`check-build: dist/index.html is self-contained (${size} MB) and cannot open network connections.`);
