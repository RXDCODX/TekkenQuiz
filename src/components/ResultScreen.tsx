import type { RefObject } from "react";
import { GAME_DIFFICULTY_RULES } from "../difficulty";
import type {
  AnswerMode,
  GameDifficulty,
  GameMode,
  MoveRecord,
} from "../types";
import { capitalizeWord, formatScore } from "../utils";

interface ResultScreenProps {
  gameMode: GameMode;
  gameDifficulty: GameDifficulty;
  nickname: string;
  correctAnswered: number;
  totalAnswered: number;
  score: number;
  failedMove: MoveRecord | null;
  failedAnswerMode: AnswerMode | null;
  failedTypedValue: string;
  onScreenshot: () => void;
  onRestart: () => void;
  resultDate: string;
  resultCardRef: RefObject<HTMLDivElement>;
}

export function ResultScreen(props: ResultScreenProps): JSX.Element {
  const {
    gameMode,
    gameDifficulty,
    nickname,
    correctAnswered,
    totalAnswered,
    score,
    failedMove,
    failedAnswerMode,
    failedTypedValue,
    onScreenshot,
    onRestart,
    resultDate,
    resultCardRef,
  } = props;

  const isSandboxMode = gameMode === "sandbox";
  const difficultyLabel = GAME_DIFFICULTY_RULES[gameDifficulty].label;

  return (
    <section className="screen">
      <div ref={resultCardRef} className="panel result-panel reveal">
        <p className="eyebrow">
          {isSandboxMode ? "Sandbox Complete" : "Game Over"}
        </p>
        <h2>
          Результат игрока <span>{nickname || "Игрок"}</span>
        </h2>

        <div className="result-stats">
          <div className="result-item">
            <span>Угадано</span>
            <strong>
              {correctAnswered}/{totalAnswered}
            </strong>
          </div>
          {!isSandboxMode ? (
            <div className="result-item">
              <span>Очки</span>
              <strong>{formatScore(score)}</strong>
            </div>
          ) : null}
          {!isSandboxMode ? (
            <div className="result-item">
              <span>Сложность</span>
              <strong
                className={`difficulty-pill difficulty-${gameDifficulty}`}
              >
                {difficultyLabel}
              </strong>
            </div>
          ) : null}
          <div className="result-item">
            <span>Дата</span>
            <strong>{resultDate}</strong>
          </div>
        </div>

        {failedMove && !isSandboxMode ? (
          <section className="result-loss-review">
            <h3>Разбор удара с ошибкой</h3>
            <p className="result-loss-text">
              Ниже показано видео и ответы для быстрого разбора.
            </p>

            <div className="result-loss-layout">
              <div className="result-loss-video video-frame">
                <video
                  className="move-video"
                  src={failedMove.videoUrl}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                >
                  Твой браузер не поддерживает видео.
                </video>
              </div>

              <div className="result-loss-details">
                <div className="result-loss-detail-card">
                  <span>Персонаж</span>
                  <strong>{capitalizeWord(failedMove.character)}</strong>
                </div>
                <div className="result-loss-detail-card">
                  <span>Поле ответа</span>
                  <strong>
                    {failedAnswerMode === "block"
                      ? "Фреймдата на блоке"
                      : "Инпут удара"}
                  </strong>
                </div>
                <div className="result-loss-detail-card">
                  <span>Твой ответ</span>
                  <code>{failedTypedValue || "-"}</code>
                </div>
                <div className="result-loss-detail-card">
                  <span>Правильная фреймдата на блоке</span>
                  <code>{failedMove.onBlockAnswer}</code>
                </div>
                <div className="result-loss-detail-card">
                  <span>Правильный инпут удара</span>
                  <code>{failedMove.command}</code>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <div className="result-actions">
        <button className="cta-button" type="button" onClick={onScreenshot}>
          Сделать скрин результата
        </button>
        <button className="answer-button" type="button" onClick={onRestart}>
          Играть снова
        </button>
      </div>
    </section>
  );
}
