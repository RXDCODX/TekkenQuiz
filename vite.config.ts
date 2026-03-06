import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
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
  process.env.VITE_BASE_PATH ??
    (process.env.GITHUB_ACTIONS === "true" ? inferCiBasePath() : "/"),
);

function resolveCommitSha(): string {
  if (process.env.VITE_COMMIT_SHA && process.env.VITE_COMMIT_SHA.trim()) {
    return process.env.VITE_COMMIT_SHA.trim();
  }

  try {
    const sha = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return sha || "dev";
  } catch {
    return "dev";
  }
}

const commitSha = resolveCommitSha();

export default defineConfig({
  base: resolvedBase,
  define: {
    "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(commitSha),
  },
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
