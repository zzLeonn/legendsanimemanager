
import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:legends_anime.db");
  }

  return db;
}

// Existing anime catalogue structure from LegendsMALBot
export interface Anime {
  id: number;
  title: string;
  aliases: string | null;
  photo: string | null;
  link: string | null;
  photo_file_id: string | null;
}

// Personal watchlist entry
export interface UserAnime {
  id: number;
  anime_id: number;
  title: string;
  photo: string | null;
  link: string | null;
  status: string;
  score: number;
  episodes_total: number;
  episodes_watched: number;
  added_at: string;
}

export interface NewAnime {
  animeId?: number;
  title: string;
  photo?: string;
  link?: string;
  status?: string;
  score?: number;
  episodes_total?: number;
  episodes_watched?: number;
}

// Initialize database
export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();

  // Preserve the Telegram bot's original catalogue schema.
  await database.execute(`
    CREATE TABLE IF NOT EXISTS anime (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      aliases TEXT,
      photo TEXT,
      link TEXT,
      photo_file_id TEXT
    )
  `);

  // Personal watchlist
  await database.execute(`
    CREATE TABLE IF NOT EXISTS user_anime (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anime_id INTEGER NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'Plan to Watch',
      score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 10),
      episodes_total INTEGER DEFAULT 0,
      episodes_watched INTEGER DEFAULT 0,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE
    )
  `);

  // Individual episode tracking
  await database.execute(`
    CREATE TABLE IF NOT EXISTS episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_anime_id INTEGER NOT NULL,
      episode_number INTEGER NOT NULL,
      watched INTEGER DEFAULT 0,
      watched_at TEXT,
      UNIQUE (user_anime_id, episode_number),
      FOREIGN KEY (user_anime_id)
        REFERENCES user_anime(id) ON DELETE CASCADE
    )
  `);

  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_anime_title
    ON anime(title)
  `);

  await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_user_anime_status
    ON user_anime(status)
  `);

  console.log("LEGENDS Anime Manager database initialized!");
}

// Add an existing catalogue anime to the watchlist,
// or create a new catalogue entry first.
export async function addAnime(anime: NewAnime): Promise<void> {
  const database = await getDatabase();

  let animeId = anime.animeId;

  if (animeId === undefined) {
    const existing = await database.select<{ id: number }[]>(
      "SELECT id FROM anime WHERE title = ? LIMIT 1",
      [anime.title]
    );

    if (existing.length > 0) {
      animeId = existing[0].id;
    } else {
      await database.execute(
        "INSERT INTO anime (title, photo, link) VALUES (?, ?, ?)",
        [
          anime.title,
          anime.photo ?? null,
          anime.link ?? null
        ]
      );

      const inserted = await database.select<{ id: number }[]>(
        "SELECT id FROM anime WHERE title = ? ORDER BY id DESC LIMIT 1",
        [anime.title]
      );

      if (inserted.length === 0) {
        throw new Error("Could not retrieve the newly created anime.");
      }

      animeId = inserted[0].id;
    }
  }

  await database.execute(
    `INSERT INTO user_anime (
      anime_id,
      status,
      score,
      episodes_total,
      episodes_watched
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      animeId,
      anime.status ?? "Plan to Watch",
      anime.score ?? 0,
      anime.episodes_total ?? 0,
      anime.episodes_watched ?? 0
    ]
  );
}

// Retrieve the complete imported anime catalogue
export async function getCatalogAnime(): Promise<Anime[]> {
  const database = await getDatabase();

  return await database.select<Anime[]>(
    "SELECT * FROM anime ORDER BY title COLLATE NOCASE"
  );
}

// Retrieve personal watchlist
export async function getAnimeList(): Promise<UserAnime[]> {
  const database = await getDatabase();

  return await database.select<UserAnime[]>(`
    SELECT
      ua.id,
      ua.anime_id,
      a.title,
      a.photo,
      a.link,
      ua.status,
      ua.score,
      ua.episodes_total,
      ua.episodes_watched,
      ua.added_at
    FROM user_anime ua
    JOIN anime a ON a.id = ua.anime_id
    ORDER BY ua.added_at DESC
  `);
}

// Remove an anime from your personal watchlist
export async function deleteAnime(id: number): Promise<void> {
  const database = await getDatabase();

  await database.execute(
    "DELETE FROM user_anime WHERE id = ?",
    [id]
  );
}
