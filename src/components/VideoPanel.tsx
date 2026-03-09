import type { ReactNode } from "react";

interface VideoPanelProps {
  characterName: string;
  videoUrl: string;
  videoError: boolean;
  videoCdnHosts: string[];
  onVideoLoaded: () => void;
  onVideoError: () => void;
  children: ReactNode;
}

export function VideoPanel(props: VideoPanelProps): JSX.Element {
  const {
    characterName,
    videoUrl,
    videoError,
    videoCdnHosts,
    onVideoLoaded,
    onVideoError,
    children,
  } = props;

  const domainsText =
    videoCdnHosts.length > 0
      ? videoCdnHosts.join(", ")
      : "домены CDN в базе не определены";

  return (
    <article className="panel video-panel reveal delay-1">
      <div className="video-head">
        <p className="eyebrow">Текущий удар</p>
        <h2>{characterName}</h2>
      </div>

      <div className="video-frame">
        <video
          key={videoUrl}
          className="move-video"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          src={videoUrl}
          onLoadedData={onVideoLoaded}
          onError={onVideoError}
        />
        {videoError ? (
          <div className="video-fallback" role="status" aria-live="polite">
            <p className="video-fallback-title">Видео не загрузилось.</p>
            <p className="video-fallback-copy">
              Проверь доступность CDN-доменов и при необходимости добавь их в
              zapret:
            </p>
            <p className="video-fallback-domains">{domainsText}</p>
          </div>
        ) : null}
      </div>

      {children}
    </article>
  );
}
