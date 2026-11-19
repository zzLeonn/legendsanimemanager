import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

/**
 * Get the database connection.
 * Reuses the same connection instead of opening a new one every time.
 */
export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:legends_anime.db');
  }

  return db;
}

/**
 * Initialize the database and create tables if they don't exist.
 */
export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();

  // Main anime library
  await database.execute(`
    CREATE TABLE IF NOT EXISTS anime (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_english TEXT,
      title_japanese TEXT,
      image_url TEXT,
      synopsis TEXT,
      status TEXT NOT NULL DEFAULT 'Plan to Watch'
        CHECK (status IN (
          'Watching',
          'Completed',
          'Plan to Watch',
          'On Hold',
          'Dropped'
        )),
      score INTEGER DEFAULT 0
        CHECK (score >= 0 AND score <= 10),
      episodes_total INTEGER DEFAULT 0,
      episodes_watched INTEGER DEFAULT 0,
      release_year INTEGER,
      season TEXT,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Genres
  await database.execute(`
    CREATE TABLE IF NOT EXISTS genres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  // Connect anime to genres (one anime can have many genres)
  await database.execute(`
    CREATE TABLE IF NOT EXISTS anime_genres (
      anime_id INTEGER NOT NULL,
      genre_id INTEGER NOT NULL,
      PRIMARY KEY (anime_id, genre_id),
      FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
    )
  `);

  // Episode tracking (for individual episodes later)
  await database.execute(`
    CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id INTEGER NOT NULL,
      episode_number INTEGER NOT NULL,
      watched INTEGER DEFAULT 0,
      watched_at TEXT,
      FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
      UNIQUE (anime_id, episode_number)
    )
  `);

  // Useful indexes for faster filtering and sorting
  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_anime_status
    ON anime(status)
  `);

  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_anime_title
    ON anime(title)
  `);

  console.log('LEGENDS Anime Manager database initialized!');
}