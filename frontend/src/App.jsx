import { useEffect, useState } from "react";

const statusClass = (status) => {
  if (status === "Scaling") return "status status--scaling";
  if (status === "Delayed Test") return "status status--delayed";
  if (status === "Dead") return "status status--dead";
  return "status status--alive";
};

const formatHours = (dateString) => {
  const hours = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60));
  return `${hours}h`; 
};

const formatPercent = (value) => `${Math.round(value * 100)}%`;

export default function App() {
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [authMissing, setAuthMissing] = useState([]);

  useEffect(() => {
    fetch("http://localhost:4000/api/videos")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load videos.");
        }
        return data;
      })
      .then((data) => {
        setError("");
        setAuthMissing([]);
        setVideos(data.videos ?? []);
        if (data.videos?.length) {
          setSelected(data.videos[0]);
        }
      })
      .catch((err) => {
        setError(err.message);
        setAuthMissing([]);
        setVideos([]);
      });
  }, []);

  const handleConnect = async () => {
    try {
      const response = await fetch("http://localhost:4000/api/auth/url");
      const data = await response.json();
      if (!response.ok) {
        setAuthMissing(data.missing ?? []);
        throw new Error(data.error ?? "Failed to start OAuth.");
      }
      setAuthMissing([]);
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Shorts Growth Radar</p>
          <h1>Checklist-driven insights for every Short</h1>
          <p className="subhead">
            Track 0–72 hour performance using rule-based checkpoints and measurable trends.
          </p>
        </div>
        <button className="button" onClick={handleConnect}>
          Connect YouTube
        </button>
      </header>

      <main className="main">
        <section className="panel">
          <h2>All Videos</h2>
          <div className="video-list">
            {videos.map((video) => (
              <button
                key={video.id}
                className={`video-card ${selected?.id === video.id ? "video-card--active" : ""}`}
                onClick={() => setSelected(video)}
              >
                <img src={video.thumbnail_url} alt={video.title} />
                <div>
                  <h3>{video.title}</h3>
                  <p className="meta">{formatHours(video.published_at)} • Shorts</p>
                  <div className={statusClass(video.checklist?.status)}>
                    {video.checklist?.status ?? "Alive"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel detail">
          {error ? (
            <div className="empty">
              <p>{error}</p>
              {authMissing.length ? (
                <p>Missing: {authMissing.join(", ")}.</p>
              ) : null}
            </div>
          ) : null}
          {selected ? (
            <>
              <div className="detail-header">
                <div>
                  <h2>{selected.title}</h2>
                  <p className="meta">
                    Published {formatHours(selected.published_at)} ago • {selected.snapshot_count} snapshots
                  </p>
                </div>
                <div className={statusClass(selected.checklist?.status)}>
                  {selected.checklist?.status ?? "Alive"}
                </div>
              </div>

              <div className="detail-grid">
                <div className="card">
                  <h4>Shorts feed trend</h4>
                  <p>
                    {selected.checklist?.windows?.[0]?.status ?? "WARN"}: {selected.checklist?.windows?.[0]?.explanation}
                  </p>
                </div>
                <div className="card">
                  <h4>Engagement health</h4>
                  <p>
                    {selected.checklist?.windows?.[2]?.status ?? "WARN"}: {selected.checklist?.windows?.[2]?.explanation}
                  </p>
                </div>
                <div className="card">
                  <h4>Delayed push check</h4>
                  <p>
                    {selected.checklist?.windows?.[3]?.status ?? "WARN"}: {selected.checklist?.windows?.[3]?.explanation}
                  </p>
                </div>
              </div>

              <div className="timeline">
                <h4>0–72h Checklist</h4>
                <div className="timeline-grid">
                  {(selected.checklist?.windows ?? []).map((window) => (
                    <div key={window.window} className="timeline-card">
                      <div className={`pill pill--${window.status.toLowerCase()}`}>{window.status}</div>
                      <h5>{window.window} hours</h5>
                      <p>{window.explanation}</p>
                      <p className="action">Action: {window.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="empty">No videos loaded yet.</div>
          )}
        </section>
      </main>
    </div>
  );
}
