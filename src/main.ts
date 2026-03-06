import html2canvas from "html2canvas";
import "./styles.css";

const DATA_PATH = `${import.meta.env.BASE_URL}data/moves.json`;
const SUCCESS_FLASH_CLASS = "success-flash";
const NEXT_ROUND_DELAY_MS = 900;

type AnswerMode = "block" | "command";

interface MoveAnswers {
  onBlock?: string;
  commandStrict?: string;
  commandLoose?: string;
}

interface MovePayloadRecord {
  id?: string;
  character?: string;
  command?: string;
  videoUrl?: string;
  onBlock?: string;
  block?: string;
  answers?: MoveAnswers;
}

interface MovePayloadObject {
  moves?: MovePayloadRecord[];
}

interface MoveRecord {
  id: string;
  character: string;
  command: string;
  videoUrl: string;
  onBlockRaw: string;
  onBlockAnswer: string;
  commandStrict: string;
  commandLoose: string;
}

interface AppState {
  moves: MoveRecord[];
  playPool: MoveRecord[];
  currentMove: MoveRecord | null;
  lastCharacter: string;
  nickname: string;
  totalAnswered: number;
  correctAnswered: number;
  score: number;
  roundLocked: boolean;
  flashTimer: number | null;
  roundTimer: number | null;
  currentRound: number;
}

const elements = {
  startScreen: byId<HTMLElement>("startScreen"),
  gameScreen: byId<HTMLElement>("gameScreen"),
  resultScreen: byId<HTMLElement>("resultScreen"),
  nicknameInput: byId<HTMLInputElement>("nicknameInput"),
  loadingStatus: byId<HTMLElement>("loadingStatus"),
  startButton: byId<HTMLButtonElement>("startButton"),
  playerNickname: byId<HTMLElement>("playerNickname"),
  roundCurrent: byId<HTMLElement>("roundCurrent"),
  roundTotal: byId<HTMLElement>("roundTotal"),
  scoreValue: byId<HTMLElement>("scoreValue"),
  scoreGainLayer: byId<HTMLDivElement>("scoreGainLayer"),
  characterName: byId<HTMLElement>("characterName"),
  moveVideo: byId<HTMLVideoElement>("moveVideo"),
  videoFallback: byId<HTMLElement>("videoFallback"),
  blockInput: byId<HTMLInputElement>("blockInput"),
  commandInput: byId<HTMLInputElement>("commandInput"),
  submitBlockButton: byId<HTMLButtonElement>("submitBlockButton"),
  submitCommandButton: byId<HTMLButtonElement>("submitCommandButton"),
  statusMessage: byId<HTMLElement>("statusMessage"),
  resultCard: byId<HTMLElement>("resultCard"),
  resultNickname: byId<HTMLElement>("resultNickname"),
  resultHits: byId<HTMLElement>("resultHits"),
  resultScore: byId<HTMLElement>("resultScore"),
  resultAccuracy: byId<HTMLElement>("resultAccuracy"),
  resultDate: byId<HTMLElement>("resultDate"),
  screenshotButton: byId<HTMLButtonElement>("screenshotButton"),
  restartButton: byId<HTMLButtonElement>("restartButton")
};

const state: AppState = {
  moves: [],
  playPool: [],
  currentMove: null,
  lastCharacter: "",
  nickname: "Игрок",
  totalAnswered: 0,
  correctAnswered: 0,
  score: 0,
  roundLocked: false,
  flashTimer: null,
  roundTimer: null,
  currentRound: 0
};

void init();

async function init(): Promise<void> {
  wireEvents();
  await loadDatabase();
}

function wireEvents(): void {
  elements.startButton.addEventListener("click", startGame);
  elements.submitBlockButton.addEventListener("click", () => evaluateAnswer("block"));
  elements.submitCommandButton.addEventListener("click", () => evaluateAnswer("command"));
  elements.restartButton.addEventListener("click", returnToStartScreen);
  elements.screenshotButton.addEventListener("click", screenshotResult);

  elements.blockInput.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      evaluateAnswer("block");
    }
  });

  elements.commandInput.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      evaluateAnswer("command");
    }
  });

  elements.moveVideo.addEventListener("error", () => {
    elements.videoFallback.classList.remove("hidden");
    elements.videoFallback.textContent = "Видео недоступно, перехожу к следующему удару...";

    if (state.roundLocked) {
      return;
    }

    state.roundLocked = true;
    state.roundTimer = window.setTimeout(() => {
      state.roundLocked = false;
      nextRound();
    }, 800);
  });

  elements.moveVideo.addEventListener("loadeddata", () => {
    elements.videoFallback.classList.add("hidden");
  });
}

async function loadDatabase(): Promise<void> {
  setLoadingStatus("Загружаю базу ударов...");

  try {
    const response = await fetch(DATA_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as MovePayloadObject | MovePayloadRecord[];
    const rawMoves = Array.isArray(payload) ? payload : payload.moves;

    if (!Array.isArray(rawMoves) || rawMoves.length === 0) {
      throw new Error("JSON не содержит moves[]");
    }

    state.moves = rawMoves
      .map((record) => mapMoveRecord(record))
      .filter((record): record is MoveRecord => record !== null && Boolean(record.videoUrl));

    if (state.moves.length === 0) {
      throw new Error("После фильтрации не осталось ударов с видео");
    }

    updateProgressCounter();
    setLoadingStatus(`База готова: ${state.moves.length} ударов.`);
    elements.startButton.disabled = false;
  } catch (error) {
    setLoadingStatus(
      "Не удалось загрузить /data/moves.json. Сначала запусти: npm run build:db"
    );
    elements.startButton.disabled = true;
    console.error(error);
  }
}

function mapMoveRecord(record: MovePayloadRecord): MoveRecord | null {
  if (!record || typeof record !== "object") {
    return null;
  }

  const character = cleanText(record.character, "").toLowerCase();
  const command = cleanText(record.command, "");
  const videoUrl = cleanText(record.videoUrl, "");

  if (!character || !command || !videoUrl) {
    return null;
  }

  const onBlockRaw = cleanText(record.onBlock ?? record.block, "N/A");
  const answers = record.answers && typeof record.answers === "object" ? record.answers : {};

  const onBlockAnswer = normalizeFrameToken(answers.onBlock || onBlockRaw);
  const commandStrict = normalizeCommandStrict(answers.commandStrict || command);
  const commandLoose = normalizeCommandLoose(answers.commandLoose || command);

  return {
    id: cleanText(record.id, `${character}::${command}`),
    character,
    command,
    videoUrl,
    onBlockRaw,
    onBlockAnswer,
    commandStrict,
    commandLoose
  };
}

function startGame(): void {
  if (state.moves.length === 0) {
    setLoadingStatus("База не загружена. Проверь /data/moves.json.");
    return;
  }

  clearTimers();

  state.nickname = cleanText(elements.nicknameInput.value, "Игрок");
  state.totalAnswered = 0;
  state.correctAnswered = 0;
  state.score = 0;
  state.currentMove = null;
  state.lastCharacter = "";
  state.roundLocked = false;
  state.currentRound = 0;
  state.playPool = shuffleArray([...state.moves]);

  elements.playerNickname.textContent = state.nickname;
  elements.scoreGainLayer.innerHTML = "";

  showScreen("game");
  updateProgressCounter();
  updateScoreboard();
  setStatusMessage("Смотри видео. За On Block +1 балл, за Input +0.2 балла.", "");

  nextRound();
}

function nextRound(): void {
  clearTimers();
  clearInputs();

  const nextMove = pullNextMove();
  if (!nextMove) {
    finishByCompletion();
    return;
  }

  state.currentMove = nextMove;
  state.lastCharacter = nextMove.character;
  state.roundLocked = false;
  state.currentRound += 1;

  updateProgressCounter();
  renderCurrentMove();
}

function pullNextMove(): MoveRecord | null {
  if (state.playPool.length === 0) {
    return null;
  }

  let index = state.playPool.findIndex((move) => move.character !== state.lastCharacter);
  if (index < 0) {
    index = 0;
  }

  const [picked] = state.playPool.splice(index, 1);
  return picked ?? null;
}

function renderCurrentMove(): void {
  if (!state.currentMove) {
    return;
  }

  elements.characterName.textContent = capitalizeWord(state.currentMove.character);
  elements.videoFallback.classList.add("hidden");

  elements.moveVideo.pause();
  elements.moveVideo.src = state.currentMove.videoUrl;
  elements.moveVideo.load();

  void elements.moveVideo.play().catch(() => {
    // Автовоспроизведение может блокироваться браузером.
  });
}

function evaluateAnswer(answerType: AnswerMode): void {
  if (!state.currentMove || state.roundLocked) {
    return;
  }

  const inputElement = answerType === "block" ? elements.blockInput : elements.commandInput;
  const typedValue = cleanText(inputElement.value, "");

  if (!typedValue) {
    setStatusMessage("Сначала введи ответ в поле.", "error");
    return;
  }

  state.roundLocked = true;
  state.totalAnswered += 1;

  const answerIsCorrect =
    answerType === "block"
      ? compareFrameAnswer(typedValue, state.currentMove.onBlockAnswer)
      : compareCommandAnswer(
          typedValue,
          state.currentMove.commandStrict,
          state.currentMove.commandLoose
        );

  if (answerIsCorrect) {
    state.correctAnswered += 1;

    const gained = answerType === "block" ? 1 : 0.2;
    state.score += gained;

    updateScoreboard();
    showScoreGain(gained);
    setStatusMessage(gained === 1 ? "Верно! +1 балл." : "Верно! +0.2 балла.", "success");

    flashSuccessEdges();

    state.roundTimer = window.setTimeout(() => {
      nextRound();
      setStatusMessage("Смотри видео. За On Block +1 балл, за Input +0.2 балла.", "");
    }, NEXT_ROUND_DELAY_MS);

    return;
  }

  updateScoreboard();
  finishGame(answerType, typedValue);
}

function compareFrameAnswer(userValue: string, correctValue: string): boolean {
  const userNormalized = normalizeFrameToken(userValue);
  const correctNormalized = normalizeFrameToken(correctValue);

  const userNumber = extractFrameNumber(userNormalized);
  const correctNumber = extractFrameNumber(correctNormalized);

  if (userNumber !== null && correctNumber !== null) {
    return userNumber === correctNumber;
  }

  return userNormalized === correctNormalized;
}

function compareCommandAnswer(
  userValue: string,
  correctStrict: string,
  correctLoose: string
): boolean {
  const userStrict = normalizeCommandStrict(userValue);
  const userLoose = normalizeCommandLoose(userValue);

  return userStrict === correctStrict || userLoose === correctLoose;
}

function finishGame(answerType: AnswerMode, userInput: string): void {
  clearTimers();

  const correctAnswer =
    answerType === "block" ? state.currentMove?.onBlockAnswer ?? "N/A" : state.currentMove?.command ?? "N/A";

  setStatusMessage(`Неверно. Правильный ответ: ${correctAnswer}`, "error");
  renderResult();

  console.info("Wrong answer", {
    mode: answerType,
    typed: userInput,
    expected: correctAnswer,
    move: state.currentMove
  });

  showScreen("result");
}

function finishByCompletion(): void {
  clearTimers();
  setStatusMessage("Все удары из базы пройдены. Отличный забег!", "success");
  renderResult();
  showScreen("result");
}

function renderResult(): void {
  const accuracy =
    state.totalAnswered > 0 ? Math.round((state.correctAnswered / state.totalAnswered) * 100) : 0;

  elements.resultNickname.textContent = state.nickname;
  elements.resultHits.textContent = `${state.correctAnswered}/${state.totalAnswered}`;
  elements.resultScore.textContent = formatScore(state.score);
  elements.resultAccuracy.textContent = `${accuracy}%`;
  elements.resultDate.textContent = new Date().toLocaleString("ru-RU");
}

async function screenshotResult(): Promise<void> {
  try {
    const canvas = await html2canvas(elements.resultCard, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#0f1d2a"
    });

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `tekken-result-${safeFileToken(state.nickname)}-${Date.now()}.png`;
    link.click();
  } catch (error) {
    window.alert("Не получилось сделать скриншот результата.");
    console.error(error);
  }
}

function returnToStartScreen(): void {
  clearTimers();
  showScreen("start");
  setStatusMessage("Смотри видео. За On Block +1 балл, за Input +0.2 балла.", "");
}

function showScreen(screenName: "start" | "game" | "result"): void {
  elements.startScreen.classList.add("hidden");
  elements.gameScreen.classList.add("hidden");
  elements.resultScreen.classList.add("hidden");

  if (screenName === "start") {
    elements.startScreen.classList.remove("hidden");
  }

  if (screenName === "game") {
    elements.gameScreen.classList.remove("hidden");
  }

  if (screenName === "result") {
    elements.resultScreen.classList.remove("hidden");
  }
}

function updateScoreboard(): void {
  elements.scoreValue.textContent = formatScore(state.score);
}

function updateProgressCounter(): void {
  elements.roundCurrent.textContent = String(state.currentRound);
  elements.roundTotal.textContent = String(state.moves.length);
}

function setLoadingStatus(text: string): void {
  elements.loadingStatus.textContent = text;
}

function setStatusMessage(text: string, className: "success" | "error" | ""): void {
  elements.statusMessage.textContent = text;
  elements.statusMessage.classList.remove("success", "error");

  if (className) {
    elements.statusMessage.classList.add(className);
  }
}

function clearInputs(): void {
  elements.blockInput.value = "";
  elements.commandInput.value = "";
}

function showScoreGain(gain: number): void {
  const token = document.createElement("span");
  token.className = "score-gain";
  token.textContent = gain === 1 ? "+1" : "+0.2";

  elements.scoreGainLayer.appendChild(token);
  token.addEventListener(
    "animationend",
    () => {
      token.remove();
    },
    { once: true }
  );
}

function flashSuccessEdges(): void {
  document.body.classList.remove(SUCCESS_FLASH_CLASS);
  void document.body.offsetWidth;
  document.body.classList.add(SUCCESS_FLASH_CLASS);

  if (state.flashTimer !== null) {
    window.clearTimeout(state.flashTimer);
  }

  state.flashTimer = window.setTimeout(() => {
    document.body.classList.remove(SUCCESS_FLASH_CLASS);
    state.flashTimer = null;
  }, 700);
}

function clearTimers(): void {
  if (state.flashTimer !== null) {
    window.clearTimeout(state.flashTimer);
    state.flashTimer = null;
    document.body.classList.remove(SUCCESS_FLASH_CLASS);
  }

  if (state.roundTimer !== null) {
    window.clearTimeout(state.roundTimer);
    state.roundTimer = null;
  }
}

function extractFrameNumber(value: string): number | null {
  const match = String(value).match(/[-+]?\d+/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[0], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeFrameToken(value: string): string {
  const text = cleanText(value, "N/A").toUpperCase();

  if (text === "N/A" || text === "NA") {
    return "N/A";
  }

  const number = extractFrameNumber(text);
  if (number !== null) {
    return number > 0 ? `+${number}` : `${number}`;
  }

  return text.replace(/\s+/g, "");
}

function normalizeCommandStrict(value: string): string {
  return cleanText(value, "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/＋/g, "+");
}

function normalizeCommandLoose(value: string): string {
  return normalizeCommandStrict(value).replace(/[,+.~:*()]/g, "");
}

function capitalizeWord(value: string): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

function formatScore(value: number): string {
  return Number(value).toFixed(1);
}

function safeFileToken(value: string): string {
  return cleanText(value, "player")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 24);
}

function cleanText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Element #${id} not found`);
  }

  return element as T;
}

function shuffleArray<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    const temp = items[i];
    items[i] = items[randomIndex];
    items[randomIndex] = temp;
  }

  return items;
}
