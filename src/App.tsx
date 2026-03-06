import html2canvas from "html2canvas";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnswerPanel } from "./components/AnswerPanel";
import { AppFooter } from "./components/AppFooter";
import { GameTopBar } from "./components/GameTopBar";
import { ResultScreen } from "./components/ResultScreen";
import { StartScreen } from "./components/StartScreen";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { VideoPanel } from "./components/VideoPanel";
import type {
  AnswerMode,
  GameMode,
  MovePayloadObject,
  MovePayloadRecord,
  MoveRecord,
  ScoreGainToken,
  ScreenMode,
} from "./types";
import {
  capitalizeWord,
  cleanText,
  compareCommandAnswer,
  compareFrameAnswer,
  mapMoveRecord,
  playErrorSound,
  playSuccessSound,
  safeFileToken,
  shuffleArray,
} from "./utils";

const DATA_PATH = `${import.meta.env.BASE_URL}data/moves.json`;
const SUCCESS_FLASH_CLASS = "success-flash";
const NEXT_ROUND_DELAY_MS = 900;
const SANDBOX_WRONG_DELAY_MS = 3500;
const NA_FRAME_HELP_DELAY_MS = 1700;
const SCREENSHOT_BG_COLOR = "#0f1d2a";
const APP_COMMIT_SHA =
  cleanText(import.meta.env.VITE_COMMIT_SHA, "dev").trim() || "dev";
const IS_DEV_MODE = import.meta.env.DEV;

export function App(): JSX.Element {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const stored = localStorage.getItem("tekken-theme");
      return stored === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  const [screen, setScreen] = useState<ScreenMode>("start");
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [currentMove, setCurrentMove] = useState<MoveRecord | null>(null);

  const [nicknameInput, setNicknameInput] = useState("");
  const [nickname, setNickname] = useState("Игрок");

  const [loadingStatus, setLoadingStatus] = useState("Загружаю базу ударов...");
  const [canStart, setCanStart] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [sandboxCharacter, setSandboxCharacter] = useState("");

  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correctAnswered, setCorrectAnswered] = useState(0);
  const [score, setScore] = useState(0);

  const [blockInput, setBlockInput] = useState("");
  const [commandInput, setCommandInput] = useState("");

  const [videoError, setVideoError] = useState(false);
  const [scoreGains, setScoreGains] = useState<ScoreGainToken[]>([]);
  const [correctFlashMode, setCorrectFlashMode] = useState<AnswerMode | null>(
    null,
  );
  const [sandboxFeedback, setSandboxFeedback] = useState<{
    typedValue: string;
    correctValue: string;
  } | null>(null);
  const [naFrameFeedback, setNaFrameFeedback] = useState<{
    correctValue: string;
  } | null>(null);
  const [devAnswerVisible, setDevAnswerVisible] = useState(false);

  const [resultDate, setResultDate] = useState("-");
  const [failedMove, setFailedMove] = useState<MoveRecord | null>(null);
  const [failedAnswerMode, setFailedAnswerMode] = useState<AnswerMode | null>(
    null,
  );
  const [failedTypedValue, setFailedTypedValue] = useState("");

  const playPoolRef = useRef<MoveRecord[]>([]);
  const lastCharacterRef = useRef("");
  const roundLockedRef = useRef(false);
  const roundTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);

  const characterOptions = useMemo(() => {
    const characters = new Set<string>();

    for (const move of moves) {
      characters.add(move.character);
    }

    return [...characters].sort((left, right) => left.localeCompare(right));
  }, [moves]);

  const isSandboxMode = gameMode === "sandbox";

  useEffect(() => {
    void loadDatabase();

    return () => {
      clearTimers();
    };
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;

    try {
      localStorage.setItem("tekken-theme", theme);
    } catch {
      // Ignore storage errors in private mode.
    }
  }, [theme]);

  useEffect(() => {
    setSandboxCharacter((currentValue) => {
      if (characterOptions.length === 0) {
        return "";
      }

      if (currentValue && characterOptions.includes(currentValue)) {
        return currentValue;
      }

      return characterOptions[0];
    });
  }, [characterOptions]);

  async function loadDatabase(): Promise<void> {
    setLoadingStatus("Загружаю базу ударов...");

    try {
      const response = await fetch(DATA_PATH, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as
        | MovePayloadObject
        | MovePayloadRecord[];
      const rawMoves = Array.isArray(payload) ? payload : payload.moves;

      if (!Array.isArray(rawMoves) || rawMoves.length === 0) {
        throw new Error("JSON не содержит moves[]");
      }

      const parsedMoves = rawMoves
        .map((record) => mapMoveRecord(record))
        .filter((record): record is MoveRecord => record !== null);

      if (parsedMoves.length === 0) {
        throw new Error("После фильтрации не осталось ударов с видео");
      }

      setMoves(parsedMoves);
      setLoadingStatus(`База готова: ${parsedMoves.length} ударов.`);
      setCanStart(true);
    } catch (error) {
      setLoadingStatus(
        "Не удалось загрузить /data/moves.json. Сначала запусти: npm run build:db",
      );
      setCanStart(false);
      console.error(error);
    }
  }

  function clearTimers(): void {
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }

    if (roundTimerRef.current !== null) {
      window.clearTimeout(roundTimerRef.current);
      roundTimerRef.current = null;
    }

    document.body.classList.remove(SUCCESS_FLASH_CLASS);
  }

  function flashSuccessEdges(): void {
    document.body.classList.remove(SUCCESS_FLASH_CLASS);
    void document.body.offsetWidth;
    document.body.classList.add(SUCCESS_FLASH_CLASS);

    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }

    flashTimerRef.current = window.setTimeout(() => {
      document.body.classList.remove(SUCCESS_FLASH_CLASS);
      flashTimerRef.current = null;
    }, 700);
  }

  function pullNextMove(): MoveRecord | null {
    const pool = playPoolRef.current;
    if (pool.length === 0) {
      return null;
    }

    let index = pool.findIndex(
      (move) => move.character !== lastCharacterRef.current,
    );

    if (index < 0) {
      index = 0;
    }

    const [picked] = pool.splice(index, 1);
    return picked ?? null;
  }

  function nextRound(): void {
    if (roundTimerRef.current !== null) {
      window.clearTimeout(roundTimerRef.current);
      roundTimerRef.current = null;
    }

    setBlockInput("");
    setCommandInput("");
    setCorrectFlashMode(null);
    setSandboxFeedback(null);
    setNaFrameFeedback(null);

    const nextMove = pullNextMove();
    if (!nextMove) {
      finishByCompletion();
      return;
    }

    lastCharacterRef.current = nextMove.character;
    roundLockedRef.current = false;

    setCurrentMove(nextMove);
    setCurrentRound((value) => value + 1);
    setVideoError(false);
  }

  function handleModeChange(nextMode: GameMode): void {
    setGameMode(nextMode);

    if (nextMode === "sandbox" && !sandboxCharacter && characterOptions[0]) {
      setSandboxCharacter(characterOptions[0]);
    }
  }

  function startGame(): void {
    if (moves.length === 0) {
      setLoadingStatus("База не загружена. Проверь /data/moves.json.");
      return;
    }

    const availableMoves = isSandboxMode
      ? moves.filter((move) => move.character === sandboxCharacter)
      : moves;

    if (availableMoves.length === 0) {
      setLoadingStatus(
        "Для песочницы не нашлось ударов. Выбери другого персонажа.",
      );
      return;
    }

    clearTimers();

    setNickname(cleanText(nicknameInput, "Игрок"));
    setCurrentMove(null);
    setCurrentRound(0);
    setTotalRounds(availableMoves.length);
    setTotalAnswered(0);
    setCorrectAnswered(0);
    setScore(0);
    setScoreGains([]);
    setCorrectFlashMode(null);
    setSandboxFeedback(null);
    setNaFrameFeedback(null);
    setDevAnswerVisible(false);
    setResultDate("-");
    setFailedMove(null);
    setFailedAnswerMode(null);
    setFailedTypedValue("");

    playPoolRef.current = shuffleArray([...availableMoves]);
    lastCharacterRef.current = "";
    roundLockedRef.current = false;

    setScreen("game");
    nextRound();
  }

  function finishByCompletion(): void {
    clearTimers();
    roundLockedRef.current = true;
    setSandboxFeedback(null);
    setNaFrameFeedback(null);
    setFailedMove(null);
    setFailedAnswerMode(null);
    setFailedTypedValue("");
    setResultDate(new Date().toLocaleString("ru-RU"));
    setScreen("result");
  }

  function finishWithWrongAnswer(
    answerType: AnswerMode,
    typedValue: string,
  ): void {
    clearTimers();
    roundLockedRef.current = true;
    playErrorSound();
    setFailedMove(currentMove);
    setFailedAnswerMode(answerType);
    setFailedTypedValue(typedValue);

    const correctAnswer =
      answerType === "block"
        ? (currentMove?.onBlockAnswer ?? "N/A")
        : (currentMove?.command ?? "N/A");
    const answerLabel =
      answerType === "block" ? "Фреймдата на блоке" : "Инпут удара";

    setResultDate(new Date().toLocaleString("ru-RU"));
    setScreen("result");

    console.info("Wrong answer", {
      mode: answerType,
      typed: typedValue,
      expected: correctAnswer,
      move: currentMove,
    });
  }

  function pushScoreGain(value: number): void {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    setScoreGains((tokens) => [
      ...tokens,
      { id, text: value === 1 ? "+1" : "+0.2" },
    ]);
  }

  function evaluateAnswer(answerType: AnswerMode): void {
    if (!currentMove || roundLockedRef.current) {
      return;
    }

    if (isSandboxMode && answerType === "command") {
      return;
    }

    const typedValue = cleanText(
      answerType === "block" ? blockInput : commandInput,
      "",
    );

    if (!typedValue) {
      return;
    }

    roundLockedRef.current = true;
    setTotalAnswered((value) => value + 1);

    const answerIsCorrect =
      answerType === "block"
        ? compareFrameAnswer(typedValue, currentMove.onBlockAnswer)
        : compareCommandAnswer(
            typedValue,
            currentMove.commandStrict,
            currentMove.commandLoose,
          );

    if (answerIsCorrect) {
      const gained = answerType === "block" ? 1 : 0.2;

      playSuccessSound();
      setCorrectAnswered((value) => value + 1);
      setCorrectFlashMode(answerType);

      if (!isSandboxMode) {
        setScore((value) => value + gained);
        pushScoreGain(gained);
      }

      flashSuccessEdges();

      roundTimerRef.current = window.setTimeout(() => {
        nextRound();
      }, NEXT_ROUND_DELAY_MS);

      return;
    }

    if (answerType === "block" && currentMove.onBlockAnswer === "N/A") {
      playErrorSound();
      setNaFrameFeedback({ correctValue: currentMove.onBlockAnswer });

      roundTimerRef.current = window.setTimeout(() => {
        nextRound();
      }, NA_FRAME_HELP_DELAY_MS);

      return;
    }

    if (isSandboxMode) {
      playErrorSound();

      setSandboxFeedback({
        typedValue,
        correctValue: currentMove.onBlockAnswer,
      });

      roundTimerRef.current = window.setTimeout(() => {
        nextRound();
      }, SANDBOX_WRONG_DELAY_MS);

      return;
    }

    finishWithWrongAnswer(answerType, typedValue);
  }

  function handleVideoError(): void {
    setVideoError(true);

    if (roundLockedRef.current) {
      return;
    }

    roundLockedRef.current = true;

    roundTimerRef.current = window.setTimeout(() => {
      roundLockedRef.current = false;
      nextRound();
    }, 800);
  }

  function handleVideoLoaded(): void {
    setVideoError(false);
  }

  function isScreenshotCanvasLikelyBlank(canvas: HTMLCanvasElement): boolean {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return false;
    }

    const { width, height } = canvas;
    if (width === 0 || height === 0) {
      return true;
    }

    const data = context.getImageData(0, 0, width, height).data;
    const sampleStep = 18;
    let nonBackgroundPixels = 0;

    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];

        if (alpha < 8) {
          continue;
        }

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        const diffFromBackground =
          Math.abs(red - 15) + Math.abs(green - 29) + Math.abs(blue - 42);

        if (diffFromBackground > 28) {
          nonBackgroundPixels += 1;
          if (nonBackgroundPixels > 10) {
            return false;
          }
        }
      }
    }

    return true;
  }

  function buildScreenshotClone(clonedDocument: Document): void {
    clonedDocument.body.classList.add("screenshot-mode");
    clonedDocument
      .querySelectorAll<HTMLElement>(".reveal")
      .forEach((element) => {
        element.style.animation = "none";
        element.style.opacity = "1";
        element.style.transform = "none";
      });
  }

  async function captureResultCard(
    target: HTMLDivElement,
  ): Promise<HTMLCanvasElement> {
    const sharedOptions = {
      scale: 2,
      useCORS: true,
      backgroundColor: SCREENSHOT_BG_COLOR,
      // Cross-origin videos taint canvas and break PNG export, so skip them.
      ignoreElements: (element: Element) => element.tagName === "VIDEO",
      onclone: buildScreenshotClone,
    };

    try {
      const primaryCanvas = await html2canvas(target, {
        ...sharedOptions,
        foreignObjectRendering: false,
      });

      if (!isScreenshotCanvasLikelyBlank(primaryCanvas)) {
        return primaryCanvas;
      }
    } catch (error) {
      console.warn(
        "Primary screenshot renderer failed, trying fallback.",
        error,
      );
    }

    return html2canvas(target, {
      ...sharedOptions,
      foreignObjectRendering: true,
    });
  }

  async function screenshotResult(): Promise<void> {
    const resultCard = resultCardRef.current;
    if (!resultCard) {
      return;
    }

    try {
      const canvas = await captureResultCard(resultCard);
      if (isScreenshotCanvasLikelyBlank(canvas)) {
        throw new Error("Captured screenshot canvas is blank");
      }

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `tekken-result-${safeFileToken(nickname)}-${Date.now()}.png`;
      link.click();
    } catch (error) {
      window.alert("Не получилось сделать скриншот результата.");
      console.error(error);
    }
  }

  function returnToStartScreen(): void {
    clearTimers();
    roundLockedRef.current = false;
    setScreen("start");
  }

  return (
    <>
      <div className="ambient-bg" aria-hidden="true"></div>
      <div className="grain-layer" aria-hidden="true"></div>

      <div className="app-shell">
        <ThemeSwitcher theme={theme} onThemeChange={setTheme} />

        {screen === "start" ? (
          <StartScreen
            nicknameInput={nicknameInput}
            loadingStatus={loadingStatus}
            canStart={canStart}
            mode={gameMode}
            characterOptions={characterOptions}
            sandboxCharacter={sandboxCharacter}
            onNicknameChange={setNicknameInput}
            onModeChange={handleModeChange}
            onSandboxCharacterChange={setSandboxCharacter}
            onStart={startGame}
          />
        ) : null}

        {screen === "game" ? (
          <section className="screen">
            <GameTopBar
              gameMode={gameMode}
              nickname={nickname}
              currentRound={currentRound}
              totalRounds={totalRounds}
              score={score}
              scoreGains={scoreGains}
              onScoreGainDone={(id) => {
                setScoreGains((tokens) =>
                  tokens.filter((token) => token.id !== id),
                );
              }}
            />

            <main className="game-grid">
              <VideoPanel
                characterName={capitalizeWord(currentMove?.character ?? "")}
                videoUrl={currentMove?.videoUrl ?? ""}
                videoError={videoError}
                onVideoLoaded={handleVideoLoaded}
                onVideoError={handleVideoError}
              >
                <AnswerPanel
                  gameMode={gameMode}
                  blockInput={blockInput}
                  commandInput={commandInput}
                  correctFlashMode={correctFlashMode}
                  sandboxFeedback={sandboxFeedback}
                  naFrameFeedback={naFrameFeedback}
                  devMode={IS_DEV_MODE}
                  devVisible={devAnswerVisible}
                  devCorrectOnBlock={currentMove?.onBlockAnswer ?? "N/A"}
                  devCorrectCommand={currentMove?.command ?? "N/A"}
                  onBlockInputChange={setBlockInput}
                  onCommandInputChange={setCommandInput}
                  onSubmitBlock={() => evaluateAnswer("block")}
                  onSubmitCommand={() => evaluateAnswer("command")}
                  onToggleDevVisible={() =>
                    setDevAnswerVisible((visible) => !visible)
                  }
                />
              </VideoPanel>
            </main>
          </section>
        ) : null}

        {screen === "result" ? (
          <ResultScreen
            gameMode={gameMode}
            nickname={nickname}
            correctAnswered={correctAnswered}
            totalAnswered={totalAnswered}
            score={score}
            resultDate={resultDate}
            failedMove={failedMove}
            failedAnswerMode={failedAnswerMode}
            failedTypedValue={failedTypedValue}
            onScreenshot={screenshotResult}
            onRestart={returnToStartScreen}
            resultCardRef={resultCardRef}
          />
        ) : null}

        <AppFooter commitSha={APP_COMMIT_SHA} />
      </div>
    </>
  );
}
