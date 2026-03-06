interface StartScreenProps {
  nicknameInput: string;
  loadingStatus: string;
  canStart: boolean;
  onNicknameChange: (value: string) => void;
  onStart: () => void;
}

export function StartScreen(props: StartScreenProps): JSX.Element {
  const { nicknameInput, loadingStatus, canStart, onNicknameChange, onStart } =
    props;

  return (
    <section className="screen start-screen">
      <div className="panel intro-panel reveal">
        <p className="eyebrow">Tekken Move Trainer</p>
        <h1>Видео-квиз по фреймдате и инпутам</h1>
        <p className="description">
          Смотри удар, отвечай на <strong>фреймдату на блоке</strong> (+1 балл)
          или на <strong>инпут удара</strong> (+0.2 балла). Ошибся один раз -
          игра окончена.
        </p>

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
          <button
            className="cta-button"
            type="button"
            disabled={!canStart}
            onClick={onStart}
          >
            Начать игру
          </button>
        </div>

        <p className="loading-status">{loadingStatus}</p>
      </div>
    </section>
  );
}
