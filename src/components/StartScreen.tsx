import type { GameMode } from "../types";
import { capitalizeWord } from "../utils";

interface StartScreenProps {
  nicknameInput: string;
  loadingStatus: string;
  canStart: boolean;
  mode: GameMode;
  characterOptions: string[];
  sandboxCharacter: string;
  onNicknameChange: (value: string) => void;
  onModeChange: (value: GameMode) => void;
  onSandboxCharacterChange: (value: string) => void;
  onStart: () => void;
}

export function StartScreen(props: StartScreenProps): JSX.Element {
  const {
    nicknameInput,
    loadingStatus,
    canStart,
    mode,
    characterOptions,
    sandboxCharacter,
    onNicknameChange,
    onModeChange,
    onSandboxCharacterChange,
    onStart,
  } = props;

  const isSandboxMode = mode === "sandbox";
  const canStartSession =
    canStart && (!isSandboxMode || Boolean(sandboxCharacter));

  return (
    <section className="screen start-screen">
      <div className="panel intro-panel reveal">
        <p className="eyebrow">Tekken Move Trainer</p>
        <h1>
          {isSandboxMode
            ? "Песочница по фреймдате"
            : "Видео-квиз по фреймдате и инпутам"}
        </h1>
        <p className="description">
          {isSandboxMode ? (
            <>
              Выбери одного персонажа и отвечай только на
              <strong> фреймдату на блоке</strong>. Очки в этом режиме
              отключены.
            </>
          ) : (
            <>
              Смотри удар, отвечай на <strong>фреймдату на блоке</strong> (+1
              балл) или на <strong>инпут удара</strong> (+0.2 балла). Ошибся
              один раз - игра окончена.
            </>
          )}
        </p>

        <div className="mode-switch" role="radiogroup" aria-label="Режим">
          <button
            className={`mode-chip${mode === "classic" ? " active" : ""}`}
            type="button"
            onClick={() => onModeChange("classic")}
            aria-pressed={mode === "classic"}
          >
            Обычный режим
          </button>
          <button
            className={`mode-chip${mode === "sandbox" ? " active" : ""}`}
            type="button"
            onClick={() => onModeChange("sandbox")}
            aria-pressed={mode === "sandbox"}
          >
            Песочница
          </button>
        </div>

        <div className="start-form">
          <label htmlFor="nicknameInput">Твой ник</label>
          <input
            id="nicknameInput"
            type="text"
            maxLength={24}
            autoComplete="nickname"
            placeholder="Пример: KazuyaMain"
            value={nicknameInput}
            onChange={(event) => onNicknameChange(event.target.value)}
          />

          {isSandboxMode ? (
            <>
              <label htmlFor="sandboxCharacter">Персонаж для песочницы</label>
              <select
                id="sandboxCharacter"
                className="select-input"
                value={sandboxCharacter}
                onChange={(event) =>
                  onSandboxCharacterChange(event.target.value)
                }
              >
                {characterOptions.length === 0 ? (
                  <option value="">Нет доступных персонажей</option>
                ) : null}
                {characterOptions.map((character) => (
                  <option key={character} value={character}>
                    {capitalizeWord(character)}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <button
            className="cta-button"
            type="button"
            disabled={!canStartSession}
            onClick={onStart}
          >
            {isSandboxMode ? "Начать песочницу" : "Начать игру"}
          </button>
        </div>

        <p className="loading-status">{loadingStatus}</p>
      </div>
    </section>
  );
}
