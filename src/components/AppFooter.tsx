interface AppFooterProps {
  version: string;
}

export function AppFooter(props: AppFooterProps): JSX.Element {
  const { version } = props;

  return (
    <footer className="app-footer">
      <span>
        Автор:{" "}
        <a
          className="footer-author-link"
          href="https://twitch.tv/RXDCODX"
          target="_blank"
          rel="noreferrer"
        >
          twitch.tv/RXDCODX
        </a>
      </span>
      <span>
        Версия: <code>{version}</code>
      </span>
      <span>
        Благодарность порталу{" "}
        <a
          className="footer-thanks-link"
          href="https://okizeme.gg"
          target="_blank"
          rel="noreferrer"
        >
          okizeme.gg
        </a>{" "}
        за видосики.
      </span>
    </footer>
  );
}
