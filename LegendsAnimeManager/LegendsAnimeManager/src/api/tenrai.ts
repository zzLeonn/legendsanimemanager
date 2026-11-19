
const API_BASE = "https://api.tenrai.org/v1";

export interface TenraiAnime {
  mal_id: number;
  url: string;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string | null;
  episodes: number | null;
  status: string | null;
  score: number | null;
  synopsis: string | null;
  year: number | null;
  images?: {
    jpg?: {
      image_url?: string | null;
      large_image_url?: string | null;
    };
    webp?: {
      image_url?: string | null;
      large_image_url?: string | null;
    };
  };
  genres?: Array<{
    mal_id: number;
    name: string;
  }>;
}

interface TenraiResponse {
  data: TenraiAnime[];
}

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (response.status === 429) {
    throw new Error("The anime catalogue is receiving too many requests. Please wait a little and try again.");
  }

  if (!response.ok) {
    throw new Error(`Anime catalogue request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export async function searchAnime(
  query: string
): Promise<TenraiAnime[]> {
  const cleaned = query.trim();

  if (!cleaned) return [];

  const params = new URLSearchParams({
    q: cleaned,
    limit: "10",
    sfw: "true",
  });

  const response = await request<TenraiResponse>(
    `${API_BASE}/anime?${params.toString()}`
  );

  return response.data ?? [];
}

export function toAnimeMetadata(anime: TenraiAnime) {
  const image =
    anime.images?.webp?.large_image_url ||
    anime.images?.jpg?.large_image_url ||
    anime.images?.webp?.image_url ||
    anime.images?.jpg?.image_url ||
    null;

  return {
    mal_id: anime.mal_id,
    title: anime.title_english || anime.title,
    image_url: image,
    synopsis: anime.synopsis || null,
    episodes: anime.episodes ?? null,
    airing_status: anime.status || null,
    mal_score: anime.score ?? null,
    link: anime.url || `https://myanimelist.net/anime/${anime.mal_id}`,
    anime_type: anime.type || null,
    year: anime.year ?? null,
    genres: JSON.stringify(
      (anime.genres ?? []).map((genre) => genre.name)
    ),
  };
}
