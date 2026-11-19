
import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:legends_anime.db");
  }
  return db;
}

export type AnimeStatus =
  | "Watching"
  | "Completed"
  | "Plan to Watch"
  | "On Hold"
  | "Dropped";

export const ANIME_STATUSES: AnimeStatus[] = [
  "Watching",
  "Completed",
  "Plan to Watch",
  "On Hold",
  "Dropped",
];

export interface AnimeMetadata {
  mal_id: number;
  title: string;
  image_url: string | null;
  synopsis: string | null;
  episodes: number | null;
  airing_status: string | null;
  mal_score: number | null;
  link: string | null;
  anime_type: string | null;
  year: number | null;
  genres: string | null;
}

export interface Anime {
  id: number;
  title: string;
  aliases: string | null;
  photo: string | null;
  link: string | null;
  photo_file_id: string | null;

  mal_id: number | null;
  image_url: string | null;
  synopsis: string | null;
  episodes: number | null;
  airing_status: string | null;
  mal_score: number | null;
  anime_type: string | null;
  year: number | null;
  genres: string | null;
}

export interface UserAnime {
  id: number;
  anime_id: number;
  title: string;
  photo: string | null;
  link: string | null;

  mal_id: number | null;
  image_url: string | null;
  synopsis: string | null;
  episodes: number | null;
  airing_status: string | null;
  mal_score: number | null;
  anime_type: string | null;
  year: number | null;
  genres: string | null;

  status: AnimeStatus;
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
  status?: AnimeStatus;
  score?: number;
  episodes_total?: number;
  episodes_watched?: number;
}

export interface UpdateAnime {
  status: AnimeStatus;
  score: number;
  episodes_total: number;
  episodes_watched: number;
}

async function addColumnIfMissing(
  database: Database,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  const columns = await database.select<{ name: string }[]>(
    `PRAGMA table_info(${table})`
  );

  if (!columns.some((item) => item.name === column)) {
    await database.execute(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
    );
  }
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();

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

  // Add metadata without deleting or replacing existing catalogue records.
  const metadataColumns = [
    ["mal_id", "INTEGER"],
    ["image_url", "TEXT"],
    ["synopsis", "TEXT"],
    ["episodes", "INTEGER"],
    ["airing_status", "TEXT"],
    ["mal_score", "REAL"],
    ["anime_type", "TEXT"],
    ["year", "INTEGER"],
    ["genres", "TEXT"],
  ] as const;

  for (const [column, definition] of metadataColumns) {
    await addColumnIfMissing(database, "anime", column, definition);
  }

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

  await database.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_anime_mal_id
    ON anime(mal_id)
    WHERE mal_id IS NOT NULL
  `);

  console.log("LEGENDS Anime Manager database initialized!");
}

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
      const result = await database.execute(
        "INSERT INTO anime (title, photo, link) VALUES (?, ?, ?)",
        [anime.title, anime.photo ?? null, anime.link ?? null]
      );

      animeId = result.lastInsertId;
    }
  }

  await database.execute(
    `INSERT INTO user_anime (
      anime_id, status, score, episodes_total, episodes_watched
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      animeId,
      anime.status ?? "Plan to Watch",
      anime.score ?? 0,
      anime.episodes_total ?? 0,
      anime.episodes_watched ?? 0,
    ]
  );
}

export async function addAnimeFromCatalog(animeId: number): Promise<void> {
  const database = await getDatabase();

  const existing = await database.select<{ id: number }[]>(
    "SELECT id FROM anime WHERE id = ?",
    [animeId]
  );

  if (!existing.length) {
    throw new Error("Anime not found in your imported catalogue.");
  }

  await database.execute(
    "INSERT INTO user_anime (anime_id) VALUES (?)",
    [animeId]
  );
}

export async function addAnimeFromApi(
  metadata: AnimeMetadata
): Promise<void> {
  const database = await getDatabase();

  let existing = await database.select<{ id: number }[]>(
    "SELECT id FROM anime WHERE mal_id = ?",
    [metadata.mal_id]
  );

  let animeId: number;

  if (existing.length) {
    animeId = existing[0].id;
  } else {
    const result = await database.execute(
      `INSERT INTO anime (
        title, link, mal_id, image_url, synopsis, episodes,
        airing_status, mal_score, anime_type, year, genres
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        metadata.title,
        metadata.link,
        metadata.mal_id,
        metadata.image_url,
        metadata.synopsis,
        metadata.episodes,
        metadata.airing_status,
        metadata.mal_score,
        metadata.anime_type,
        metadata.year,
        metadata.genres,
      ]
    );

    animeId = result.lastInsertId;
  }

  const alreadyAdded = await database.select<{ id: number }[]>(
    "SELECT id FROM user_anime WHERE anime_id = ?",
    [animeId]
  );

  if (alreadyAdded.length) {
    throw new Error("This anime is already in your library.");
  }

  await database.execute(
    `INSERT INTO user_anime (
      anime_id, status, score, episodes_total, episodes_watched
    ) VALUES (?, 'Plan to Watch', 0, ?, 0)`,
    [animeId, metadata.episodes ?? 0]
  );
}

export async function saveAnimeMetadata(
  animeId: number,
  metadata: AnimeMetadata
): Promise<void> {
  const database = await getDatabase();

  const existing = await database.select<{ id: number }[]>(
    "SELECT id FROM anime WHERE id = ?",
    [animeId]
  );

  if (!existing.length) {
    throw new Error("Catalogue anime not found.");
  }

  const conflict = await database.select<{ id: number }[]>(
    "SELECT id FROM anime WHERE mal_id = ? AND id != ?",
    [metadata.mal_id, animeId]
  );

  if (conflict.length) {
    throw new Error("This MyAnimeList entry is already linked to another catalogue anime.");
  }

  await database.execute(
    `UPDATE anime SET
      mal_id = ?,
      image_url = ?,
      synopsis = ?,
      episodes = ?,
      airing_status = ?,
      mal_score = ?,
      anime_type = ?,
      year = ?,
      genres = ?,
      link = ?
    WHERE id = ?`,
    [
      metadata.mal_id,
      metadata.image_url,
      metadata.synopsis,
      metadata.episodes,
      metadata.airing_status,
      metadata.mal_score,
      metadata.anime_type,
      metadata.year,
      metadata.genres,
      metadata.link,
      animeId,
    ]
  );

  // Only update the total when the existing user hasn't entered one.
  await database.execute(
    `UPDATE user_anime
     SET episodes_total = ?
     WHERE anime_id = ? AND episodes_total = 0`,
    [metadata.episodes ?? 0, animeId]
  );
}

export async function getCatalogAnime(): Promise<Anime[]> {
  const database = await getDatabase();

  return database.select<Anime[]>(
    "SELECT * FROM anime ORDER BY title COLLATE NOCASE"
  );
}

export async function getAnimeList(): Promise<UserAnime[]> {
  const database = await getDatabase();

  return database.select<UserAnime[]>(`
    SELECT
      ua.id,
      ua.anime_id,
      a.title,
      a.photo,
      a.link,
      a.mal_id,
      a.image_url,
      a.synopsis,
      a.episodes,
      a.airing_status,
      a.mal_score,
      a.anime_type,
      a.year,
      a.genres,
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

export async function updateAnime(
  id: number,
  updates: UpdateAnime
): Promise<void> {
  const database = await getDatabase();

  if (!ANIME_STATUSES.includes(updates.status)) {
    throw new Error("Invalid anime status.");
  }

  if (
    !Number.isInteger(updates.score) ||
    updates.score < 0 ||
    updates.score > 10
  ) {
    throw new Error("Rating must be between 0 and 10.");
  }

  if (
    !Number.isInteger(updates.episodes_total) ||
    updates.episodes_total < 0
  ) {
    throw new Error("Total episodes must be zero or greater.");
  }

  if (
    !Number.isInteger(updates.episodes_watched) ||
    updates.episodes_watched < 0
  ) {
    throw new Error("Watched episodes must be zero or greater.");
  }

  if (
    updates.episodes_total > 0 &&
    updates.episodes_watched > updates.episodes_total
  ) {
    throw new Error("Watched episodes cannot exceed total episodes.");
  }

  await database.execute(
    `UPDATE user_anime
     SET status = ?,
         score = ?,
         episodes_total = ?,
         episodes_watched = ?
     WHERE id = ?`,
    [
      updates.status,
      updates.score,
      updates.episodes_total,
      updates.episodes_watched,
      id,
    ]
  );
}

export async function deleteAnime(id: number): Promise<void> {
  const database = await getDatabase();

  await database.execute(
    "DELETE FROM user_anime WHERE id = ?",
    [id]
  );
}
