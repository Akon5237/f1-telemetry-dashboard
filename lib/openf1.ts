export const SUPPORTED_TEAMS = ["Ferrari", "Red Bull Racing", "McLaren", "Mercedes"] as const;

export type SupportedTeam = (typeof SUPPORTED_TEAMS)[number];

export type Meeting = {
  meeting_key: number;
  meeting_name: string;
  circuit_short_name: string;
  country_name: string;
  location: string;
  year: number;
  date_start: string;
};

export type Session = {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  year: number;
};

export type Driver = {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour?: string;
  headshot_url?: string;
};

export type Lap = {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  date_start: string | null;
  is_pit_out_lap: boolean;
};

export type CarData = {
  date: string;
  driver_number: number;
  speed: number;
  throttle: number;
  brake: number;
  n_gear: number;
  rpm: number;
  drs: number;
};

const BASE_URL = "/api/openf1";
const memoryCache = new Map<string, Promise<unknown>>();

function buildUrl(endpoint: string, params: Record<string, string | number | boolean | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

  return `${BASE_URL}/${endpoint}${query ? `?${query}` : ""}`;
}

export async function fetchOpenF1<T>(endpoint: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const url = buildUrl(endpoint, params);
  if (!memoryCache.has(url)) {
    memoryCache.set(
      url,
      fetch(url).then(async (response) => {
        if (!response.ok) {
          throw new Error(`OpenF1 request failed: ${response.status} ${response.statusText}`);
        }
        return response.json() as Promise<T>;
      })
    );
  }

  return memoryCache.get(url) as Promise<T>;
}

export const teamColors: Record<SupportedTeam, string> = {
  Ferrari: "#e10600",
  "Red Bull Racing": "#3671c6",
  McLaren: "#ff8000",
  Mercedes: "#00d2be"
};

export function isSupportedTeam(teamName: string): teamName is SupportedTeam {
  return SUPPORTED_TEAMS.includes(teamName as SupportedTeam);
}

export function getTeamColor(teamName: string, fallback?: string) {
  if (isSupportedTeam(teamName)) return teamColors[teamName];
  return fallback ? `#${fallback.replace("#", "")}` : "#9ca3af";
}

export function addSeconds(date: string, seconds: number) {
  return new Date(new Date(date).getTime() + seconds * 1000).toISOString();
}

export function lapLabel(lap: Lap) {
  const duration = lap.lap_duration ? `${lap.lap_duration.toFixed(3)}s` : "no time";
  return `Lap ${lap.lap_number} - ${duration}${lap.is_pit_out_lap ? " - pit out" : ""}`;
}
