
import { useEffect, useMemo, useState } from "react";

import {
  initializeDatabase,
  getCatalogAnime,
  getAnimeList,
  addAnime,
  deleteAnime,
  updateAnime,
  ANIME_STATUSES,
  type Anime,
  type UserAnime,
  type AnimeStatus,
} from "./database/db";

import {
  LayoutDashboard,
  Library,
  Compass,
  BookOpen,
  Users,
  BarChart3,
  CalendarDays,
  Settings,
  Search,
  Bell,
  Plus,
  ChevronRight,
  Clock3,
  Star,
  MoreHorizontal,
  Tv,
  Play,
  Trash2,
  Save,
  Check,
} from "lucide-react";

import "./App.css";

type Page =
  | "Dashboard"
  | "My Library"
  | "Discover"
  | "Manga"
  | "Characters"
  | "Statistics"
  | "Calendar"
  | "Settings";

const navGroups = [
  {
    label: "MENU",
    items: [
      { name: "Dashboard" as Page, icon: LayoutDashboard },
      { name: "My Library" as Page, icon: Library },
      { name: "Discover" as Page, icon: Compass },
      { name: "Manga" as Page, icon: BookOpen },
    ],
  },
  {
    label: "PERSONAL",
    items: [
      { name: "Characters" as Page, icon: Users },
      { name: "Statistics" as Page, icon: BarChart3 },
      { name: "Calendar" as Page, icon: CalendarDays },
    ],
  },
];

interface AnimeCardProps {
  item: Anime | UserAnime;
  isInLibrary: boolean;
  onAdd?: () => void;
  onDelete?: () => void;
  onUpdate?: (updates: {
    status: AnimeStatus;
    score: number;
    episodes_total: number;
    episodes_watched: number;
  }) => Promise<void>;
  showDelete?: boolean;
}

function getImagePath(photo: string | null): string | null {
  if (!photo) return null;

  const imageName = photo.replace(/\\/g, "/").split("/").pop();

  return imageName ? `/images/${imageName}` : null;
}

function AnimeCard({
  item,
  isInLibrary,
  onAdd,
  onDelete,
  onUpdate,
  showDelete = false,
}: AnimeCardProps) {
  const libraryItem = showDelete ? (item as UserAnime) : null;

  const [status, setStatus] = useState<AnimeStatus>(
    libraryItem?.status ?? "Plan to Watch"
  );

  const [score, setScore] = useState(libraryItem?.score ?? 0);

  const [episodesTotal, setEpisodesTotal] = useState(
    libraryItem?.episodes_total ?? 0
  );

  const [episodesWatched, setEpisodesWatched] = useState(
    libraryItem?.episodes_watched ?? 0
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (libraryItem) {
      setStatus(libraryItem.status);
      setScore(libraryItem.score);
      setEpisodesTotal(libraryItem.episodes_total);
      setEpisodesWatched(libraryItem.episodes_watched);
    }
  }, [
    libraryItem?.id,
    libraryItem?.status,
    libraryItem?.score,
    libraryItem?.episodes_total,
    libraryItem?.episodes_watched,
  ]);

  const imagePath = getImagePath(item.photo);

  const progress =
    episodesTotal > 0
      ? Math.min((episodesWatched / episodesTotal) * 100, 100)
      : 0;

  async function handleSave() {
    if (!onUpdate) return;

    if (
      !Number.isInteger(episodesTotal) ||
      !Number.isInteger(episodesWatched) ||
      episodesTotal < 0 ||
      episodesWatched < 0
    ) {
      setError("Please enter valid episode numbers.");
      return;
    }

    if (episodesTotal > 0 && episodesWatched > episodesTotal) {
      setError("Watched episodes cannot exceed total episodes.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);

    try {
      await onUpdate({
        status,
        score,
        episodes_total: episodesTotal,
        episodes_watched: episodesWatched,
      });

      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Could not update anime:", err);
      setError(
        err instanceof Error ? err.message : "Could not save changes."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="anime-card">
      <div className="poster-wrapper">
        {imagePath ? (
          <img
            src={imagePath}
            alt={item.title}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="empty-icon">
            <Tv size={30} />
          </div>
        )}

        {showDelete && libraryItem && (
          <div className="episode-badge">{libraryItem.status}</div>
        )}
      </div>

      <div className="anime-card-info">
        <h4>{item.title}</h4>

        {!showDelete ? (
          <button
            className="secondary-button"
            disabled={isInLibrary}
            onClick={onAdd}
          >
            {isInLibrary ? (
              "In My Library"
            ) : (
              <>
                <Plus size={16} />
                Add to Library
              </>
            )}
          </button>
        ) : (
          <div className="anime-editor">
            <label className="editor-label">Watch Status</label>

            <select
              className="editor-input"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as AnimeStatus)
              }
            >
              {ANIME_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <label className="editor-label">Episode Progress</label>

            <div className="episode-inputs">
              <input
                className="editor-input"
                type="number"
                min="0"
                value={episodesWatched}
                onChange={(event) =>
                  setEpisodesWatched(
                    Math.max(0, Number(event.target.value))
                  )
                }
                aria-label="Episodes watched"
              />

              <span>/</span>

              <input
                className="editor-input"
                type="number"
                min="0"
                value={episodesTotal}
                onChange={(event) =>
                  setEpisodesTotal(
                    Math.max(0, Number(event.target.value))
                  )
                }
                aria-label="Total episodes"
              />
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className="progress-caption">
              {episodesTotal > 0
                ? `${Math.round(progress)}% completed`
                : "Total episodes not set"}
            </span>

            <label className="editor-label">My Rating</label>

            <select
              className="editor-input"
              value={score}
              onChange={(event) => setScore(Number(event.target.value))}
            >
              <option value={0}>Not rated</option>
              {Array.from({ length: 10 }, (_, index) => index + 1).map(
                (rating) => (
                  <option key={rating} value={rating}>
                    {rating} / 10
                  </option>
                )
              )}
            </select>

            {error && <p className="editor-error">{error}</p>}

            <button
              className="secondary-button save-button"
              onClick={handleSave}
              disabled={saving}
            >
              {saved ? (
                <>
                  <Check size={16} />
                  Saved
                </>
              ) : (
                <>
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Changes"}
                </>
              )}
            </button>

            <button
              className="text-button remove-button"
              onClick={onDelete}
            >
              <Trash2 size={15} />
              Remove from Library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className="stat-icon">{icon}</div>
        <span className="stat-detail">{detail}</span>
      </div>

      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function App() {
  const [catalogAnime, setCatalogAnime] = useState<Anime[]>([]);
  const [myAnime, setMyAnime] = useState<UserAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activePage, setActivePage] = useState<Page>("Dashboard");
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    async function loadData() {
      try {
        await initializeDatabase();

        const [catalog, watchlist] = await Promise.all([
          getCatalogAnime(),
          getAnimeList(),
        ]);

        setCatalogAnime(catalog);
        setMyAnime(watchlist);

        console.log("Database ready!");
        console.log("Anime loaded:", catalog.length);
      } catch (error) {
        console.error("Database loading failed:", error);
        setMessage("Failed to load anime catalogue.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredAnime = useMemo(() => {
    return catalogAnime.filter((item) =>
      item.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [catalogAnime, search]);

  const filteredLibrary = useMemo(() => {
    return myAnime.filter((item) => {
      const matchesSearch = item.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [myAnime, search, statusFilter]);

  const watchingCount = myAnime.filter(
    (item) => item.status === "Watching"
  ).length;

  const completedCount = myAnime.filter(
    (item) => item.status === "Completed"
  ).length;

  const episodesWatched = myAnime.reduce(
    (total, item) => total + item.episodes_watched,
    0
  );

  const ratedAnime = myAnime.filter((item) => item.score > 0);

  const averageRating =
    ratedAnime.length > 0
      ? (
          ratedAnime.reduce((total, item) => total + item.score, 0) /
          ratedAnime.length
        ).toFixed(1)
      : "—";

  async function refreshLibrary() {
    const updatedList = await getAnimeList();
    setMyAnime(updatedList);
  }

  async function handleAddAnime(item: Anime) {
    try {
      await addAnime({
        animeId: item.id,
        title: item.title,
      });

      await refreshLibrary();
      setMessage(`${item.title} added to your library!`);
    } catch (error) {
      console.error("Could not add anime:", error);
      setMessage(
        `${item.title} could not be added. It may already be in your library.`
      );
    }
  }

  async function handleDeleteAnime(id: number) {
    try {
      await deleteAnime(id);
      await refreshLibrary();
      setMessage("Anime removed from your library.");
    } catch (error) {
      console.error("Could not remove anime:", error);
      setMessage("Could not remove this anime.");
    }
  }

  async function handleUpdateAnime(
    id: number,
    updates: {
      status: AnimeStatus;
      score: number;
      episodes_total: number;
      episodes_watched: number;
    }
  ) {
    await updateAnime(id, updates);
    await refreshLibrary();
    setMessage("Anime details updated successfully.");
  }

  function renderCatalogue() {
    return (
      <section className="section">
        <div className="section-header">
          <div>
            <h3>Anime Catalogue</h3>
            <p>Browse your imported anime collection</p>
          </div>
          <span>{filteredAnime.length} Titles</span>
        </div>

        {loading ? (
          <div className="empty-state">
            <strong>Loading anime catalogue...</strong>
          </div>
        ) : (
          <div className="anime-grid">
            {filteredAnime.map((item) => {
              const alreadyAdded = myAnime.some(
                (entry) => entry.anime_id === item.id
              );

              return (
                <AnimeCard
                  key={item.id}
                  item={item}
                  isInLibrary={alreadyAdded}
                  onAdd={() => handleAddAnime(item)}
                />
              );
            })}
          </div>
        )}

        {!loading && filteredAnime.length === 0 && (
          <div className="empty-state">
            <strong>No anime found</strong>
            <span>Try another search.</span>
          </div>
        )}
      </section>
    );
  }

  function renderLibrary() {
    return (
      <section className="section">
        <div className="section-header">
          <div>
            <h3>My Library</h3>
            <p>Manage your anime, episodes, and ratings</p>
          </div>
          <span>{filteredLibrary.length} Titles</span>
        </div>

        <div className="library-filters">
          <label htmlFor="status-filter">Filter by status</label>

          <select
            id="status-filter"
            className="editor-input filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All Anime</option>
            {ANIME_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {filteredLibrary.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Library size={23} />
            </div>

            <strong>
              {myAnime.length === 0
                ? "Your library is empty"
                : "No anime matches your filters"}
            </strong>

            <span>
              {myAnime.length === 0
                ? "Add anime from your catalogue to start tracking."
                : "Try changing your search or status filter."}
            </span>

            {myAnime.length === 0 && (
              <button
                className="secondary-button"
                onClick={() => setActivePage("Discover")}
              >
                <Plus size={16} />
                Browse Anime
              </button>
            )}
          </div>
        ) : (
          <div className="anime-grid">
            {filteredLibrary.map((item) => (
              <AnimeCard
                key={item.id}
                item={item}
                isInLibrary
                showDelete
                onDelete={() => handleDeleteAnime(item.id)}
                onUpdate={(updates) =>
                  handleUpdateAnime(item.id, updates)
                }
              />
            ))}
          </div>
        )}
      </section>
    );
  }

  function renderDashboard() {
    return (
      <>
        <section className="welcome-section">
          <div>
            <p className="eyebrow">YOUR PERSONAL ANIME UNIVERSE</p>
            <h2>Welcome back.</h2>
            <p className="welcome-description">
              Your anime journey, all in one place.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() => setActivePage("Discover")}
          >
            <Plus size={18} />
            Add Anime
          </button>
        </section>

        <section className="stats-grid">
          <StatCard
            icon={<Library size={18} />}
            label="Total Anime"
            value={String(myAnime.length)}
            detail="In your library"
          />

          <StatCard
            icon={<Play size={18} />}
            label="Watching"
            value={String(watchingCount)}
            detail="Currently watching"
          />

          <StatCard
            icon={<Star size={18} />}
            label="Completed"
            value={String(completedCount)}
            detail="Finished titles"
          />

          <StatCard
            icon={<Clock3 size={18} />}
            label="Episodes"
            value={String(episodesWatched)}
            detail="Episodes watched"
          />
        </section>

        <section className="stats-grid extra-stats">
          <StatCard
            icon={<Star size={18} />}
            label="Average Rating"
            value={averageRating}
            detail={`${ratedAnime.length} rated titles`}
          />

          <StatCard
            icon={<Tv size={18} />}
            label="Catalogue"
            value={String(catalogAnime.length)}
            detail="Available anime"
          />
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <h3>Recently Added</h3>
              <p>Your latest library additions</p>
            </div>

            <button
              className="text-button"
              onClick={() => setActivePage("My Library")}
            >
              View all <ChevronRight size={16} />
            </button>
          </div>

          {myAnime.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Library size={23} />
              </div>

              <strong>Your library is empty</strong>
              <span>Add anime to start building your collection.</span>

              <button
                className="secondary-button"
                onClick={() => setActivePage("Discover")}
              >
                <Plus size={16} />
                Add your first anime
              </button>
            </div>
          ) : (
            <div className="anime-grid">
              {myAnime.slice(0, 4).map((item) => (
                <AnimeCard
                  key={item.id}
                  item={item}
                  isInLibrary
                  showDelete
                  onDelete={() => handleDeleteAnime(item.id)}
                  onUpdate={(updates) =>
                    handleUpdateAnime(item.id, updates)
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="bottom-grid">
          <div className="panel">
            <div className="section-header">
              <div>
                <h3>Anime Catalogue</h3>
                <p>Your imported anime collection</p>
              </div>

              <button
                className="text-button"
                onClick={() => setActivePage("Discover")}
              >
                Browse <ChevronRight size={16} />
              </button>
            </div>

            <div className="overview-empty">
              <Tv size={30} />
              <strong>{catalogAnime.length} anime available</strong>
              <small>Explore your imported catalogue.</small>
            </div>
          </div>

          <div className="panel">
            <div className="section-header">
              <div>
                <h3>Quick Overview</h3>
                <p>Your viewing activity</p>
              </div>
            </div>

            <div className="overview-empty">
              <BarChart3 size={30} />
              <strong>{episodesWatched} episodes watched</strong>
              <small>
                Your detailed statistics will appear here as you track anime.
              </small>
            </div>
          </div>
        </section>
      </>
    );
  }

  function renderPlaceholder(page: Page) {
    return (
      <section className="section">
        <div className="empty-state">
          <div className="empty-icon">
            {page === "Statistics" ? (
              <BarChart3 size={23} />
            ) : page === "Calendar" ? (
              <CalendarDays size={23} />
            ) : page === "Settings" ? (
              <Settings size={23} />
            ) : page === "Characters" ? (
              <Users size={23} />
            ) : (
              <BookOpen size={23} />
            )}
          </div>

          <strong>{page}</strong>
          <span>This section is not available yet.</span>
          <small>We'll build this feature in a future update.</small>
        </div>
      </section>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Tv size={22} />
          </div>

          <div>
            <h1>LEGENDS</h1>
            <span>ANIME MANAGER</span>
          </div>
        </div>

        <div className="profile">
          <div className="avatar">L</div>

          <div className="profile-info">
            <strong>My Collection</strong>
            <span>Personal workspace</span>
          </div>

          <MoreHorizontal size={19} />
        </div>

        {navGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            <p className="nav-heading">{group.label}</p>

            {group.items.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.name;

              return (
                <button
                  key={item.name}
                  className={`nav-item ${active ? "active" : ""}`}
                  onClick={() => {
                    setActivePage(item.name);
                    setSearch("");
                    setMessage("");
                  }}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        ))}

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${
              activePage === "Settings" ? "active" : ""
            }`}
            onClick={() => setActivePage("Settings")}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <div className="version">LEGENDS v0.1.0 · LOCAL</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />

              <input
                placeholder="Search your anime..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <button className="icon-button" title="Notifications">
              <Bell size={18} />
            </button>

            <div className="top-avatar">L</div>
          </div>
        </header>

        <div className="dashboard">
          {message && (
            <div className="section">
              <p>{message}</p>

              <button
                className="text-button"
                onClick={() => setMessage("")}
              >
                Dismiss
              </button>
            </div>
          )}

          {activePage === "Dashboard" && renderDashboard()}
          {activePage === "My Library" && renderLibrary()}
          {activePage === "Discover" && renderCatalogue()}

          {![
            "Dashboard",
            "My Library",
            "Discover",
          ].includes(activePage) && renderPlaceholder(activePage)}
        </div>
      </main>
    </div>
  );
}

export default App;
