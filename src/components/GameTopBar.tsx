import { GAME_DIFFICULTY_RULES } from "../difficulty";
import type { GameDifficulty, GameMode, ScoreGainToken } from "../types";
import { formatScore } from "../utils";

interface GameTopBarProps {
  gameMode: GameMode;
  gameDifficulty: GameDifficulty;
  nickname: string;
  currentRound: number;
  totalRounds: number;
  score: number;
  classicMistakes: number;
  classicMistakesLimit: number;
  sandboxCurrentStreak: number;
  sandboxBestStreak: number;
  scoreGains: ScoreGainToken[];
  onScoreGainDone: (id: string) => void;
}

export function GameTopBar(props: GameTopBarProps): JSX.Element {
  const {
    gameMode,
    gameDifficulty,
    nickname,
    currentRound,
    totalRounds,
    score,
    classicMistakes,
    classicMistakesLimit,
    sandboxCurrentStreak,
    sandboxBestStreak,
    scoreGains,
    onScoreGainDone,
  } = props;

  const difficultyLabel = GAME_DIFFICULTY_RULES[gameDifficulty].label;

  return (
    <header
      className={`top-bar reveal${gameMode === "sandbox" ? " top-bar-sandbox" : ""}`}
    >
      <div className="player-box">
        Игрок:
        <strong>{nickname || "Игрок"}</strong>
      </div>

      <div className="score-box">
        Раунд:
        <strong>
          {currentRound}/{totalRounds}
        </strong>
      </div>

      {gameMode === "sandbox" ? (
        <>
          <div className="score-box">
            Текущий стрик:
            <strong>{sandboxCurrentStreak}</strong>
          </div>
          <div className="score-box">
            Лучший стрик:
            <strong>{sandboxBestStreak}</strong>
          </div>
        </>
      ) : (
        <>
          <div
            className={`score-box difficulty-box difficulty-${gameDifficulty}`}
          >
            Сложность:
            <strong>{difficultyLabel}</strong>
          </div>
          <div className="score-box points-box">
            Очки:
            <strong>{formatScore(score)}</strong>
            <span className="classic-mistake-hint">
              Ошибки: {classicMistakes}/{classicMistakesLimit}
            </span>
            <div className="score-gain-layer" aria-hidden="true">
              {scoreGains.map((token) => (
                <span
                  key={token.id}
                  className="score-gain"
                  onAnimationEnd={() => onScoreGainDone(token.id)}
                >
                  {token.text}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
