import html2canvas from "html2canvas";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnswerPanel } from "./components/AnswerPanel";
import { AppFooter } from "./components/AppFooter";
import { GameTopBar } from "./components/GameTopBar";
import { ResultScreen } from "./components/ResultScreen";
import { StartScreen } from "./components/StartScreen";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { VideoPanel } from "./components/VideoPanel";
import type {
  AnswerMode,
  GameMode,
  MovePayloadObject,
  MovePayloadRecord,
  MoveRecord,
  SandboxHitLevelFilter,
  SandboxMoveFilters,
  SandboxMovePropertyFilter,
  SandboxSortBy,
  SandboxStateFilter,
  ScoreGainToken,
  ScreenMode,
  StartupFilterBand,
} from "./types";
import {
  capitalizeWord,
  classifyFrameBand,
  cleanText,
  compareCommandAnswer,
  compareFrameAnswer,
  extractDamageNumber,
  extractFrameNumber,
  extractUrlHost,
  isFrameInputComplete,
  mapMoveRecord,
  playErrorSound,
  playSuccessSound,
  safeFileToken,
  sanitizeFrameInput,
  shuffleArray,
} from "./utils";

const DATA_PATH = `${import.meta.env.BASE_URL}data/moves.json`;
const SUCCESS_FLASH_CLASS = "success-flash";
const NEXT_ROUND_DELAY_MS = 900;
const NA_FRAME_HELP_DELAY_MS = 1700;
const SCREENSHOT_BG_COLOR = "#0f1d2a";
const PROGRESS_STORAGE_KEY = "tekken-progress-v1";
const PROGRESS_SCHEMA_VERSION = 1;
const CLASSIC_BEST_SCORE_STORAGE_KEY = "tekken-classic-best-score-v1";
const CLASSIC_BEST_SCORE_SCHEMA_VERSION = 1;
const APP_VERSION =
  cleanText(import.meta.env.VITE_APP_VERSION, "0.0.0-dev.0+dev").trim() ||
  "0.0.0-dev.0+dev";
const IS_DEV_MODE = import.meta.env.DEV;

const DEFAULT_SANDBOX_FILTERS: SandboxMoveFilters = {
  sortBy: "random",
  onBlockBands: [],
  onHitBands: [],
  startup: [],
  hitLevels: [],
  properties: [],
  states: [],
  throwMode: "all",
};

interface PersistedGameSnapshot {
  version: number;
  savedAt: number;
  gameMode: GameMode;
  nickname: string;
  nicknameInput: string;
  sandboxCharacter: string;
  sandboxFilters: SandboxMoveFilters;
  currentRound: number;
  totalRounds: number;
  totalAnswered: number;
  correctAnswered: number;
  score: number;
  sandboxCurrentStreak: number;
  sandboxBestStreak: number;
  currentMoveId: string;
  remainingMoveIds: string[];
  lastCharacter: string;
  blockInput: string;
  commandInput: string;
}

interface PersistedClassicBestScore {
  version: number;
  savedAt: number;
  score: number;
}

function isSandboxSortBy(value: unknown): value is SandboxSortBy {
  return (
    value === "random" ||
    value === "command-asc" ||
    value === "command-desc" ||
    value === "startup-asc" ||
    value === "startup-desc" ||
    value === "block-asc" ||
    value === "block-desc" ||
    value === "hit-asc" ||
    value === "hit-desc" ||
    value === "hitLevel-asc" ||
    value === "hitLevel-desc" ||
    value === "damage-asc" ||
    value === "damage-desc"
  );
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function sanitizeSandboxFilters(rawValue: unknown): SandboxMoveFilters {
  if (!rawValue || typeof rawValue !== "object") {
    return {
      ...DEFAULT_SANDBOX_FILTERS,
      onBlockBands: [],
      onHitBands: [],
      startup: [],
      hitLevels: [],
      properties: [],
      states: [],
    };
  }

  const value = rawValue as Partial<SandboxMoveFilters>;

  return {
    sortBy: isSandboxSortBy(value.sortBy)
      ? value.sortBy
      : DEFAULT_SANDBOX_FILTERS.sortBy,
    onBlockBands: sanitizeStringArray(
      value.onBlockBands,
    ) as SandboxMoveFilters["onBlockBands"],
    onHitBands: sanitizeStringArray(
      value.onHitBands,
    ) as SandboxMoveFilters["onHitBands"],
    startup: sanitizeStringArray(
      value.startup,
    ) as SandboxMoveFilters["startup"],
    hitLevels: sanitizeStringArray(
      value.hitLevels,
    ) as SandboxMoveFilters["hitLevels"],
    properties: sanitizeStringArray(
      value.properties,
    ) as SandboxMoveFilters["properties"],
    states: sanitizeStringArray(value.states) as SandboxMoveFilters["states"],
    throwMode:
      value.throwMode === "only" || value.throwMode === "exclude"
        ? value.throwMode
        : "all",
  };
}

function normalizeNonNegativeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, value);
}

function normalizeScoreToTenths(value: number): number {
  return Math.round(Math.max(0, value) * 10) / 10;
}

function parseSavedProgress(
  rawValue: string | null,
): PersistedGameSnapshot | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedGameSnapshot>;

    if (parsed.version !== PROGRESS_SCHEMA_VERSION) {
      return null;
    }

    if (parsed.gameMode !== "classic" && parsed.gameMode !== "sandbox") {
      return null;
    }

    if (typeof parsed.currentMoveId !== "string" || !parsed.currentMoveId) {
      return null;
    }

    if (!Array.isArray(parsed.remainingMoveIds)) {
      return null;
    }

    const savedAt = normalizeNonNegativeNumber(parsed.savedAt, Date.now());
    const currentRound = Math.max(
      1,
      Math.floor(normalizeNonNegativeNumber(parsed.currentRound, 1)),
    );
    const totalRounds = Math.max(
      currentRound,
      Math.floor(normalizeNonNegativeNumber(parsed.totalRounds, currentRound)),
    );
    const sandboxCurrentStreak = Math.floor(
      normalizeNonNegativeNumber(parsed.sandboxCurrentStreak),
    );
    const sandboxBestStreak = Math.max(
      sandboxCurrentStreak,
      Math.floor(normalizeNonNegativeNumber(parsed.sandboxBestStreak)),
    );

    return {
      version: PROGRESS_SCHEMA_VERSION,
      savedAt,
      gameMode: parsed.gameMode,
      nickname:
        typeof parsed.nickname === "string" && parsed.nickname.trim()
          ? parsed.nickname
          : "Игрок",
      nicknameInput:
        typeof parsed.nicknameInput === "string"
          ? parsed.nicknameInput
          : typeof parsed.nickname === "string"
            ? parsed.nickname
            : "",
      sandboxCharacter:
        typeof parsed.sandboxCharacter === "string"
          ? parsed.sandboxCharacter
          : "",
      sandboxFilters: sanitizeSandboxFilters(parsed.sandboxFilters),
      currentRound,
      totalRounds,
      totalAnswered: Math.floor(
        normalizeNonNegativeNumber(parsed.totalAnswered),
      ),
      correctAnswered: Math.floor(
        normalizeNonNegativeNumber(parsed.correctAnswered),
      ),
      score: normalizeNonNegativeNumber(parsed.score),
      sandboxCurrentStreak,
      sandboxBestStreak,
      currentMoveId: parsed.currentMoveId,
      remainingMoveIds: sanitizeStringArray(parsed.remainingMoveIds),
      lastCharacter:
        typeof parsed.lastCharacter === "string" ? parsed.lastCharacter : "",
      blockInput:
        typeof parsed.blockInput === "string" ? parsed.blockInput : "",
      commandInput:
        typeof parsed.commandInput === "string" ? parsed.commandInput : "",
    };
  } catch {
    return null;
  }
}

function parseSavedBestClassicScore(rawValue: string | null): number | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as
      | number
      | Partial<PersistedClassicBestScore>;

    if (typeof parsed === "number") {
      return normalizeScoreToTenths(parsed);
    }

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (
      typeof parsed.version === "number" &&
      parsed.version !== CLASSIC_BEST_SCORE_SCHEMA_VERSION
    ) {
      return null;
    }

    if (typeof parsed.score !== "number" || !Number.isFinite(parsed.score)) {
      return null;
    }

    return normalizeScoreToTenths(parsed.score);
  } catch {
    const fallbackValue = Number.parseFloat(rawValue);
    return Number.isFinite(fallbackValue)
      ? normalizeScoreToTenths(fallbackValue)
      : null;
  }
}

function formatSavedProgressLabel(snapshot: PersistedGameSnapshot): string {
  const modeLabel = snapshot.gameMode === "sandbox" ? "Песочница" : "Обычный";
  const roundLabel = `${snapshot.currentRound}/${snapshot.totalRounds}`;
  const timeLabel = new Date(snapshot.savedAt).toLocaleString("ru-RU");

  return `${modeLabel}, раунд ${roundLabel}, ${timeLabel}`;
}

function tokenizeLooseText(value: string): Set<string> {
  const normalized = String(value)
    .toLowerCase()
    .replace(/\r/g, " ")
    .replace(/\n/g, " ");

  return new Set(
    normalized
      .split(/[^a-z0-9+~.-]+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );
}

function getStartupBand(value: string): StartupFilterBand | null {
  const startup = extractFrameNumber(value);
  if (startup === null) {
    return null;
  }

  if (startup < 10) {
    return "under10";
  }

  if (startup > 20) {
    return "over20";
  }

  return `${startup}` as StartupFilterBand;
}

function isThrowMove(move: MoveRecord): boolean {
  const commandText = move.command.toLowerCase();
  const combined =
    `${move.command} ${move.name} ${move.notes} ${move.hitLevel}`.toLowerCase();
  const hitLevelTokens = tokenizeLooseText(move.hitLevel);

  if (commandText.includes("1+3") || commandText.includes("2+4")) {
    return true;
  }

  if (combined.includes("throw") || combined.includes("grab")) {
    return true;
  }

  return hitLevelTokens.has("t") || hitLevelTokens.has("th");
}

function collectHitLevelFlags(move: MoveRecord): Set<SandboxHitLevelFilter> {
  const flags = new Set<SandboxHitLevelFilter>();
  const text = move.hitLevel.toLowerCase();
  const tokens = tokenizeLooseText(move.hitLevel);

  if (tokens.has("h") || text.includes("high")) {
    flags.add("high");
  }

  if (tokens.has("m") || text.includes("mid")) {
    flags.add("mid");
  }

  if (tokens.has("l") || text.includes(" low")) {
    flags.add("low");
  }

  if (
    tokens.has("sl") ||
    text.includes("special low") ||
    text.includes("s.l")
  ) {
    flags.add("specialLow");
  }

  if (
    tokens.has("sm") ||
    tokens.has("sp") ||
    text.includes("special mid") ||
    text.includes("s.m")
  ) {
    flags.add("specialMid");
  }

  if (
    isThrowMove(move) ||
    tokens.has("throw") ||
    tokens.has("t") ||
    tokens.has("th")
  ) {
    flags.add("throw");
  }

  return flags;
}

function collectPropertyFlags(
  move: MoveRecord,
  throwMove: boolean,
): Set<SandboxMovePropertyFilter> {
  const flags = new Set<SandboxMovePropertyFilter>();
  const tags = tokenizeLooseText(move.tags);
  const notesAndTransitions = `${move.notes} ${move.transitions}`.toLowerCase();
  const hasPowerCrushTag = [...tags].some((token) => token.startsWith("pc"));

  if (throwMove) {
    flags.add("throw");
  }

  if (cleanText(move.onCounter, "N/A").toUpperCase() !== "N/A") {
    flags.add("counterHit");
  }

  if (
    tags.has("chp") ||
    notesAndTransitions.includes("chip") ||
    notesAndTransitions.includes("recoverable")
  ) {
    flags.add("chip");
  }

  if (notesAndTransitions.includes("jail")) {
    flags.add("jails");
  }

  if (
    notesAndTransitions.includes("parry") ||
    notesAndTransitions.includes("reversal")
  ) {
    flags.add("parry");
  }

  if (hasPowerCrushTag || notesAndTransitions.includes("power crush")) {
    flags.add("powerCrush");
  }

  if (tags.has("hom") || notesAndTransitions.includes("homing")) {
    flags.add("homing");
  }

  if (tags.has("he") || notesAndTransitions.includes("heat engager")) {
    flags.add("heatEngager");
  }

  if (tags.has("trn") || notesAndTransitions.includes("tornado")) {
    flags.add("tornado");
  }

  if (
    tags.has("fbr") ||
    notesAndTransitions.includes("floor") ||
    notesAndTransitions.includes("f!")
  ) {
    flags.add("floorInteraction");
  }

  if (
    notesAndTransitions.includes("wall") ||
    notesAndTransitions.includes("balcony") ||
    notesAndTransitions.includes("w!")
  ) {
    flags.add("wallInteraction");
  }

  return flags;
}

function collectStateFlags(move: MoveRecord): Set<SandboxStateFilter> {
  const flags = new Set<SandboxStateFilter>();
  const commandUpper = move.command.toUpperCase();
  const text =
    `${move.command} ${move.name} ${move.notes} ${move.transitions}`.toLowerCase();

  if (commandUpper.startsWith("WS.") || text.includes("while standing")) {
    flags.add("whileStanding");
  }

  if (commandUpper.startsWith("SS.") || text.includes("sidestep")) {
    flags.add("sidestep");
  }

  if (commandUpper.startsWith("FC.") || text.includes("full crouch")) {
    flags.add("fullCrouch");
  }

  if (commandUpper.startsWith("H.") || text.includes("heat")) {
    flags.add("heat");
  }

  if (commandUpper.startsWith("R.") || text.includes("rage")) {
    flags.add("rage");
  }

  return flags;
}

function hasAnySelectedFlag<T extends string>(
  selected: T[],
  flags: Set<T>,
): boolean {
  if (selected.length === 0) {
    return true;
  }

  return selected.some((item) => flags.has(item));
}

function moveMatchesSandboxFilters(
  move: MoveRecord,
  filters: SandboxMoveFilters,
): boolean {
  const throwMove = isThrowMove(move);

  if (filters.throwMode === "only" && !throwMove) {
    return false;
  }

  if (filters.throwMode === "exclude" && throwMove) {
    return false;
  }

  if (filters.onBlockBands.length > 0) {
    const blockBand = classifyFrameBand(move.onBlockAnswer);
    if (!blockBand || !filters.onBlockBands.includes(blockBand)) {
      return false;
    }
  }

  if (filters.onHitBands.length > 0) {
    const hitBand = classifyFrameBand(move.onHit);
    if (!hitBand || !filters.onHitBands.includes(hitBand)) {
      return false;
    }
  }

  if (filters.startup.length > 0) {
    const startupBand = getStartupBand(move.startup);
    if (!startupBand || !filters.startup.includes(startupBand)) {
      return false;
    }
  }

  if (!hasAnySelectedFlag(filters.hitLevels, collectHitLevelFlags(move))) {
    return false;
  }

  if (
    !hasAnySelectedFlag(
      filters.properties,
      collectPropertyFlags(move, throwMove),
    )
  ) {
    return false;
  }

  if (!hasAnySelectedFlag(filters.states, collectStateFlags(move))) {
    return false;
  }

  return true;
}

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: "asc" | "desc",
): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return direction === "asc" ? left - right : right - left;
}

function sortSandboxMoves(
  items: MoveRecord[],
  sortBy: SandboxSortBy,
): MoveRecord[] {
  if (sortBy === "random") {
    return [...items];
  }

  return [...items].sort((left, right) => {
    switch (sortBy) {
      case "command-asc":
        return left.command.localeCompare(right.command);
      case "command-desc":
        return right.command.localeCompare(left.command);
      case "startup-asc":
        return compareNullableNumbers(
          extractFrameNumber(left.startup),
          extractFrameNumber(right.startup),
          "asc",
        );
      case "startup-desc":
        return compareNullableNumbers(
          extractFrameNumber(left.startup),
          extractFrameNumber(right.startup),
          "desc",
        );
      case "block-asc":
        return compareNullableNumbers(
          extractFrameNumber(left.onBlockAnswer),
          extractFrameNumber(right.onBlockAnswer),
          "asc",
        );
      case "block-desc":
        return compareNullableNumbers(
          extractFrameNumber(left.onBlockAnswer),
          extractFrameNumber(right.onBlockAnswer),
          "desc",
        );
      case "hit-asc":
        return compareNullableNumbers(
          extractFrameNumber(left.onHit),
          extractFrameNumber(right.onHit),
          "asc",
        );
      case "hit-desc":
        return compareNullableNumbers(
          extractFrameNumber(left.onHit),
          extractFrameNumber(right.onHit),
          "desc",
        );
      case "hitLevel-asc":
        return left.hitLevel.localeCompare(right.hitLevel);
      case "hitLevel-desc":
        return right.hitLevel.localeCompare(left.hitLevel);
      case "damage-asc":
        return compareNullableNumbers(
          extractDamageNumber(left.damage),
          extractDamageNumber(right.damage),
          "asc",
        );
      case "damage-desc":
        return compareNullableNumbers(
          extractDamageNumber(left.damage),
          extractDamageNumber(right.damage),
          "desc",
        );
      default:
        return 0;
    }
  });
}

export function App(): JSX.Element {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const stored = localStorage.getItem("tekken-theme");
      return stored === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  const [screen, setScreen] = useState<ScreenMode>("start");
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [currentMove, setCurrentMove] = useState<MoveRecord | null>(null);

  const [nicknameInput, setNicknameInput] = useState("");
  const [nickname, setNickname] = useState("Игрок");

  const [loadingStatus, setLoadingStatus] = useState("Загружаю базу ударов...");
  const [canStart, setCanStart] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [sandboxCharacter, setSandboxCharacter] = useState("");
  const [sandboxFilters, setSandboxFilters] = useState<SandboxMoveFilters>(
    DEFAULT_SANDBOX_FILTERS,
  );

  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correctAnswered, setCorrectAnswered] = useState(0);
  const [score, setScore] = useState(0);
  const [bestClassicScore, setBestClassicScore] = useState<number | null>(
    () => {
      try {
        return parseSavedBestClassicScore(
          localStorage.getItem(CLASSIC_BEST_SCORE_STORAGE_KEY),
        );
      } catch {
        return null;
      }
    },
  );
  const [sandboxCurrentStreak, setSandboxCurrentStreak] = useState(0);
  const [sandboxBestStreak, setSandboxBestStreak] = useState(0);

  const [blockInput, setBlockInput] = useState("");
  const [blockInputError, setBlockInputError] = useState<string | null>(null);
  const [commandInput, setCommandInput] = useState("");

  const [videoError, setVideoError] = useState(false);
  const [scoreGains, setScoreGains] = useState<ScoreGainToken[]>([]);
  const [correctFlashMode, setCorrectFlashMode] = useState<AnswerMode | null>(
    null,
  );
  const [sandboxFeedback, setSandboxFeedback] = useState<{
    typedValue: string;
    correctValue: string;
  } | null>(null);
  const [naFrameFeedback, setNaFrameFeedback] = useState<{
    correctValue: string;
  } | null>(null);
  const [devAnswerVisible, setDevAnswerVisible] = useState(false);

  const [resultDate, setResultDate] = useState("-");
  const [failedMove, setFailedMove] = useState<MoveRecord | null>(null);
  const [failedAnswerMode, setFailedAnswerMode] = useState<AnswerMode | null>(
    null,
  );
  const [failedTypedValue, setFailedTypedValue] = useState("");
  const [savedProgress, setSavedProgress] =
    useState<PersistedGameSnapshot | null>(null);

  const playPoolRef = useRef<MoveRecord[]>([]);
  const lastCharacterRef = useRef("");
  const roundLockedRef = useRef(false);
  const roundTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);

  const characterOptions = useMemo(() => {
    const characters = new Set<string>();

    for (const move of moves) {
      characters.add(move.character);
    }

    return [...characters].sort((left, right) => left.localeCompare(right));
  }, [moves]);

  const videoCdnHosts = useMemo(() => {
    const hosts = new Set<string>();

    for (const move of moves) {
      const host = extractUrlHost(move.videoUrl);
      if (host) {
        hosts.add(host);
      }
    }

    return [...hosts].sort((left, right) => left.localeCompare(right));
  }, [moves]);

  const isSandboxMode = gameMode === "sandbox";
  const savedProgressLabel = useMemo(
    () => (savedProgress ? formatSavedProgressLabel(savedProgress) : ""),
    [savedProgress],
  );

  const sandboxCharacterMoves = useMemo(() => {
    if (!sandboxCharacter) {
      return [] as MoveRecord[];
    }

    return moves.filter((move) => move.character === sandboxCharacter);
  }, [moves, sandboxCharacter]);

  const sandboxFilteredMoves = useMemo(() => {
    const filteredMoves = sandboxCharacterMoves.filter((move) =>
      moveMatchesSandboxFilters(move, sandboxFilters),
    );

    return sortSandboxMoves(filteredMoves, sandboxFilters.sortBy);
  }, [sandboxCharacterMoves, sandboxFilters]);

  useEffect(() => {
    void loadDatabase();

    return () => {
      clearTimers();
    };
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;

    try {
      localStorage.setItem("tekken-theme", theme);
    } catch {
      // Ignore storage errors in private mode.
    }
  }, [theme]);

  useEffect(() => {
    setSandboxCharacter((currentValue) => {
      if (characterOptions.length === 0) {
        return "";
      }

      if (currentValue && characterOptions.includes(currentValue)) {
        return currentValue;
      }

      return characterOptions[0];
    });
  }, [characterOptions]);

  useEffect(() => {
    try {
      setSavedProgress(
        parseSavedProgress(localStorage.getItem(PROGRESS_STORAGE_KEY)),
      );
    } catch {
      setSavedProgress(null);
    }
  }, []);

  useEffect(() => {
    if (screen !== "game" || !currentMove || roundLockedRef.current) {
      return;
    }

    const snapshot: PersistedGameSnapshot = {
      version: PROGRESS_SCHEMA_VERSION,
      savedAt: Date.now(),
      gameMode,
      nickname,
      nicknameInput,
      sandboxCharacter,
      sandboxFilters,
      currentRound,
      totalRounds,
      totalAnswered,
      correctAnswered,
      score,
      sandboxCurrentStreak,
      sandboxBestStreak,
      currentMoveId: currentMove.id,
      remainingMoveIds: playPoolRef.current.map((move) => move.id),
      lastCharacter: lastCharacterRef.current,
      blockInput,
      commandInput,
    };

    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(snapshot));
      setSavedProgress(snapshot);
    } catch {
      // Ignore storage errors in private mode.
    }
  }, [
    screen,
    currentMove,
    gameMode,
    nickname,
    nicknameInput,
    sandboxCharacter,
    sandboxFilters,
    currentRound,
    totalRounds,
    totalAnswered,
    correctAnswered,
    score,
    sandboxCurrentStreak,
    sandboxBestStreak,
    blockInput,
    commandInput,
  ]);

  async function loadDatabase(): Promise<void> {
    setLoadingStatus("Загружаю базу ударов...");

    try {
      const response = await fetch(DATA_PATH, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as
        | MovePayloadObject
        | MovePayloadRecord[];
      const rawMoves = Array.isArray(payload) ? payload : payload.moves;

      if (!Array.isArray(rawMoves) || rawMoves.length === 0) {
        throw new Error("JSON не содержит moves[]");
      }

      const parsedMoves = rawMoves
        .map((record) => mapMoveRecord(record))
        .filter((record): record is MoveRecord => record !== null);

      if (parsedMoves.length === 0) {
        throw new Error("После фильтрации не осталось ударов с видео");
      }

      setMoves(parsedMoves);
      setLoadingStatus(`База готова: ${parsedMoves.length} ударов.`);
      setCanStart(true);
    } catch (error) {
      setLoadingStatus(
        "Не удалось загрузить /data/moves.json. Сначала запусти: npm run build:db",
      );
      setCanStart(false);
      console.error(error);
    }
  }

  function clearSavedProgress(): void {
    try {
      localStorage.removeItem(PROGRESS_STORAGE_KEY);
    } catch {
      // Ignore storage errors in private mode.
    }

    setSavedProgress(null);
  }

  function syncBestClassicScore(nextScore: number): void {
    const normalizedScore = normalizeScoreToTenths(nextScore);

    setBestClassicScore((currentBestScore) => {
      if (currentBestScore !== null && currentBestScore >= normalizedScore) {
        return currentBestScore;
      }

      const snapshot: PersistedClassicBestScore = {
        version: CLASSIC_BEST_SCORE_SCHEMA_VERSION,
        savedAt: Date.now(),
        score: normalizedScore,
      };

      try {
        localStorage.setItem(
          CLASSIC_BEST_SCORE_STORAGE_KEY,
          JSON.stringify(snapshot),
        );
      } catch {
        // Ignore storage errors in private mode.
      }

      return normalizedScore;
    });
  }

  function loadSavedProgress(): void {
    if (!savedProgress) {
      return;
    }

    if (moves.length === 0) {
      setLoadingStatus("Сначала дождись загрузки базы ударов.");
      return;
    }

    const moveById = new Map(moves.map((move) => [move.id, move]));
    const restoredCurrentMove = moveById.get(savedProgress.currentMoveId);

    if (!restoredCurrentMove) {
      clearSavedProgress();
      setLoadingStatus("Сохранение устарело и было удалено. Начни новую игру.");
      return;
    }

    const restoredPool = savedProgress.remainingMoveIds
      .map((id) => moveById.get(id))
      .filter((move): move is MoveRecord => move !== undefined);

    if (restoredPool.length !== savedProgress.remainingMoveIds.length) {
      clearSavedProgress();
      setLoadingStatus(
        "Сохранение не совпадает с текущей базой и было удалено.",
      );
      return;
    }

    clearTimers();
    setGameMode(savedProgress.gameMode);
    setNickname(cleanText(savedProgress.nickname, "Игрок"));
    setNicknameInput(savedProgress.nicknameInput || savedProgress.nickname);
    setSandboxCharacter(savedProgress.sandboxCharacter);
    setSandboxFilters(savedProgress.sandboxFilters);
    setCurrentRound(savedProgress.currentRound);
    setTotalRounds(
      Math.max(
        savedProgress.totalRounds,
        savedProgress.currentRound + restoredPool.length,
      ),
    );
    setTotalAnswered(savedProgress.totalAnswered);
    setCorrectAnswered(savedProgress.correctAnswered);
    setScore(savedProgress.gameMode === "sandbox" ? 0 : savedProgress.score);
    setSandboxCurrentStreak(
      savedProgress.gameMode === "sandbox"
        ? savedProgress.sandboxCurrentStreak
        : 0,
    );
    setSandboxBestStreak(
      savedProgress.gameMode === "sandbox"
        ? savedProgress.sandboxBestStreak
        : 0,
    );
    setBlockInput(savedProgress.blockInput);
    setBlockInputError(null);
    setCommandInput(savedProgress.commandInput);
    setVideoError(false);
    setScoreGains([]);
    setCorrectFlashMode(null);
    setSandboxFeedback(null);
    setNaFrameFeedback(null);
    setDevAnswerVisible(false);
    setResultDate("-");
    setFailedMove(null);
    setFailedAnswerMode(null);
    setFailedTypedValue("");

    playPoolRef.current = restoredPool;
    lastCharacterRef.current =
      savedProgress.lastCharacter || restoredCurrentMove.character;
    roundLockedRef.current = false;

    setCurrentMove(restoredCurrentMove);
    setScreen("game");
  }

  function clearTimers(): void {
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }

    if (roundTimerRef.current !== null) {
      window.clearTimeout(roundTimerRef.current);
      roundTimerRef.current = null;
    }

    document.body.classList.remove(SUCCESS_FLASH_CLASS);
  }

  function flashSuccessEdges(): void {
    document.body.classList.remove(SUCCESS_FLASH_CLASS);
    void document.body.offsetWidth;
    document.body.classList.add(SUCCESS_FLASH_CLASS);

    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }

    flashTimerRef.current = window.setTimeout(() => {
      document.body.classList.remove(SUCCESS_FLASH_CLASS);
      flashTimerRef.current = null;
    }, 700);
  }

  function pullNextMove(): MoveRecord | null {
    const pool = playPoolRef.current;
    if (pool.length === 0) {
      return null;
    }

    let index = pool.findIndex(
      (move) => move.character !== lastCharacterRef.current,
    );

    if (index < 0) {
      index = 0;
    }

    const [picked] = pool.splice(index, 1);
    return picked ?? null;
  }

  function nextRound(): void {
    if (roundTimerRef.current !== null) {
      window.clearTimeout(roundTimerRef.current);
      roundTimerRef.current = null;
    }

    setBlockInput("");
    setBlockInputError(null);
    setCommandInput("");
    setCorrectFlashMode(null);
    setSandboxFeedback(null);
    setNaFrameFeedback(null);

    const nextMove = pullNextMove();
    if (!nextMove) {
      finishByCompletion();
      return;
    }

    lastCharacterRef.current = nextMove.character;
    roundLockedRef.current = false;

    setCurrentMove(nextMove);
    setCurrentRound((value) => value + 1);
    setVideoError(false);
  }

  function handleModeChange(nextMode: GameMode): void {
    setGameMode(nextMode);

    if (nextMode === "sandbox" && !sandboxCharacter && characterOptions[0]) {
      setSandboxCharacter(characterOptions[0]);
    }
  }

  function handleBlockInputChange(rawValue: string): void {
    const compactValue = rawValue.replace(/\s+/g, "");
    const sanitized = sanitizeFrameInput(rawValue);

    setBlockInput(sanitized);

    if (!compactValue) {
      setBlockInputError(null);
      return;
    }

    if (compactValue !== sanitized) {
      setBlockInputError(
        "Разрешены только цифры и знаки +/-. Лишние символы удалены.",
      );
      return;
    }

    if (sanitized === "+" || sanitized === "-") {
      setBlockInputError("После знака нужно ввести число.");
      return;
    }

    setBlockInputError(null);
  }

  function startGame(): void {
    if (moves.length === 0) {
      setLoadingStatus("База не загружена. Проверь /data/moves.json.");
      return;
    }

    const availableMoves = isSandboxMode ? sandboxFilteredMoves : moves;

    if (availableMoves.length === 0) {
      setLoadingStatus(
        "Фильтры песочницы скрыли все удары. Ослабь фильтры или выбери другого персонажа.",
      );
      return;
    }

    clearTimers();
    clearSavedProgress();

    setNickname(cleanText(nicknameInput, "Игрок"));
    setCurrentMove(null);
    setCurrentRound(0);
    setTotalRounds(availableMoves.length);
    setTotalAnswered(0);
    setCorrectAnswered(0);
    setScore(0);
    setSandboxCurrentStreak(0);
    setSandboxBestStreak(0);
    setScoreGains([]);
    setCorrectFlashMode(null);
    setSandboxFeedback(null);
    setNaFrameFeedback(null);
    setBlockInputError(null);
    setDevAnswerVisible(false);
    setResultDate("-");
    setFailedMove(null);
    setFailedAnswerMode(null);
    setFailedTypedValue("");

    playPoolRef.current =
      isSandboxMode && sandboxFilters.sortBy !== "random"
        ? [...availableMoves]
        : shuffleArray([...availableMoves]);
    lastCharacterRef.current = "";
    roundLockedRef.current = false;

    setScreen("game");
    nextRound();
  }

  function finishByCompletion(): void {
    clearTimers();
    clearSavedProgress();
    roundLockedRef.current = true;
    setSandboxFeedback(null);
    setNaFrameFeedback(null);
    setFailedMove(null);
    setFailedAnswerMode(null);
    setFailedTypedValue("");

    if (gameMode === "classic") {
      syncBestClassicScore(score);
    }

    setResultDate(new Date().toLocaleString("ru-RU"));
    setScreen("result");
  }

  function finishWithWrongAnswer(
    answerType: AnswerMode,
    typedValue: string,
  ): void {
    clearTimers();
    clearSavedProgress();
    roundLockedRef.current = true;
    playErrorSound();
    setFailedMove(currentMove);
    setFailedAnswerMode(answerType);
    setFailedTypedValue(typedValue);

    const correctAnswer =
      answerType === "block"
        ? (currentMove?.onBlockAnswer ?? "N/A")
        : (currentMove?.command ?? "N/A");

    if (gameMode === "classic") {
      syncBestClassicScore(score);
    }

    setResultDate(new Date().toLocaleString("ru-RU"));
    setScreen("result");

    console.info("Wrong answer", {
      mode: answerType,
      typed: typedValue,
      expected: correctAnswer,
      move: currentMove,
    });
  }

  function pushScoreGain(value: number): void {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    setScoreGains((tokens) => [
      ...tokens,
      { id, text: value === 1 ? "+1" : "+0.2" },
    ]);
  }

  function evaluateAnswer(answerType: AnswerMode): void {
    if (!currentMove || roundLockedRef.current) {
      return;
    }

    if (isSandboxMode && answerType === "command") {
      return;
    }

    const typedValue = cleanText(
      answerType === "block" ? blockInput : commandInput,
      "",
    );

    if (!typedValue) {
      return;
    }

    if (answerType === "block" && !isFrameInputComplete(typedValue)) {
      setBlockInputError(
        "Фреймдата должна быть числом со знаком +/- или без знака (например: -12, +3, 10).",
      );
      return;
    }

    if (answerType === "block") {
      setBlockInputError(null);
    }

    roundLockedRef.current = true;
    setTotalAnswered((value) => value + 1);

    const answerIsCorrect =
      answerType === "block"
        ? compareFrameAnswer(typedValue, currentMove.onBlockAnswer)
        : compareCommandAnswer(
            typedValue,
            currentMove.commandStrict,
            currentMove.commandLoose,
          );

    if (answerIsCorrect) {
      const gained = answerType === "block" ? 1 : 0.2;

      playSuccessSound();
      setCorrectAnswered((value) => value + 1);
      setCorrectFlashMode(answerType);

      if (isSandboxMode) {
        const nextStreak = sandboxCurrentStreak + 1;
        setSandboxCurrentStreak(nextStreak);
        setSandboxBestStreak((bestValue) =>
          nextStreak > bestValue ? nextStreak : bestValue,
        );
      } else {
        setScore((value) => value + gained);
        pushScoreGain(gained);
      }

      flashSuccessEdges();

      roundTimerRef.current = window.setTimeout(() => {
        nextRound();
      }, NEXT_ROUND_DELAY_MS);

      return;
    }

    if (isSandboxMode) {
      setSandboxCurrentStreak(0);
    }

    if (answerType === "block" && currentMove.onBlockAnswer === "N/A") {
      playErrorSound();
      setNaFrameFeedback({ correctValue: currentMove.onBlockAnswer });

      roundTimerRef.current = window.setTimeout(() => {
        nextRound();
      }, NA_FRAME_HELP_DELAY_MS);

      return;
    }

    if (isSandboxMode) {
      playErrorSound();

      setSandboxFeedback({
        typedValue,
        correctValue: currentMove.onBlockAnswer,
      });

      return;
    }

    finishWithWrongAnswer(answerType, typedValue);
  }

  function handleVideoError(): void {
    setVideoError(true);

    if (roundLockedRef.current) {
      return;
    }

    roundLockedRef.current = true;

    roundTimerRef.current = window.setTimeout(() => {
      roundLockedRef.current = false;
      nextRound();
    }, 800);
  }

  function handleVideoLoaded(): void {
    setVideoError(false);
  }

  function proceedSandboxAfterFeedback(): void {
    if (!isSandboxMode || !sandboxFeedback) {
      return;
    }

    nextRound();
  }

  function isScreenshotCanvasLikelyBlank(canvas: HTMLCanvasElement): boolean {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return false;
    }

    const { width, height } = canvas;
    if (width === 0 || height === 0) {
      return true;
    }

    const data = context.getImageData(0, 0, width, height).data;
    const sampleStep = 18;
    let nonBackgroundPixels = 0;

    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];

        if (alpha < 8) {
          continue;
        }

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        const diffFromBackground =
          Math.abs(red - 15) + Math.abs(green - 29) + Math.abs(blue - 42);

        if (diffFromBackground > 28) {
          nonBackgroundPixels += 1;
          if (nonBackgroundPixels > 10) {
            return false;
          }
        }
      }
    }

    return true;
  }

  function buildScreenshotClone(clonedDocument: Document): void {
    clonedDocument.body.classList.add("screenshot-mode");
    clonedDocument
      .querySelectorAll<HTMLElement>(".reveal")
      .forEach((element) => {
        element.style.animation = "none";
        element.style.opacity = "1";
        element.style.transform = "none";
      });
  }

  async function captureResultCard(
    target: HTMLDivElement,
  ): Promise<HTMLCanvasElement> {
    const sharedOptions = {
      scale: 2,
      useCORS: true,
      backgroundColor: SCREENSHOT_BG_COLOR,
      // Cross-origin videos taint canvas and break PNG export, so skip them.
      ignoreElements: (element: Element) => element.tagName === "VIDEO",
      onclone: buildScreenshotClone,
    };

    try {
      const primaryCanvas = await html2canvas(target, {
        ...sharedOptions,
        foreignObjectRendering: false,
      });

      if (!isScreenshotCanvasLikelyBlank(primaryCanvas)) {
        return primaryCanvas;
      }
    } catch (error) {
      console.warn(
        "Primary screenshot renderer failed, trying fallback.",
        error,
      );
    }

    return html2canvas(target, {
      ...sharedOptions,
      foreignObjectRendering: true,
    });
  }

  async function screenshotResult(): Promise<void> {
    const resultCard = resultCardRef.current;
    if (!resultCard) {
      return;
    }

    try {
      const canvas = await captureResultCard(resultCard);
      if (isScreenshotCanvasLikelyBlank(canvas)) {
        throw new Error("Captured screenshot canvas is blank");
      }

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `tekken-result-${safeFileToken(nickname)}-${Date.now()}.png`;
      link.click();
    } catch (error) {
      window.alert("Не получилось сделать скриншот результата.");
      console.error(error);
    }
  }

  function returnToStartScreen(): void {
    clearTimers();
    roundLockedRef.current = false;
    setBlockInputError(null);
    setScreen("start");
  }

  return (
    <>
      <div className="ambient-bg" aria-hidden="true"></div>
      <div className="grain-layer" aria-hidden="true"></div>

      <div className="app-shell">
        {screen !== "start" ? (
          <button
            className="back-menu-button"
            type="button"
            onClick={returnToStartScreen}
            aria-label="Вернуться в главное меню"
            title="Вернуться в главное меню"
          >
            <span aria-hidden="true">&larr;</span>
          </button>
        ) : null}

        <ThemeSwitcher theme={theme} onThemeChange={setTheme} />

        {screen === "start" ? (
          <StartScreen
            nicknameInput={nicknameInput}
            loadingStatus={loadingStatus}
            canStart={canStart}
            mode={gameMode}
            characterOptions={characterOptions}
            sandboxCharacter={sandboxCharacter}
            sandboxFilters={sandboxFilters}
            sandboxFilteredCount={sandboxFilteredMoves.length}
            sandboxTotalCount={sandboxCharacterMoves.length}
            bestClassicScore={bestClassicScore}
            hasSavedProgress={Boolean(savedProgress)}
            savedProgressLabel={savedProgressLabel}
            onNicknameChange={setNicknameInput}
            onModeChange={handleModeChange}
            onSandboxCharacterChange={setSandboxCharacter}
            onSandboxFiltersChange={setSandboxFilters}
            onStart={startGame}
            onLoadSavedProgress={loadSavedProgress}
            onClearSavedProgress={clearSavedProgress}
          />
        ) : null}

        {screen === "game" ? (
          <section className="screen">
            <GameTopBar
              gameMode={gameMode}
              nickname={nickname}
              currentRound={currentRound}
              totalRounds={totalRounds}
              score={score}
              sandboxCurrentStreak={sandboxCurrentStreak}
              sandboxBestStreak={sandboxBestStreak}
              scoreGains={scoreGains}
              onScoreGainDone={(id) => {
                setScoreGains((tokens) =>
                  tokens.filter((token) => token.id !== id),
                );
              }}
            />

            <main className="game-grid">
              <VideoPanel
                characterName={capitalizeWord(currentMove?.character ?? "")}
                videoUrl={currentMove?.videoUrl ?? ""}
                videoError={videoError}
                videoCdnHosts={videoCdnHosts}
                onVideoLoaded={handleVideoLoaded}
                onVideoError={handleVideoError}
              >
                <AnswerPanel
                  gameMode={gameMode}
                  blockInput={blockInput}
                  blockInputError={blockInputError}
                  commandInput={commandInput}
                  correctFlashMode={correctFlashMode}
                  sandboxFeedback={sandboxFeedback}
                  naFrameFeedback={naFrameFeedback}
                  devMode={IS_DEV_MODE}
                  devVisible={devAnswerVisible}
                  devCorrectOnBlock={currentMove?.onBlockAnswer ?? "N/A"}
                  devCorrectCommand={currentMove?.command ?? "N/A"}
                  onBlockInputChange={handleBlockInputChange}
                  onCommandInputChange={setCommandInput}
                  onSubmitBlock={() => evaluateAnswer("block")}
                  onSubmitCommand={() => evaluateAnswer("command")}
                  onSandboxProceed={proceedSandboxAfterFeedback}
                  onToggleDevVisible={() =>
                    setDevAnswerVisible((visible) => !visible)
                  }
                />
              </VideoPanel>
            </main>
          </section>
        ) : null}

        {screen === "result" ? (
          <ResultScreen
            gameMode={gameMode}
            nickname={nickname}
            correctAnswered={correctAnswered}
            totalAnswered={totalAnswered}
            score={score}
            resultDate={resultDate}
            failedMove={failedMove}
            failedAnswerMode={failedAnswerMode}
            failedTypedValue={failedTypedValue}
            onScreenshot={screenshotResult}
            onRestart={returnToStartScreen}
            resultCardRef={resultCardRef}
          />
        ) : null}

        <AppFooter version={APP_VERSION} />
      </div>
    </>
  );
}
