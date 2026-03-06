interface ThemeSwitcherProps {
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
}

export function ThemeSwitcher(props: ThemeSwitcherProps): JSX.Element {
  const { theme, onThemeChange } = props;

  return (
    <div className="theme-switcher-wrap reveal">
      <div
        className="theme-switcher"
        role="group"
        aria-label="Переключение темы"
      >
        <button
          type="button"
          className={theme === "dark" ? "theme-button active" : "theme-button"}
          onClick={() => onThemeChange("dark")}
        >
          Темная
        </button>
        <button
          type="button"
          className={theme === "light" ? "theme-button active" : "theme-button"}
          onClick={() => onThemeChange("light")}
        >
          Светлая
        </button>
      </div>
    </div>
  );
}
