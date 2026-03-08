import { execSync } from "node:child_process";
import process from "node:process";

function run(command, envOverrides = {}) {
  execSync(command, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...envOverrides
    }
  });
}

function getRepoNameFromRemote() {
  try {
    const remoteUrl = execSync("git config --get remote.origin.url", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();

    if (!remoteUrl) {
      return null;
    }

    const cleanUrl = remoteUrl.replace(/\.git$/, "");

    const match = cleanUrl.match(/[:/]([^/]+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function resolveRepoName() {
  if (process.env.GH_PAGES_REPO) {
    return process.env.GH_PAGES_REPO.trim();
  }

  if (process.env.GITHUB_REPOSITORY) {
    const [, repoName] = process.env.GITHUB_REPOSITORY.split("/");
    if (repoName) {
      return repoName.trim();
    }
  }

  return getRepoNameFromRemote();
}

function toBasePath(repoName) {
  if (!repoName || repoName.endsWith(".github.io")) {
    return "/";
  }

  return `/${repoName}/`;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const repoName = resolveRepoName();

  if (!repoName) {
    console.error("[deploy] Cannot detect repository name.");
    console.error("[deploy] Set remote origin or pass GH_PAGES_REPO=<repo-name>.");
    process.exit(1);
  }

  const basePath = toBasePath(repoName);

  console.log(`[deploy] Repo: ${repoName}`);
  console.log(`[deploy] Base path: ${basePath}`);
  if (dryRun) {
    console.log("[deploy] Dry run enabled. Publish step will be skipped.");
  }

  console.log("[deploy] Using existing public/data/moves.json (build:db skipped).");
  run("npm run build", { VITE_BASE_PATH: basePath });
  if (!dryRun) {
    run("npx gh-pages -d dist --dotfiles");
  }

  console.log(dryRun ? "[deploy] Dry run completed." : "[deploy] Publish completed.");
}

main();
