"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TelemetryChart } from "@/components/TelemetryChart";
import {
  addSeconds,
  CarData,
  Driver,
  fetchOpenF1,
  getTeamColor,
  isSupportedTeam,
  lapLabel,
  Lap,
  Meeting,
  Session,
  SUPPORTED_TEAMS
} from "@/lib/openf1";

type LoadState = "idle" | "loading" | "error";
type Trace = { driver: Driver; lap?: Lap; data: CarData[] };

const seasons = [2026, 2025, 2024, 2023];
const metrics = [
  { key: "speed", title: "Speed vs Time", unit: "km/h" },
  { key: "throttle", title: "Throttle vs Time", unit: "%" },
  { key: "brake", title: "Brake vs Time", unit: "%", stepped: true },
  { key: "n_gear", title: "Gear vs Time", unit: "gear", stepped: true },
  { key: "rpm", title: "RPM vs Time", unit: "rpm" }
] as const;

function timeSeries(data: CarData[], key: (typeof metrics)[number]["key"]): [number, number][] {
  if (!data.length) return [];
  const start = new Date(data[0].date).getTime();
  return data.map((sample) => [Number(((new Date(sample.date).getTime() - start) / 1000).toFixed(3)), Number(sample[key])]);
}

function drsSeries(data: CarData[]): [number, number][] {
  if (!data.length) return [];
  const start = new Date(data[0].date).getTime();
  return data.map((sample) => {
    const isOpen = sample.drs === 10 || sample.drs === 12 || sample.drs === 14;
    return [Number(((new Date(sample.date).getTime() - start) / 1000).toFixed(3)), isOpen ? 1 : 0];
  });
}

function SelectField({
  label,
  value,
  onChange,
  disabled,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-11 rounded-md border border-line bg-[#0c1118] px-3 text-sm font-semibold normal-case tracking-normal text-slate-100 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </select>
    </label>
  );
}

function TeamBadge({ team }: { team: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-2 py-1 text-xs font-bold text-white"
      style={{ backgroundColor: getTeamColor(team) }}
    >
      {team}
    </span>
  );
}

export default function Home() {
  const [season, setSeason] = useState("2025");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingKey, setMeetingKey] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionKey, setSessionKey] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [team, setTeam] = useState("Ferrari");
  const [driverNumber, setDriverNumber] = useState("");
  const [laps, setLaps] = useState<Lap[]>([]);
  const [lapNumber, setLapNumber] = useState("");
  const [compare, setCompare] = useState(false);
  const [teamB, setTeamB] = useState("Red Bull Racing");
  const [driverNumberB, setDriverNumberB] = useState("");
  const [traceA, setTraceA] = useState<Trace | null>(null);
  const [traceB, setTraceB] = useState<Trace | null>(null);
  const [status, setStatus] = useState<LoadState>("idle");
  const [message, setMessage] = useState("Choose a season, Grand Prix, session, driver, and lap to load telemetry.");

  const filteredDrivers = useMemo(() => drivers.filter((driver) => driver.team_name === team), [drivers, team]);
  const filteredDriversB = useMemo(() => drivers.filter((driver) => driver.team_name === teamB), [drivers, teamB]);
  const selectedDriver = drivers.find((driver) => String(driver.driver_number) === driverNumber);
  const selectedDriverB = drivers.find((driver) => String(driver.driver_number) === driverNumberB);

  useEffect(() => {
    setStatus("loading");
    setMessage("Loading Grand Prix list...");
    fetchOpenF1<Meeting[]>("meetings", { year: season })
      .then((data) => {
        const ordered = [...data].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
        setMeetings(ordered);
        setMeetingKey(String(ordered[0]?.meeting_key ?? ""));
        setStatus("idle");
        setMessage("Pick a race weekend and session.");
      })
      .catch((error: Error) => {
        setStatus("error");
        setMessage(error.message);
      });
  }, [season]);

  useEffect(() => {
    if (!meetingKey) return;
    setStatus("loading");
    setMessage("Loading sessions...");
    fetchOpenF1<Session[]>("sessions", { year: season, meeting_key: meetingKey })
      .then((data) => {
        const ordered = [...data].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
        setSessions(ordered);
        setSessionKey(String(ordered.find((session) => session.session_name === "Race")?.session_key ?? ordered[0]?.session_key ?? ""));
        setStatus("idle");
        setMessage("Pick a supported team and driver.");
      })
      .catch((error: Error) => {
        setStatus("error");
        setMessage(error.message);
      });
  }, [meetingKey, season]);

  useEffect(() => {
    if (!sessionKey) return;
    setStatus("loading");
    setMessage("Loading drivers from supported teams...");
    fetchOpenF1<Driver[]>("drivers", { session_key: sessionKey })
      .then((data) => {
        const supported = data.filter((driver) => isSupportedTeam(driver.team_name));
        setDrivers(supported);
        const firstTeam = SUPPORTED_TEAMS.find((supportedTeam) => supported.some((driver) => driver.team_name === supportedTeam)) ?? "Ferrari";
        setTeam(firstTeam);
        setDriverNumber(String(supported.find((driver) => driver.team_name === firstTeam)?.driver_number ?? ""));
        setTeamB("Red Bull Racing");
        setDriverNumberB(String(supported.find((driver) => driver.team_name === "Red Bull Racing")?.driver_number ?? ""));
        setStatus("idle");
        setMessage(`${supported.length} drivers available from the four supported teams.`);
      })
      .catch((error: Error) => {
        setStatus("error");
        setMessage(error.message);
      });
  }, [sessionKey]);

  useEffect(() => {
    if (!filteredDrivers.length) {
      setDriverNumber("");
      return;
    }
    if (!filteredDrivers.some((driver) => String(driver.driver_number) === driverNumber)) {
      setDriverNumber(String(filteredDrivers[0].driver_number));
    }
  }, [driverNumber, filteredDrivers]);

  useEffect(() => {
    if (!filteredDriversB.length) {
      setDriverNumberB("");
      return;
    }
    if (!filteredDriversB.some((driver) => String(driver.driver_number) === driverNumberB)) {
      setDriverNumberB(String(filteredDriversB[0].driver_number));
    }
  }, [driverNumberB, filteredDriversB]);

  useEffect(() => {
    if (!sessionKey || !driverNumber) return;
    setStatus("loading");
    setMessage("Loading laps...");
    fetchOpenF1<Lap[]>("laps", { session_key: sessionKey, driver_number: driverNumber })
      .then((data) => {
        const timedLaps = [...data]
          .filter((lap) => lap.lap_number && lap.date_start && lap.lap_duration)
          .sort((a, b) => a.lap_number - b.lap_number);
        setLaps(timedLaps);
        setLapNumber(String(timedLaps[0]?.lap_number ?? ""));
        setStatus("idle");
        setMessage(timedLaps.length ? "Select a lap and load telemetry." : "No timed laps found for this driver/session.");
      })
      .catch((error: Error) => {
        setStatus("error");
        setMessage(error.message);
      });
  }, [driverNumber, sessionKey]);

  async function loadTrace(driver: Driver | undefined, lapNum: string): Promise<Trace | null> {
    if (!driver || !sessionKey || !lapNum) return null;
    const [lap] = await fetchOpenF1<Lap[]>("laps", {
      session_key: sessionKey,
      driver_number: driver.driver_number,
      lap_number: lapNum
    });

    if (!lap?.date_start || !lap.lap_duration) {
      return { driver, lap, data: [] };
    }

    const data = await fetchOpenF1<CarData[]>("car_data", {
      session_key: sessionKey,
      driver_number: driver.driver_number,
      "date>=": lap.date_start,
      "date<=": addSeconds(lap.date_start, lap.lap_duration)
    });

    return { driver, lap, data: data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) };
  }

  async function handleLoadTelemetry() {
    setStatus("loading");
    setMessage("Fetching car telemetry...");
    setTraceA(null);
    setTraceB(null);
    try {
      const primary = await loadTrace(selectedDriver, lapNumber);
      const secondary = compare ? await loadTrace(selectedDriverB, lapNumber) : null;
      setTraceA(primary);
      setTraceB(secondary);
      setStatus("idle");
      setMessage(
        compare
          ? `Loaded lap ${lapNumber} comparison.`
          : primary?.data.length
            ? `Loaded ${primary.data.length} telemetry samples.`
            : "No telemetry samples found for that lap."
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Telemetry request failed.");
    }
  }

  const chartSeries = (key: (typeof metrics)[number]["key"]) =>
    [traceA, traceB]
      .filter((trace): trace is Trace => Boolean(trace?.data.length))
      .map((trace) => ({
        name: trace.driver.name_acronym,
        color: getTeamColor(trace.driver.team_name, trace.driver.team_colour),
        data: timeSeries(trace.data, key)
      }));

  const selectedMeeting = meetings.find((meeting) => String(meeting.meeting_key) === meetingKey);
  const selectedSession = sessions.find((session) => String(session.session_key) === sessionKey);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="grid gap-4 border-b border-line pb-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-400">OpenF1 telemetry</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">F1 Telemetry Dashboard</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Browser-only dashboard for Ferrari, Red Bull Racing, McLaren, and Mercedes. Data loads directly from OpenF1 and is cached in memory for repeat selections.
          </p>
        </div>
        <div className="grid gap-2 rounded-lg border border-line bg-panel/80 p-4 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Current view</span>
          <strong className="text-white">{selectedMeeting?.meeting_name ?? "No Grand Prix selected"}</strong>
          <span>{selectedSession?.session_name ?? "No session selected"}</span>
        </div>
      </header>

      <section className="grid gap-4 rounded-lg border border-line bg-panel/88 p-4 shadow-dash">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <SelectField label="Season" value={season} onChange={setSeason}>
            {seasons.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectField>

          <SelectField label="Grand Prix" value={meetingKey} onChange={setMeetingKey} disabled={!meetings.length}>
            {meetings.map((meeting) => (
              <option key={meeting.meeting_key} value={meeting.meeting_key}>
                {meeting.meeting_name}
              </option>
            ))}
          </SelectField>

          <SelectField label="Session" value={sessionKey} onChange={setSessionKey} disabled={!sessions.length}>
            {sessions.map((session) => (
              <option key={session.session_key} value={session.session_key}>
                {session.session_name}
              </option>
            ))}
          </SelectField>

          <SelectField label="Team" value={team} onChange={setTeam} disabled={!drivers.length}>
            {SUPPORTED_TEAMS.map((supportedTeam) => (
              <option key={supportedTeam} value={supportedTeam}>
                {supportedTeam}
              </option>
            ))}
          </SelectField>

          <SelectField label="Driver" value={driverNumber} onChange={setDriverNumber} disabled={!filteredDrivers.length}>
            {filteredDrivers.map((driver) => (
              <option key={driver.driver_number} value={driver.driver_number}>
                {driver.name_acronym} - {driver.full_name}
              </option>
            ))}
          </SelectField>

          <SelectField label="Lap" value={lapNumber} onChange={setLapNumber} disabled={!laps.length}>
            {laps.map((lap) => (
              <option key={lap.lap_number} value={lap.lap_number}>
                {lapLabel(lap)}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="grid gap-3 border-t border-line pt-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-3 md:grid-cols-[auto_1fr_1fr] md:items-end">
            <label className="flex h-11 items-center gap-3 rounded-md border border-line bg-[#0c1118] px-3 text-sm font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={compare}
                onChange={(event) => setCompare(event.target.checked)}
                className="h-4 w-4 accent-red-500"
              />
              Compare two drivers
            </label>
            <SelectField label="Second team" value={teamB} onChange={setTeamB} disabled={!compare || !drivers.length}>
              {SUPPORTED_TEAMS.map((supportedTeam) => (
                <option key={supportedTeam} value={supportedTeam}>
                  {supportedTeam}
                </option>
              ))}
            </SelectField>
            <SelectField label="Second driver" value={driverNumberB} onChange={setDriverNumberB} disabled={!compare || !filteredDriversB.length}>
              {filteredDriversB.map((driver) => (
                <option key={driver.driver_number} value={driver.driver_number}>
                  {driver.name_acronym} - {driver.full_name}
                </option>
              ))}
            </SelectField>
          </div>

          <button
            onClick={handleLoadTelemetry}
            disabled={status === "loading" || !driverNumber || !lapNumber}
            className="h-11 rounded-md bg-red-600 px-5 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {status === "loading" ? "Loading" : "Load telemetry"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          {selectedDriver ? <TeamBadge team={selectedDriver.team_name} /> : null}
          {compare && selectedDriverB ? <TeamBadge team={selectedDriverB.team_name} /> : null}
          <span className={status === "error" ? "text-red-300" : "text-slate-400"}>{message}</span>
        </div>
      </section>

      {traceA?.data.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {metrics.map((metric) => (
            <TelemetryChart
              key={metric.key}
              title={metric.title}
              unit={metric.unit}
              stepped={metric.stepped}
              series={chartSeries(metric.key)}
            />
          ))}
          <TelemetryChart
            title="DRS Status"
            unit="open"
            stepped
            series={[
              {
                name: traceA.driver.name_acronym,
                color: getTeamColor(traceA.driver.team_name, traceA.driver.team_colour),
                data: drsSeries(traceA.data)
              }
            ]}
          />
        </section>
      ) : (
        <section className="grid min-h-[260px] place-items-center rounded-lg border border-dashed border-line bg-panel/50 p-8 text-center text-slate-400">
          <div>
            <p className="text-lg font-bold text-slate-200">No telemetry loaded yet</p>
            <p className="mt-2 text-sm">Load a lap to render speed, throttle, brake, gear, RPM, and DRS charts.</p>
          </div>
        </section>
      )}
    </main>
  );
}
