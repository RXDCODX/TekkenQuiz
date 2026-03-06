import type { ReactNode } from "react";

interface VideoPanelProps {
  characterName: string;
  videoUrl: string;
  videoError: boolean;
  onVideoLoaded: () => void;
  onVideoError: () => void;
  children: ReactNode;
}

export function VideoPanel(props: VideoPanelProps): JSX.Element {
  const {
    characterName,
    videoUrl,
    videoError,
    onVideoLoaded,
    onVideoError,
    children,
  } = props;

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
          <div className="video-fallback">
            Видео недоступно, перехожу к следующему удару...
          </div>
        ) : null}
      </div>

      {children}
    </article>
  );
}
