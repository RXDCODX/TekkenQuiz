import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { defineConfig } from "vite";

const SEMVER_TAG_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/;

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

function runGitCommand(command: string): string {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function normalizeSemverTag(value: string): string | null {
  const match = value.trim().match(SEMVER_TAG_PATTERN);
  if (!match) {
    return null;
  }

  const [, major, minor, patch] = match;
  return `${major}.${minor}.${patch}`;
}

const resolvedBase = normalizeBasePath(
  process.env.VITE_BASE_PATH ??
    (process.env.GITHUB_ACTIONS === "true" ? inferCiBasePath() : "/"),
);

function resolveCommitSha(): string {
  if (process.env.VITE_COMMIT_SHA && process.env.VITE_COMMIT_SHA.trim()) {
    return process.env.VITE_COMMIT_SHA.trim();
  }

  return runGitCommand("git rev-parse --short HEAD") || "dev";
}

function resolveSemverVersion(commitSha: string): string {
  if (process.env.VITE_APP_VERSION && process.env.VITE_APP_VERSION.trim()) {
    return process.env.VITE_APP_VERSION.trim();
  }

  const describeOutput = runGitCommand(
    'git describe --tags --long --match "v[0-9]*.[0-9]*.[0-9]*" --match "[0-9]*.[0-9]*.[0-9]*"',
  );

  const describeMatch = describeOutput.match(
    /^(v?\d+\.\d+\.\d+)-(\d+)-g([0-9a-f]+)$/i,
  );
  if (describeMatch) {
    const [, rawTag, aheadCountRaw, describedSha] = describeMatch;
    const tagVersion = normalizeSemverTag(rawTag);

    if (tagVersion) {
      const aheadCount = Number.parseInt(aheadCountRaw, 10);
      if (aheadCount === 0) {
        return tagVersion;
      }

      return `${tagVersion}-dev.${aheadCount}+${describedSha}`;
    }
  }

  const tagsOutput = runGitCommand("git tag --list --sort=-version:refname");
  const fallbackTag = tagsOutput
    .split("\n")
    .map((line) => normalizeSemverTag(line))
    .find((line): line is string => Boolean(line));

  if (fallbackTag) {
    return `${fallbackTag}-dev.0+${commitSha}`;
  }

  const packageVersion = normalizeSemverTag(
    process.env.npm_package_version ?? "",
  );
  if (packageVersion) {
    return `${packageVersion}-dev.0+${commitSha}`;
  }

  return `0.0.0-dev.0+${commitSha}`;
}

const commitSha = resolveCommitSha();
const appVersion = resolveSemverVersion(commitSha);

export default defineConfig({
  base: resolvedBase,
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
    "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(commitSha),
  },
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
