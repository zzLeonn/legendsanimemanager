import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity, BookOpen, Check, ChevronRight, Compass, Edit3, ExternalLink,
  Film, LayoutDashboard, Library, Loader2, Plus, Search, Star, Tv, X,
  Minus, Trash2, RefreshCw
} from "lucide-react";
import {
  addAnimeFromApi, addAnimeFromCatalog, deleteAnime, getAnimeList,
  getCatalogAnime, initializeDatabase, saveAnimeMetadata, updateAnime,
  ANIME_STATUSES, type Anime, type AnimeStatus, type UserAnime
} from "./database/db";
import { searchAnime, toAnimeMetadata, type TenraiAnime } from "./api/tenrai";
import "./App.css";

type Page = "Dashboard" | "My Library" | "Discover" | "Imported Catalogue";

function imageFor(item: { image_url?: string | null; photo?: string | null }) {
  if (item.image_url) return item.image_url;
  if (!item.photo) return null;
  const name = item.photo.replace(/\\/g, "/").split("/").pop();
  return name ? `/images/${name}` : null;
}

function Poster({ item, className = "" }: {
  item: { image_url?: string | null; photo?: string | null; title: string };
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = imageFor(item);
  return (
    <div className={`lam-poster ${className}`}>
      {src && !failed ? (
        <img src={src} alt={item.title} onError={() => setFailed(true)} />
      ) : <div className="lam-poster-fallback"><Tv size={27} /></div>}
    </div>
  );
}

function App() {
  const [catalog, setCatalog] = useState<Anime[]>([]);
  const [library, setLibrary] = useState<UserAnime[]>([]);
  const [page, setPage] = useState<Page>("Dashboard");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [apiQuery, setApiQuery] = useState("");
  const [results, setResults] = useState<TenraiAnime[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<UserAnime | null>(null);
  const [editStatus, setEditStatus] = useState<AnimeStatus>("Plan to Watch");
  const [editScore, setEditScore] = useState(0);
  const [editWatched, setEditWatched] = useState(0);
  const [editTotal, setEditTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [matchingId, setMatchingId] = useState<number | null>(null);
  const [matchResults, setMatchResults] = useState<TenraiAnime[]>([]);
  const [matchError, setMatchError] = useState("");

  async function reload() {
    const [all, mine] = await Promise.all([getCatalogAnime(), getAnimeList()]);
    setCatalog(all);
    setLibrary(mine);
  }

  useEffect(() => {
    (async () => {
      try {
        await initializeDatabase();
        await reload();
      } catch (error) {
        console.error(error);
        setNotice(error instanceof Error ? error.message : "Could not load the database.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredLibrary = useMemo(() => library.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  ), [library, query]);

  const watching = library.filter((item) => item.status === "Watching").length;
  const completed = library.filter((item) => item.status === "Completed").length;
  const totalWatched = library.reduce((sum, item) => sum + item.episodes_watched, 0);
  const rated = library.filter((item) => item.score > 0);
  const average = rated.length
    ? (rated.reduce((sum, item) => sum + item.score, 0) / rated.length).toFixed(1)
    : "—";

  async function runSearch(event?: FormEvent) {
    event?.preventDefault();
    setApiLoading(true);
    setApiError("");
    setResults([]);
    try {
      setResults(await searchAnime(apiQuery));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setApiLoading(false);
    }
  }

  async function addFromSearch(anime: TenraiAnime) {
    try {
      await addAnimeFromApi(toAnimeMetadata(anime));
      await reload();
      setNotice(`${anime.title} added to your library.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not add this anime.");
    }
  }

  function openEditor(item: UserAnime) {
    setEditing(item);
    setEditStatus(item.status);
    setEditScore(item.score);
    setEditWatched(item.episodes_watched);
    setEditTotal(item.episodes_total || item.episodes || 0);
  }

  async function saveEditor() {
    if (!editing) return;
    setSaving(true);
    try {
      await updateAnime(editing.id, {
        status: editStatus,
        score: editScore,
        episodes_total: editTotal,
        episodes_watched: editWatched,
      });
      await reload();
      setEditing(null);
      setNotice("Your anime details have been saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function quickEpisode(item: UserAnime, delta: number) {
    const next = Math.max(0, item.episodes_watched + delta);
    if (item.episodes_total > 0 && next > item.episodes_total) return;
    try {
      await updateAnime(item.id, {
        status: item.status,
        score: item.score,
        episodes_total: item.episodes_total,
        episodes_watched: next,
      });
      await reload();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update progress.");
    }
  }

  async function removeAnime(item: UserAnime) {
    if (!window.confirm(`Remove "${item.title}" from your library?`)) return;
    await deleteAnime(item.id);
    await reload();
    setEditing(null);
    setNotice("Removed from your library.");
  }

  async function findMatch(item: Anime) {
    setMatchingId(item.id);
    setMatchResults([]);
    setMatchError("");
    try {
      setMatchResults(await searchAnime(item.title));
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : "Could not search for a match.");
    }
  }

  async function confirmMatch(item: Anime, match: TenraiAnime) {
    try {
      await saveAnimeMetadata(item.id, toAnimeMetadata(match));
      await reload();
      setMatchingId(null);
      setMatchResults([]);
      setNotice(`Matched "${item.title}" with ${match.title}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save this match.");
    }
  }

  function renderAnimeCard(item: UserAnime) {
    const total = item.episodes_total || item.episodes || 0;
    const progress = total > 0 ? Math.min(100, (item.episodes_watched / total) * 100) : 0;
    return (
      <article className="lam-library-card" key={item.id}>
        <Poster item={item} />
        <div className="lam-library-info">
          <div className="lam-card-heading">
            <div>
              <span className={`lam-status status-${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</span>
              <h3>{item.title}</h3>
            </div>
            <button className="lam-icon-button" title="Edit anime" onClick={() => openEditor(item)}><Edit3 size={17} /></button>
          </div>
          <div className="lam-progress-meta">
            <span>{item.episodes_watched} / {total || "—"} episodes</span>
            <span>{total ? `${Math.round(progress)}%` : "No episode data"}</span>
          </div>
          <div className="lam-progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="lam-card-bottom">
            <div className="lam-quick-count">
              <button title="One episode back" onClick={() => quickEpisode(item, -1)} disabled={item.episodes_watched <= 0}><Minus size={14} /></button>
              <span>{item.episodes_watched}</span>
              <button title="Mark one more episode watched" onClick={() => quickEpisode(item, 1)} disabled={total > 0 && item.episodes_watched >= total}><Plus size={14} /></button>
            </div>
            <span className="lam-rating"><Star size={14} fill="currentColor" /> {item.score ? `${item.score}/10` : "Not rated"}</span>
          </div>
        </div>
      </article>
    );
  }

  function renderDashboard() {
    return (
      <>
        <section className="lam-welcome">
          <div><span className="lam-eyebrow">YOUR PERSONAL ANIME UNIVERSE</span><h1>Welcome back.</h1><p>Keep track of what you watch, one episode at a time.</p></div>
          <button className="lam-primary" onClick={() => setPage("Discover")}><Plus size={17} /> Discover anime</button>
        </section>
        <section className="lam-stats">
          <div><span><Library size={17} /> Total anime</span><strong>{library.length}</strong><small>In your library</small></div>
          <div><span><Activity size={17} /> Watching</span><strong>{watching}</strong><small>Currently watching</small></div>
          <div><span><Check size={17} /> Completed</span><strong>{completed}</strong><small>Finished titles</small></div>
          <div><span><Film size={17} /> Episodes</span><strong>{totalWatched}</strong><small>Episodes watched</small></div>
          <div><span><Star size={17} /> Average rating</span><strong>{average}</strong><small>{rated.length} rated titles</small></div>
        </section>
        <section className="lam-section">
          <div className="lam-section-heading"><div><h2>Recently added</h2><p>Your latest additions</p></div><button className="lam-link-button" onClick={() => setPage("My Library")}>View library <ChevronRight size={15} /></button></div>
          {library.length ? <div className="lam-library-grid">{library.slice(0, 4).map(renderAnimeCard)}</div> : <div className="lam-empty"><Library size={28} /><h3>Your library is empty</h3><p>Search the anime catalogue to add your first title.</p><button className="lam-primary" onClick={() => setPage("Discover")}>Find anime</button></div>}
        </section>
      </>
    );
  }

  function renderLibrary() {
    return (
      <section className="lam-section">
        <div className="lam-section-heading"><div><h2>My Library</h2><p>Manage your anime and episode progress</p></div><span className="lam-count">{filteredLibrary.length} titles</span></div>
        {filteredLibrary.length ? <div className="lam-library-grid">{filteredLibrary.map(renderAnimeCard)}</div> : <div className="lam-empty"><Library size={28} /><h3>No anime found</h3><p>Try another search or add titles from Discover.</p><button className="lam-primary" onClick={() => setPage("Discover")}>Discover anime</button></div>}
      </section>
    );
  }

  function renderDiscover() {
    const existingMalIds = new Set(library.map((item) => item.mal_id).filter(Boolean));
    return (
      <section className="lam-section">
        <div className="lam-section-heading"><div><h2>Discover anime</h2><p>Search the MyAnimeList catalogue through Tenrai</p></div></div>
        <form className="lam-api-search" onSubmit={runSearch}>
          <Search size={19} />
          <input value={apiQuery} onChange={(e) => setApiQuery(e.target.value)} placeholder="Search anime titles..." />
          <button className="lam-primary" disabled={apiLoading || !apiQuery.trim()}>{apiLoading ? <Loader2 className="spin" size={17} /> : <Search size={17} />} Search</button>
        </form>
        <p className="lam-api-note">Metadata is provided by Tenrai, an unofficial, read-only MyAnimeList catalogue API.</p>
        {apiError && <div className="lam-error">{apiError}</div>}
        {apiLoading && <div className="lam-loading"><Loader2 className="spin" /> Searching anime catalogue...</div>}
        {!apiLoading && results.length > 0 && <div className="lam-discover-grid">
          {results.map((anime) => {
            const metadata = toAnimeMetadata(anime);
            const already = existingMalIds.has(anime.mal_id);
            return <article className="lam-discover-card" key={anime.mal_id}>
              <Poster item={{ title: anime.title, image_url: metadata.image_url }} />
              <div className="lam-discover-info"><h3>{anime.title_english || anime.title}</h3>
                <div className="lam-meta-line">{anime.type || "Anime"}{anime.year ? ` · ${anime.year}` : ""}{anime.episodes ? ` · ${anime.episodes} eps` : ""}</div>
                {anime.score ? <span className="lam-rating"><Star size={13} fill="currentColor" /> {anime.score.toFixed(2)}</span> : null}
                <p>{anime.synopsis || "No synopsis available."}</p>
                <div className="lam-discover-actions"><button className="lam-primary" disabled={already} onClick={() => addFromSearch(anime)}>{already ? <Check size={15} /> : <Plus size={15} />}{already ? "In library" : "Add to library"}</button><a href={anime.url} target="_blank" rel="noreferrer">MAL <ExternalLink size={13} /></a></div>
              </div>
            </article>;
          })}
        </div>}
        {!apiLoading && apiQuery && !apiError && results.length === 0 && <div className="lam-empty"><Search size={26} /><h3>No results yet</h3><p>Try another title or spelling.</p></div>}
        <div className="lam-attribution">Search and metadata service: <a href="https://api.tenrai.org/documentation" target="_blank" rel="noreferrer">Tenrai API documentation</a>.</div>
      </section>
    );
  }

  function renderImported() {
    const unlinked = catalog.filter((item) => !item.mal_id);
    const linked = catalog.length - unlinked.length;
    return <section className="lam-section">
      <div className="lam-section-heading"><div><h2>Imported catalogue</h2><p>Review and approve matches for your existing local anime</p></div><span className="lam-count">{linked} / {catalog.length} matched</span></div>
      <div className="lam-match-note">Each match is reviewed individually. Your existing local IDs and watch progress are preserved.</div>
      <div className="lam-import-list">
        {catalog.map((item) => <div className="lam-import-row" key={item.id}>
          <Poster item={item} />
          <div className="lam-import-main"><strong>{item.title}</strong><small>{item.mal_id ? `Matched · MAL ID ${item.mal_id}` : "Not matched yet"}</small></div>
          {item.mal_id ? <span className="lam-matched"><Check size={14} /> Matched</span> : <button className="lam-secondary" onClick={() => findMatch(item)}><Search size={15} /> Find match</button>}
          {matchingId === item.id && <div className="lam-match-results">
            <div className="lam-match-title"><strong>Choose the correct match</strong><button className="lam-icon-button" onClick={() => setMatchingId(null)}><X size={16} /></button></div>
            {matchError && <p className="lam-error">{matchError}</p>}
            {matchResults.map((match) => <div className="lam-match-option" key={match.mal_id}>
              <Poster item={{ title: match.title, image_url: toAnimeMetadata(match).image_url }} />
              <div><strong>{match.title_english || match.title}</strong><small>{match.type || "Anime"} · {match.episodes ?? "?"} episodes · MAL #{match.mal_id}</small></div>
              <button className="lam-primary" onClick={() => confirmMatch(item, match)}>Use match</button>
            </div>)}
            {!matchError && matchResults.length === 0 && <p className="lam-muted">No suggestions. Check the title in Discover.</p>}
          </div>}
        </div>)}
      </div>
    </section>;
  }

  return <div className="lam-shell">
    <aside className="lam-sidebar">
      <div className="lam-brand"><div className="lam-brand-icon"><Tv size={21} /></div><div><strong>LEGENDS</strong><span>ANIME MANAGER</span></div></div>
      <div className="lam-profile"><div className="lam-avatar">L</div><div><strong>My Collection</strong><small>Personal workspace</small></div></div>
      <span className="lam-nav-label">WORKSPACE</span>
      {([
        ["Dashboard", LayoutDashboard], ["My Library", Library], ["Discover", Compass], ["Imported Catalogue", BookOpen]
      ] as const).map(([label, Icon]) => <button key={label} className={`lam-nav-item ${page === label ? "active" : ""}`} onClick={() => setPage(label)}><Icon size={18} />{label}</button>)}
      <div className="lam-sidebar-bottom"><span>LEGENDS v0.2.0 · LOCAL</span></div>
    </aside>
    <main className="lam-main">
      <header className="lam-topbar"><div><span>Workspace</span><ChevronRight size={14} /><strong>{page}</strong></div><label className="lam-global-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter your library..." /></label></header>
      <div className="lam-content">
        {notice && <div className="lam-notice">{notice}<button onClick={() => setNotice("")}><X size={15} /></button></div>}
        {loading ? <div className="lam-loading"><Loader2 className="spin" /> Loading your collection...</div> :
          page === "Dashboard" ? renderDashboard() :
          page === "My Library" ? renderLibrary() :
          page === "Discover" ? renderDiscover() : renderImported()}
      </div>
    </main>
    {editing && <div className="lam-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
      <section className="lam-modal">
        <header><div><span className="lam-eyebrow">YOUR COLLECTION</span><h2>Edit anime</h2></div><button className="lam-icon-button" onClick={() => setEditing(null)}><X size={19} /></button></header>
        <div className="lam-modal-anime"><Poster item={editing} /><div><h3>{editing.title}</h3><small>{editing.episodes ?? "Unknown"} total episodes · {editing.airing_status || "Status unavailable"}</small>{editing.link && <a href={editing.link} target="_blank" rel="noreferrer">View MyAnimeList <ExternalLink size={13} /></a>}</div></div>
        <label className="lam-field">Watch status<select value={editStatus} onChange={(e) => setEditStatus(e.target.value as AnimeStatus)}>{ANIME_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <div className="lam-field-row"><label className="lam-field">Episodes watched<input type="number" min="0" value={editWatched} onChange={(e) => setEditWatched(Math.max(0, Number(e.target.value)))} /></label><label className="lam-field">Total episodes<input type="number" min="0" value={editTotal} onChange={(e) => setEditTotal(Math.max(0, Number(e.target.value)))} /></label></div>
        <label className="lam-field">My rating<select value={editScore} onChange={(e) => setEditScore(Number(e.target.value))}><option value={0}>Not rated</option>{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option value={n} key={n}>{n} / 10</option>)}</select></label>
        {editTotal > 0 && <div className="lam-modal-progress"><span style={{ width: `${Math.min(100, editWatched / editTotal * 100)}%` }} /></div>}
        {editTotal > 0 && editWatched > editTotal && <p className="lam-error">Watched episodes cannot exceed total episodes.</p>}
        <footer><button className="lam-danger-text" onClick={() => removeAnime(editing)}><Trash2 size={15} /> Remove</button><div><button className="lam-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="lam-primary" disabled={saving || (editTotal > 0 && editWatched > editTotal)} onClick={saveEditor}>{saving ? <Loader2 className="spin" size={16} /> : <Check size={16} />} Save changes</button></div></footer>
      </section>
    </div>}
  </div>;
}

export default App;
