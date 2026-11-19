import { useEffect } from "react";
import { initializeDatabase } from "./database/db";

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
  Play,
  ChevronRight,
  Clock3,
  Star,
  MoreHorizontal,
  Tv,
} from "lucide-react";

import "./App.css";


const anime = [
  {
    title: "Frieren: Beyond Journey's End",
    episode: "Episode 18",
    progress: 18,
    total: 28,
    image:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=500&q=85",
  },
  {
    title: "Solo Leveling",
    episode: "Episode 9",
    progress: 9,
    total: 12,
    image:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=500&q=85",
  },
  {
    title: "Jujutsu Kaisen",
    episode: "Episode 14",
    progress: 14,
    total: 24,
    image:
      "https://images.unsplash.com/photo-1614583225154-5fcdda07c4e4?auto=format&fit=crop&w=500&q=85",
  },
  {
    title: "Bleach: Thousand-Year Blood War",
    episode: "Episode 6",
    progress: 6,
    total: 13,
    image:
      "https://images.unsplash.com/photo-1607604276583-eef5d076d2b0?auto=format&fit=crop&w=500&q=85",
  },
];

const navGroups = [
  {
    label: "MENU",
    items: [
      { name: "Dashboard", icon: LayoutDashboard },
      { name: "My Library", icon: Library },
      { name: "Discover", icon: Compass },
      { name: "Manga", icon: BookOpen },
    ],
  },
  {
    label: "PERSONAL",
    items: [
      { name: "Characters", icon: Users },
      { name: "Statistics", icon: BarChart3 },
      { name: "Calendar", icon: CalendarDays },
    ],
  },
];

function App() {
  useEffect(() => {
    initializeDatabase()
      .then(() => {
        console.log("Database ready!");
      })
      .catch((error: unknown) => {
        console.error("Database initialization failed:", error);
      });
  }, []);

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
              const active = item.name === "Dashboard";

              return (
                <button
                  key={item.name}
                  className={`nav-item ${active ? "active" : ""}`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        ))}

        <div className="sidebar-bottom">
          <button className="nav-item">
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
            <strong>Dashboard</strong>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input placeholder="Search your anime..." />
              <kbd>Ctrl K</kbd>
            </div>
            <button className="icon-button">
              <Bell size={18} />
            </button>
            <div className="top-avatar">L</div>
          </div>
        </header>

        <div className="dashboard">
          <section className="welcome-section">
            <div>
              <p className="eyebrow">YOUR PERSONAL ANIME UNIVERSE</p>
              <h2>Welcome back.</h2>
              <p className="welcome-description">
                Your anime journey, all in one place.
              </p>
            </div>

            <button className="primary-button">
              <Plus size={18} />
              Add Anime
            </button>
          </section>

          <section className="stats-grid">
            <StatCard
              icon={<Library size={18} />}
              label="Total Anime"
              value="0"
              detail="In your library"
            />
            <StatCard
              icon={<Play size={18} />}
              label="Watching"
              value="0"
              detail="Currently watching"
            />
            <StatCard
              icon={<Star size={18} />}
              label="Completed"
              value="0"
              detail="Finished titles"
            />
            <StatCard
              icon={<Clock3 size={18} />}
              label="Episodes"
              value="0"
              detail="Episodes watched"
            />
          </section>

          <section className="section">
            <div className="section-header">
              <div>
                <h3>Continue Watching</h3>
                <p>Pick up where you left off</p>
              </div>
              <button className="text-button">
                View all <ChevronRight size={16} />
              </button>
            </div>

            <div className="anime-grid">
              {anime.map((item) => (
                <div className="anime-card" key={item.title}>
                  <div className="poster-wrapper">
                    <img src={item.image} alt={item.title} />
                    <div className="poster-overlay">
                      <button className="play-button">
                        <Play size={20} fill="currentColor" />
                      </button>
                    </div>
                    <div className="episode-badge">{item.episode}</div>
                  </div>

                  <div className="anime-card-info">
                    <h4>{item.title}</h4>
                    <div className="progress-label">
                      <span>
                        {item.progress} / {item.total} episodes
                      </span>
                      <span>
                        {Math.round((item.progress / item.total) * 100)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${(item.progress / item.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bottom-grid">
            <div className="panel">
              <div className="section-header">
                <div>
                  <h3>Recently Added</h3>
                  <p>Your latest library additions</p>
                </div>
              </div>
              <div className="empty-state">
                <div className="empty-icon">
                  <Library size={23} />
                </div>
                <strong>Your library is empty</strong>
                <span>Add anime to start building your collection.</span>
                <button className="secondary-button">
                  <Plus size={16} /> Add your first anime
                </button>
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
                <span>Your statistics will appear here</span>
                <small>Start tracking anime to see your activity.</small>
              </div>
            </div>
          </section>
        </div>
      </main>
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

export default App;