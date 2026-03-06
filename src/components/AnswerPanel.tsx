import type { AnswerMode } from "../types";

interface AnswerPanelProps {
  blockInput: string;
  commandInput: string;
  correctFlashMode: AnswerMode | null;
  devMode: boolean;
  devVisible: boolean;
  devCorrectOnBlock: string;
  devCorrectCommand: string;
  onBlockInputChange: (value: string) => void;
  onCommandInputChange: (value: string) => void;
  onSubmitBlock: () => void;
  onSubmitCommand: () => void;
  onToggleDevVisible: () => void;
}

export function AnswerPanel(props: AnswerPanelProps): JSX.Element {
  const {
    blockInput,
    commandInput,
    correctFlashMode,
    devMode,
    devVisible,
    devCorrectOnBlock,
    devCorrectCommand,
    onBlockInputChange,
    onCommandInputChange,
    onSubmitBlock,
    onSubmitCommand,
    onToggleDevVisible,
  } = props;

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
        Можно ответить только одним способом: либо фреймдата на блоке (+1 балл),
        либо инпут удара (+0.2 балла). Для грабов фреймдата указывается на разрыве
      </p>

      <div className={blockClass}>
        <label htmlFor="blockInput">Фреймдата удара на блоке (+1)</label>
        <input
          id="blockInput"
          type="text"
          placeholder="Пример: -12 или +3"
          value={blockInput}
          onChange={(event) => onBlockInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmitBlock();
            }
          }}
        />
        <button className="answer-button" type="button" onClick={onSubmitBlock}>
          Проверить фреймдату на блоке
        </button>
      </div>

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
              <div>
                <span>Инпут удара:</span>
                <code>{devCorrectCommand}</code>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
