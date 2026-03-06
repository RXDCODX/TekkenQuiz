import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = "https://okizeme.gg";
const VIDEO_CDN_BASE = "https://okizeme.b-cdn.net";
const OUTPUT_PATH = path.resolve("public", "data", "moves.json");

function parseArgs(argv) {
  const parsed = {};

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      continue;
    }

    const withoutPrefix = item.slice(2);
    const [key, inlineValue] = withoutPrefix.split("=");

    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }

    parsed[key] = next;
    i += 1;
  }

  return parsed;
}

function readInt(rawValue, fallback, minValue = 0) {
  if (rawValue === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(String(rawValue), 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(parsed, minValue);
}

function cleanText(value, fallback = "N/A") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

function normalizeFrameAnswer(value) {
  const text = cleanText(value, "N/A").toUpperCase();
  if (text === "N/A" || text === "NA") {
    return "N/A";
  }

  const numberMatch = text.match(/[-+]?\d+/);
  if (!numberMatch) {
    return text.replace(/\s+/g, "");
  }

  const number = Number.parseInt(numberMatch[0], 10);
  if (Number.isNaN(number)) {
    return text.replace(/\s+/g, "");
  }

  return number > 0 ? `+${number}` : `${number}`;
}

function normalizeCommandStrict(command) {
  return cleanText(command, "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/＋/g, "+");
}

function normalizeCommandLoose(command) {
  return normalizeCommandStrict(command).replace(/[,+.~:*()]/g, "");
}

function extractCharacterSlugs(html) {
  const slugMatches = [...html.matchAll(/href="\/database\/([^"\/?#]+)"/g)];

  const ignored = new Set([
    "database",
    "saved-moves",
    "about",
    "contact",
    "support",
    "signin"
  ]);

  const slugs = slugMatches
    .map((match) => decodeURIComponent(match[1]).toLowerCase())
    .filter((slug) => slug.length > 0 && !ignored.has(slug));

  return [...new Set(slugs)].sort((a, b) => a.localeCompare(b));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

async function mapWithConcurrency(items, concurrency, worker) {
  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length || 1));
  const results = new Array(items.length);
  let cursor = 0;

  async function runWorker() {
    while (true) {
      const currentIndex = cursor;
      cursor += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: safeConcurrency }, () => runWorker()));
  return results;
}

function buildFallbackVideoUrl(character, command) {
  return `${VIDEO_CDN_BASE}/${character}/${encodeURIComponent(command)}.mp4`;
}

async function resolveVideoUrl(character, command, videoMode) {
  const fallbackUrl = buildFallbackVideoUrl(character, command);

  if (videoMode === "pattern") {
    return {
      videoUrl: fallbackUrl,
      videoApiUrl: null,
      usedFallback: false
    };
  }

  const videoApiUrl = `${BASE_URL}/api/${character}/${encodeURIComponent(command)}`;

  try {
    const payload = await fetchJson(videoApiUrl);
    if (payload && typeof payload.presignedUrl === "string" && payload.presignedUrl.length > 0) {
      return {
        videoUrl: payload.presignedUrl,
        videoApiUrl,
        usedFallback: false
      };
    }

    return {
      videoUrl: fallbackUrl,
      videoApiUrl,
      usedFallback: true
    };
  } catch {
    return {
      videoUrl: fallbackUrl,
      videoApiUrl,
      usedFallback: true
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const videoMode = args["video-mode"] === "pattern" ? "pattern" : "api";
  const concurrency = readInt(args.concurrency, 18, 1);
  const limitCharacters = readInt(args["limit-characters"], 0, 0);
  const limitMoves = readInt(args["limit-moves"], 0, 0);
  const forcedCharacters = args.characters
    ? String(args.characters)
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    : null;

  console.log("[1/4] Loading character list...");

  const characters = forcedCharacters
    ? [...new Set(forcedCharacters)]
    : extractCharacterSlugs(await fetchText(`${BASE_URL}/database`));

  if (characters.length === 0) {
    throw new Error("No characters were found.");
  }

  const characterSet = limitCharacters > 0 ? characters.slice(0, limitCharacters) : characters;

  console.log(`[2/4] Loading move lists for ${characterSet.length} characters...`);

  const characterMoveBatches = await mapWithConcurrency(
    characterSet,
    Math.min(8, concurrency),
    async (character, index) => {
      const characterApiUrl = `${BASE_URL}/api/${character}`;
      const moves = await fetchJson(characterApiUrl);

      console.log(`  - [${index + 1}/${characterSet.length}] ${character}: ${moves.length} moves`);
      return {
        character,
        characterApiUrl,
        moves
      };
    }
  );

  const flattenedMoves = [];

  for (const batch of characterMoveBatches) {
    for (const move of batch.moves) {
      const command = cleanText(move.command, "");
      if (!command) {
        continue;
      }

      flattenedMoves.push({
        character: batch.character,
        characterApiUrl: batch.characterApiUrl,
        move,
        command
      });
    }
  }

  const scopedMoves = limitMoves > 0 ? flattenedMoves.slice(0, limitMoves) : flattenedMoves;

  console.log(`[3/4] Resolving videos and shaping dataset for ${scopedMoves.length} moves...`);

  const records = await mapWithConcurrency(scopedMoves, concurrency, async (item, index) => {
    const videoData = await resolveVideoUrl(item.character, item.command, videoMode);

    if ((index + 1) % 300 === 0 || index === scopedMoves.length - 1) {
      console.log(`  - Processed ${index + 1}/${scopedMoves.length}`);
    }

    return {
      id: `${item.character}::${item.command}`,
      character: item.character,
      command: item.command,
      name: cleanText(item.move.name, "No designated move name"),
      startup: cleanText(item.move.startup),
      hitLevel: cleanText(item.move.hitLevel),
      onBlock: cleanText(item.move.block),
      onHit: cleanText(item.move.hit),
      onCounter: cleanText(item.move.counter),
      damage: cleanText(item.move.damage),
      notes: cleanText(item.move.notes, "No additional notes"),
      tags: cleanText(item.move.tags, "N/A"),
      transitions: cleanText(item.move.transitions, "N/A"),
      recovery: cleanText(item.move.recovery),
      wavuId: cleanText(item.move.wavu_id, "N/A"),
      videoUrl: videoData.videoUrl,
      usedVideoFallback: videoData.usedFallback,
      answers: {
        onBlock: normalizeFrameAnswer(item.move.block),
        commandStrict: normalizeCommandStrict(item.command),
        commandLoose: normalizeCommandLoose(item.command)
      },
      source: {
        characterApiUrl: item.characterApiUrl,
        videoApiUrl: videoData.videoApiUrl
      }
    };
  });

  const fallbackCount = records.filter((record) => record.usedVideoFallback).length;

  const output = {
    generatedAt: new Date().toISOString(),
    source: BASE_URL,
    videoMode,
    stats: {
      characters: characterSet.length,
      moves: records.length,
      fallbackVideos: fallbackCount
    },
    characters: characterSet,
    moves: records
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`[4/4] Done. Saved ${records.length} moves to ${OUTPUT_PATH}`);
  if (fallbackCount > 0) {
    console.log(`      Video fallback was used for ${fallbackCount} moves.`);
  }
}

main().catch((error) => {
  console.error("Failed to build move database:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
