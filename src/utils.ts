import type { MovePayloadRecord, MoveRecord } from "./types";

let feedbackAudioContext: AudioContext | null = null;

type BrowserAudioContextConstructor = typeof AudioContext;

function getFeedbackAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (feedbackAudioContext) {
    return feedbackAudioContext;
  }

  const win = window as Window & {
    webkitAudioContext?: BrowserAudioContextConstructor;
  };

  const AudioContextClass = window.AudioContext ?? win.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  try {
    feedbackAudioContext = new AudioContextClass();
    return feedbackAudioContext;
  } catch {
    return null;
  }
}

function withFeedbackAudio(run: (context: AudioContext) => void): void {
  const context = getFeedbackAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    void context
      .resume()
      .then(() => run(context))
      .catch(() => undefined);
    return;
  }

  run(context);
}

function playTone(
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  type: OscillatorType,
  maxGain: number,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(maxGain, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startAt + Math.max(duration, 0.04),
  );

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

export function playSuccessSound(): void {
  withFeedbackAudio((context) => {
    const startAt = context.currentTime + 0.01;

    playTone(context, 700, startAt, 0.1, "triangle", 0.055);
    playTone(context, 980, startAt + 0.11, 0.11, "sine", 0.05);
  });
}

export function playErrorSound(): void {
  withFeedbackAudio((context) => {
    const startAt = context.currentTime + 0.01;

    playTone(context, 270, startAt, 0.12, "sawtooth", 0.048);
    playTone(context, 190, startAt + 0.12, 0.16, "square", 0.04);
  });
}

export function cleanText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

export function extractFrameNumber(value: string): number | null {
  const match = String(value).match(/[-+]?\d+/);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[0], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function normalizeFrameToken(value: string): string {
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

export function normalizeCommandStrict(value: string): string {
  return cleanText(value, "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/＋/g, "+");
}

export function normalizeCommandLoose(value: string): string {
  return normalizeCommandStrict(value).replace(/[,+.~:*()]/g, "");
}

export function compareFrameAnswer(
  userValue: string,
  correctValue: string,
): boolean {
  const userNormalized = normalizeFrameToken(userValue);
  const correctNormalized = normalizeFrameToken(correctValue);

  const userNumber = extractFrameNumber(userNormalized);
  const correctNumber = extractFrameNumber(correctNormalized);

  if (userNumber !== null && correctNumber !== null) {
    return userNumber === correctNumber;
  }

  return userNormalized === correctNormalized;
}

export function compareCommandAnswer(
  userValue: string,
  correctStrict: string,
  correctLoose: string,
): boolean {
  const userStrict = normalizeCommandStrict(userValue);
  const userLoose = normalizeCommandLoose(userValue);

  return userStrict === correctStrict || userLoose === correctLoose;
}

export function capitalizeWord(value: string): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

export function formatScore(value: number): string {
  return Number(value).toFixed(1);
}

export function safeFileToken(value: string): string {
  return cleanText(value, "player")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 24);
}

export function shuffleArray<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    const temp = items[i];
    items[i] = items[randomIndex];
    items[randomIndex] = temp;
  }

  return items;
}

export function mapMoveRecord(record: MovePayloadRecord): MoveRecord | null {
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
  const answers =
    record.answers && typeof record.answers === "object" ? record.answers : {};

  const onBlockAnswer = normalizeFrameToken(answers.onBlock || onBlockRaw);
  const commandStrict = normalizeCommandStrict(
    answers.commandStrict || command,
  );
  const commandLoose = normalizeCommandLoose(answers.commandLoose || command);

  return {
    id: cleanText(record.id, `${character}::${command}`),
    character,
    command,
    videoUrl,
    onBlockRaw,
    onBlockAnswer,
    commandStrict,
    commandLoose,
  };
}
