import { defineConfig } from "vite";

function normalizeBasePath(rawBase: string | undefined): string {
  if (!rawBase || rawBase === "/") {
    return "/";
  }

  let base = rawBase.trim();

  if (!base.startsWith("/")) {
    base = `/${base}`;
  }

  if (!base.endsWith("/")) {
    base = `${base}/`;
  }

  return base;
}

function inferCiBasePath(): string {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    return "/";
  }

  const [, repoName] = repository.split("/");
  if (!repoName || repoName.endsWith(".github.io")) {
    return "/";
  }

  return `/${repoName}/`;
}

const resolvedBase = normalizeBasePath(
  process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS === "true" ? inferCiBasePath() : "/")
);

export default defineConfig({
  base: resolvedBase,
  server: {
    host: true,
    port: 5173
  }
});
