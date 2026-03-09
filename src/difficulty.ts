import type { GameDifficulty } from "./types";

export interface GameDifficultyRules {
  label: string;
  maxMistakes: number;
  frameTolerance: number;
}

export const DEFAULT_GAME_DIFFICULTY: GameDifficulty = "medium";

export const GAME_DIFFICULTY_ORDER: GameDifficulty[] = [
  "easy",
  "medium",
  "hard",
  "hardcore",
];

export const GAME_DIFFICULTY_RULES: Record<
  GameDifficulty,
  GameDifficultyRules
> = {
  easy: {
    label: "Легкий",
    maxMistakes: 3,
    frameTolerance: 3,
  },
  medium: {
    label: "Средний",
    maxMistakes: 2,
    frameTolerance: 2,
  },
  hard: {
    label: "Сложный",
    maxMistakes: 1,
    frameTolerance: 1,
  },
  hardcore: {
    label: "Хардкор",
    maxMistakes: 0,
    frameTolerance: 0,
  },
};

export function isGameDifficulty(value: unknown): value is GameDifficulty {
  return (
    value === "easy" ||
    value === "medium" ||
    value === "hard" ||
    value === "hardcore"
  );
}

function pluralizeMistakes(count: number): string {
  const normalized = Math.abs(count) % 100;
  const lastDigit = normalized % 10;

  if (normalized >= 11 && normalized <= 19) {
    return "ошибок";
  }

  if (lastDigit === 1) {
    return "ошибка";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "ошибки";
  }

  return "ошибок";
}

function pluralizeFrames(count: number): string {
  const normalized = Math.abs(count) % 100;
  const lastDigit = normalized % 10;

  if (normalized >= 11 && normalized <= 19) {
    return "кадров";
  }

  if (lastDigit === 1) {
    return "кадр";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "кадра";
  }

  return "кадров";
}

export function formatMistakeLimit(maxMistakes: number): string {
  if (maxMistakes <= 0) {
    return "Без ошибок";
  }

  return `До ${maxMistakes} ${pluralizeMistakes(maxMistakes)}`;
}

export function formatFrameTolerance(frameTolerance: number): string {
  if (frameTolerance <= 0) {
    return "Без допуска по фреймдате";
  }

  return `Допуск по фреймдате +- ${frameTolerance} ${pluralizeFrames(frameTolerance)}`;
}
