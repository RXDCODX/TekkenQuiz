import { useState } from "react";
import type {
  FrameBand,
  GameMode,
  SandboxHitLevelFilter,
  SandboxMoveFilters,
  SandboxMovePropertyFilter,
  SandboxSortBy,
  SandboxStateFilter,
  SandboxThrowFilterMode,
  StartupFilterBand,
} from "../types";
import { capitalizeWord } from "../utils";

const SORT_OPTIONS: Array<{ value: SandboxSortBy; label: string }> = [
  { value: "random", label: "Случайно" },
  { value: "command-asc", label: "Инпут (A-Z)" },
  { value: "command-desc", label: "Инпут (Z-A)" },
  { value: "startup-asc", label: "Startup (быстрые -> медленные)" },
  { value: "startup-desc", label: "Startup (медленные -> быстрые)" },
  { value: "block-asc", label: "On block (- -> +)" },
  { value: "block-desc", label: "On block (+ -> -)" },
  { value: "hit-asc", label: "On hit (- -> +)" },
  { value: "hit-desc", label: "On hit (+ -> -)" },
  { value: "hitLevel-asc", label: "Hit level (A-Z)" },
  { value: "hitLevel-desc", label: "Hit level (Z-A)" },
  { value: "damage-asc", label: "Damage (меньше -> больше)" },
  { value: "damage-desc", label: "Damage (больше -> меньше)" },
];

const FRAME_BAND_OPTIONS: Array<{ value: FrameBand; label: string }> = [
  { value: "plus", label: "Plus" },
  { value: "neutral", label: "Neutral" },
  { value: "safe", label: "Safe" },
  { value: "unsafe", label: "Unsafe" },
];

const STARTUP_OPTIONS: Array<{ value: StartupFilterBand; label: string }> = [
  { value: "under10", label: "Under 10" },
  { value: "10", label: "10" },
  { value: "11", label: "11" },
  { value: "12", label: "12" },
  { value: "13", label: "13" },
  { value: "14", label: "14" },
  { value: "15", label: "15" },
  { value: "16", label: "16" },
  { value: "17", label: "17" },
  { value: "18", label: "18" },
  { value: "19", label: "19" },
  { value: "20", label: "20" },
  { value: "over20", label: "Over 20" },
];

const HIT_LEVEL_OPTIONS: Array<{
  value: SandboxHitLevelFilter;
  label: string;
}> = [
  { value: "high", label: "High" },
  { value: "mid", label: "Mid" },
  { value: "low", label: "Low" },
  { value: "specialLow", label: "Special Low" },
  { value: "specialMid", label: "Special Mid" },
  { value: "throw", label: "Throw" },
];

const PROPERTY_OPTIONS: Array<{
  value: SandboxMovePropertyFilter;
  label: string;
}> = [
  { value: "throw", label: "Throw" },
  { value: "counterHit", label: "Counter Hit" },
  { value: "chip", label: "Chip" },
  { value: "jails", label: "Jails" },
  { value: "parry", label: "Parry" },
  { value: "powerCrush", label: "Power Crush" },
  { value: "homing", label: "Homing" },
  { value: "heatEngager", label: "Heat Engager" },
  { value: "tornado", label: "Tornado" },
  { value: "wallInteraction", label: "Wall Interaction" },
  { value: "floorInteraction", label: "Floor Interaction" },
];

const STATE_OPTIONS: Array<{ value: SandboxStateFilter; label: string }> = [
  { value: "whileStanding", label: "While standing" },
  { value: "sidestep", label: "Sidestep" },
  { value: "fullCrouch", label: "Full crouch" },
  { value: "heat", label: "Heat" },
  { value: "rage", label: "Rage" },
];

const THROW_MODE_OPTIONS: Array<{
  value: SandboxThrowFilterMode;
  label: string;
}> = [
  { value: "all", label: "Все" },
  { value: "only", label: "Только грабы" },
  { value: "exclude", label: "Без грабов" },
];

function toggleSelection<T extends string>(values: T[], value: T): T[] {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  return [...values, value];
}

function resetSandboxFilters(): SandboxMoveFilters {
  return {
    sortBy: "random",
    onBlockBands: [],
    onHitBands: [],
    startup: [],
    hitLevels: [],
    properties: [],
    states: [],
    throwMode: "all",
  };
}

interface StartScreenProps {
  nicknameInput: string;
  loadingStatus: string;
  canStart: boolean;
  mode: GameMode;
  characterOptions: string[];
  sandboxCharacter: string;
  sandboxFilters: SandboxMoveFilters;
  sandboxFilteredCount: number;
  sandboxTotalCount: number;
  onNicknameChange: (value: string) => void;
  onModeChange: (value: GameMode) => void;
  onSandboxCharacterChange: (value: string) => void;
  onSandboxFiltersChange: (value: SandboxMoveFilters) => void;
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
    sandboxFilters,
    sandboxFilteredCount,
    sandboxTotalCount,
    onNicknameChange,
    onModeChange,
    onSandboxCharacterChange,
    onSandboxFiltersChange,
    onStart,
  } = props;

  const [filtersVisible, setFiltersVisible] = useState(false);

  const isSandboxMode = mode === "sandbox";
  const hasSandboxMoves = sandboxFilteredCount > 0;
  const canStartSession =
    canStart &&
    (!isSandboxMode || (Boolean(sandboxCharacter) && hasSandboxMoves));

  const activeFilterCount =
    sandboxFilters.onBlockBands.length +
    sandboxFilters.onHitBands.length +
    sandboxFilters.startup.length +
    sandboxFilters.hitLevels.length +
    sandboxFilters.properties.length +
    sandboxFilters.states.length +
    (sandboxFilters.throwMode === "all" ? 0 : 1) +
    (sandboxFilters.sortBy === "random" ? 0 : 1);

  function patchSandboxFilters(patch: Partial<SandboxMoveFilters>): void {
    onSandboxFiltersChange({
      ...sandboxFilters,
      ...patch,
    });
  }

  return (
    <section className="screen start-screen">
      <div className="start-panels">
        <div className="panel intro-panel reveal start-main-panel">
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

                <div className="sandbox-filter-toggle-row">
                  <button
                    className={`mode-chip sandbox-filter-toggle${filtersVisible ? " active" : ""}`}
                    type="button"
                    onClick={() => setFiltersVisible((visible) => !visible)}
                    aria-expanded={filtersVisible}
                    aria-controls="sandboxFiltersPanel"
                  >
                    {filtersVisible
                      ? "Скрыть фильтры мувов"
                      : "Открыть фильтры мувов"}
                    {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                  </button>
                  <p className="sandbox-filter-toggle-summary">
                    Подходящих ударов: <strong>{sandboxFilteredCount}</strong>{" "}
                    из {sandboxTotalCount}
                  </p>
                </div>
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

        {isSandboxMode ? (
          <aside
            id="sandboxFiltersPanel"
            className={`panel sandbox-side-panel${filtersVisible ? " open" : ""}`}
            aria-label="Фильтры мувов для песочницы"
            aria-hidden={!filtersVisible}
          >
            <div className="sandbox-filters-head sandbox-side-head">
              <div>
                <p className="sandbox-filters-title">Фильтры мувов</p>
                <p className="sandbox-filters-summary">
                  Подходящих ударов: <strong>{sandboxFilteredCount}</strong> из{" "}
                  {sandboxTotalCount}
                </p>
              </div>
              <button
                className="sandbox-side-close"
                type="button"
                onClick={() => setFiltersVisible(false)}
                aria-label="Скрыть фильтры"
              >
                x
              </button>
            </div>

            <div className="sandbox-filter-grid">
              <div className="sandbox-filter-section sandbox-filter-section-sort">
                <div className="sandbox-filter-heading">Sort By</div>
                <select
                  className="select-input"
                  value={sandboxFilters.sortBy}
                  onChange={(event) =>
                    patchSandboxFilters({
                      sortBy: event.target.value as SandboxSortBy,
                    })
                  }
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sandbox-filter-section">
                <div className="sandbox-filter-heading">Grab Filter</div>
                <div className="sandbox-filter-chip-row">
                  {THROW_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`sandbox-filter-chip${sandboxFilters.throwMode === option.value ? " active" : ""}`}
                      onClick={() =>
                        patchSandboxFilters({ throwMode: option.value })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sandbox-filter-section">
                <div className="sandbox-filter-heading">On Block Frames</div>
                <div className="sandbox-filter-chip-row">
                  {FRAME_BAND_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`sandbox-filter-chip${sandboxFilters.onBlockBands.includes(option.value) ? " active" : ""}`}
                      onClick={() =>
                        patchSandboxFilters({
                          onBlockBands: toggleSelection(
                            sandboxFilters.onBlockBands,
                            option.value,
                          ),
                        })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sandbox-filter-section">
                <div className="sandbox-filter-heading">On Hit Frames</div>
                <div className="sandbox-filter-chip-row">
                  {FRAME_BAND_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`sandbox-filter-chip${sandboxFilters.onHitBands.includes(option.value) ? " active" : ""}`}
                      onClick={() =>
                        patchSandboxFilters({
                          onHitBands: toggleSelection(
                            sandboxFilters.onHitBands,
                            option.value,
                          ),
                        })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sandbox-filter-section">
                <div className="sandbox-filter-heading">Frame Startup</div>
                <div className="sandbox-filter-chip-row">
                  {STARTUP_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`sandbox-filter-chip${sandboxFilters.startup.includes(option.value) ? " active" : ""}`}
                      onClick={() =>
                        patchSandboxFilters({
                          startup: toggleSelection(
                            sandboxFilters.startup,
                            option.value,
                          ),
                        })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sandbox-filter-section">
                <div className="sandbox-filter-heading">Hit Level</div>
                <div className="sandbox-filter-chip-row">
                  {HIT_LEVEL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`sandbox-filter-chip${sandboxFilters.hitLevels.includes(option.value) ? " active" : ""}`}
                      onClick={() =>
                        patchSandboxFilters({
                          hitLevels: toggleSelection(
                            sandboxFilters.hitLevels,
                            option.value,
                          ),
                        })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sandbox-filter-section">
                <div className="sandbox-filter-heading">Move Properties</div>
                <div className="sandbox-filter-chip-row">
                  {PROPERTY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`sandbox-filter-chip${sandboxFilters.properties.includes(option.value) ? " active" : ""}`}
                      onClick={() =>
                        patchSandboxFilters({
                          properties: toggleSelection(
                            sandboxFilters.properties,
                            option.value,
                          ),
                        })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sandbox-filter-section">
                <div className="sandbox-filter-heading">States</div>
                <div className="sandbox-filter-chip-row">
                  {STATE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`sandbox-filter-chip${sandboxFilters.states.includes(option.value) ? " active" : ""}`}
                      onClick={() =>
                        patchSandboxFilters({
                          states: toggleSelection(
                            sandboxFilters.states,
                            option.value,
                          ),
                        })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sandbox-filter-actions">
                <button
                  className="sandbox-filter-clear"
                  type="button"
                  onClick={() => onSandboxFiltersChange(resetSandboxFilters())}
                >
                  Clear all filters
                </button>
              </div>
            </div>

            {sandboxFilteredCount === 0 ? (
              <p className="sandbox-empty-warning">
                По текущим фильтрам нет ударов. Сними часть фильтров или выбери
                другого персонажа.
              </p>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
