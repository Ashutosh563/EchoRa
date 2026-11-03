import type { StatusResponse } from "../types/api";

interface StatusBarProps {
  status: StatusResponse | null;
}

export function StatusBar({ status }: StatusBarProps) {
  if (!status) return null;

  const isLive = status.mode === "live";

  return (
    <div className={`status-bar ${isLive ? "status-bar--live" : "status-bar--mock"}`}>
      <div className="status-bar__info">
        <span className="status-indicator" />
        <span className="status-mode">
          Mode: <strong>{isLive ? "Live Mode" : "Mock Mode"}</strong>
        </span>
        {!isLive && status.missing.length > 0 && (
          <span className="status-missing">({status.missing.join(" ")})</span>
        )}
      </div>

      {!status.spotify.authorized && (
        <a href="/api/spotify/auth" className="spotify-auth-btn">
          Connect Spotify
        </a>
      )}
    </div>
  );
}

