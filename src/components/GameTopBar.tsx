import type { GameMode, ScoreGainToken } from "../types";
import { formatScore } from "../utils";

interface GameTopBarProps {
  gameMode: GameMode;
  nickname: string;
  currentRound: number;
  totalRounds: number;
  score: number;
  sandboxCurrentStreak: number;
  sandboxBestStreak: number;
  scoreGains: ScoreGainToken[];
  onScoreGainDone: (id: string) => void;
}

export function GameTopBar(props: GameTopBarProps): JSX.Element {
  const {
    gameMode,
    nickname,
    currentRound,
    totalRounds,
    score,
    sandboxCurrentStreak,
    sandboxBestStreak,
    scoreGains,
    onScoreGainDone,
  } = props;

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
        <div className="score-box points-box">
          Очки:
          <strong>{formatScore(score)}</strong>
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
      )}
    </header>
  );
}
