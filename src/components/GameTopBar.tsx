import type { ScoreGainToken } from "../types";
import { formatScore } from "../utils";

interface GameTopBarProps {
  nickname: string;
  currentRound: number;
  totalRounds: number;
  score: number;
  scoreGains: ScoreGainToken[];
  onScoreGainDone: (id: string) => void;
}

export function GameTopBar(props: GameTopBarProps): JSX.Element {
  const {
    nickname,
    currentRound,
    totalRounds,
    score,
    scoreGains,
    onScoreGainDone,
  } = props;

  return (
    <header className="top-bar reveal">
      <div className="player-box">
        Игрок:
        <strong>{nickname || "Игрок"}</strong>
      </div>

      <div className="score-box">
        Угадано:
        <strong>
          {currentRound}/{totalRounds}
        </strong>
      </div>

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
    </header>
  );
}
