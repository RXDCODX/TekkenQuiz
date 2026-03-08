import { useEffect, useRef } from "react";
import type { AnswerMode, GameMode } from "../types";

interface AnswerPanelProps {
  gameMode: GameMode;
  blockInput: string;
  blockInputError: string | null;
  commandInput: string;
  correctFlashMode: AnswerMode | null;
  sandboxFeedback: {
    typedValue: string;
    correctValue: string;
  } | null;
  naFrameFeedback: {
    correctValue: string;
  } | null;
  devMode: boolean;
  devVisible: boolean;
  devCorrectOnBlock: string;
  devCorrectCommand: string;
  onBlockInputChange: (value: string) => void;
  onCommandInputChange: (value: string) => void;
  onSubmitBlock: () => void;
  onSubmitCommand: () => void;
  onSandboxProceed: () => void;
  onToggleDevVisible: () => void;
}

export function AnswerPanel(props: AnswerPanelProps): JSX.Element {
  const {
    gameMode,
    blockInput,
    blockInputError,
    commandInput,
    correctFlashMode,
    sandboxFeedback,
    naFrameFeedback,
    devMode,
    devVisible,
    devCorrectOnBlock,
    devCorrectCommand,
    onBlockInputChange,
    onCommandInputChange,
    onSubmitBlock,
    onSubmitCommand,
    onSandboxProceed,
    onToggleDevVisible,
  } = props;

  const isSandboxMode = gameMode === "sandbox";
  const sandboxProceedButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isSandboxMode || !sandboxFeedback) {
      return;
    }

    sandboxProceedButtonRef.current?.focus();
  }, [isSandboxMode, sandboxFeedback]);

  const blockClass =
    correctFlashMode === "block"
      ? "answer-block answer-block-correct"
      : "answer-block";

  const commandClass =
    correctFlashMode === "command"
      ? "answer-block answer-block-correct"
      : "answer-block";

  return (
    <section className="answer-panel-inner reveal delay-2">
      <h3>Твой ответ</h3>
      <p className="answer-guide">
        {isSandboxMode
          ? "Песочница: отвечай только фреймдату на блоке. Для грабов фреймдата указывается на разрыве. Если ошибся, нажми «Неправильно, следующий удар»"
          : "Можно ответить только одним способом: либо фреймдата на блоке (+1 балл), либо инпут удара (+0.2 балла). Для грабов фреймдата указывается на разрыве"}
      </p>

      <div className={blockClass}>
        <label htmlFor="blockInput">Фреймдата удара на блоке (+1)</label>
        <input
          id="blockInput"
          type="text"
          inputMode="numeric"
          placeholder="Пример: -12 или +3"
          value={blockInput}
          className={blockInputError ? "input-invalid" : undefined}
          aria-invalid={Boolean(blockInputError)}
          onChange={(event) => onBlockInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmitBlock();
            }
          }}
        />
        {blockInputError ? (
          <span className="input-error-text">{blockInputError}</span>
        ) : null}
        <button className="answer-button" type="button" onClick={onSubmitBlock}>
          Проверить фреймдату на блоке
        </button>
      </div>

      {isSandboxMode && sandboxFeedback ? (
        <div className="sandbox-feedback" role="status" aria-live="polite">
          <div className="sandbox-feedback-header">
            <span className="sandbox-feedback-title">Неправильно.</span>
            <span className="sandbox-feedback-hint">
              Нажми кнопку ниже, чтобы перейти к следующему удару.
            </span>
          </div>

          <div className="sandbox-feedback-row">
            <span>Твой ответ:</span>
            <code>{sandboxFeedback.typedValue}</code>
          </div>

          <div className="sandbox-feedback-row">
            <span>Правильный ответ:</span>
            <code>{sandboxFeedback.correctValue}</code>
          </div>

          <button
            ref={sandboxProceedButtonRef}
            className="sandbox-proceed-button"
            type="button"
            onClick={onSandboxProceed}
            aria-label="Неправильно. Перейти к следующему удару"
          >
            Неправильно, следующий удар
          </button>
        </div>
      ) : null}

      {naFrameFeedback ? (
        <div className="na-frame-feedback" role="status" aria-live="polite">
          <span className="na-frame-feedback-title">Внимание</span>
          <span>Для этого удара правильный ответ по фреймдате:</span>
          <code>{naFrameFeedback.correctValue}</code>
        </div>
      ) : null}

      {!isSandboxMode ? (
        <div className={commandClass}>
          <label htmlFor="commandInput">Инпут удара (+0.2)</label>
          <input
            id="commandInput"
            type="text"
            placeholder="Пример: df+2"
            value={commandInput}
            onChange={(event) => onCommandInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmitCommand();
              }
            }}
          />
          <button
            className="answer-button"
            type="button"
            onClick={onSubmitCommand}
          >
            Проверить инпут удара
          </button>
        </div>
      ) : null}

      {devMode ? (
        <div className="dev-answer-box">
          <button
            className="dev-answer-toggle"
            type="button"
            onClick={onToggleDevVisible}
          >
            {devVisible
              ? "Скрыть правильный ответ (DEV)"
              : "Показать правильный ответ (DEV)"}
          </button>
          {devVisible ? (
            <div className="dev-answer-values">
              <div>
                <span>Фреймдата на блоке:</span>
                <code>{devCorrectOnBlock}</code>
              </div>
              {!isSandboxMode ? (
                <div>
                  <span>Инпут удара:</span>
                  <code>{devCorrectCommand}</code>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
