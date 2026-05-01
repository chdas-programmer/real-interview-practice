// Daily.co REST API wrapper (server-only)
const BASE = "https://api.daily.co/v1";

function authHeaders() {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error("DAILY_API_KEY is not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function createDailyRoom(opts: {
  name?: string;
  startAt: Date;
  endAt: Date;
}): Promise<{ name: string; url: string }> {
  // exp is unix seconds; allow 15 min grace after endAt
  const exp = Math.floor(opts.endAt.getTime() / 1000) + 15 * 60;
  const nbf = Math.floor(opts.startAt.getTime() / 1000) - 15 * 60;
  const body: Record<string, unknown> = {
    privacy: "private",
    properties: {
      exp,
      nbf,
      enable_chat: true,
      enable_screenshare: true,
      enable_knocking: false,
      start_video_off: false,
      start_audio_off: false,
    },
  };
  if (opts.name) body.name = opts.name;

  const res = await fetch(`${BASE}/rooms`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Daily createRoom failed: ${res.status} ${txt}`);
  }
  const json = (await res.json()) as { name: string; url: string };
  return { name: json.name, url: json.url };
}

export async function createMeetingToken(opts: {
  roomName: string;
  userName: string;
  userId: string;
  isOwner: boolean;
  expiresAt: Date;
}): Promise<string> {
  const body = {
    properties: {
      room_name: opts.roomName,
      user_name: opts.userName,
      user_id: opts.userId,
      is_owner: opts.isOwner,
      exp: Math.floor(opts.expiresAt.getTime() / 1000),
    },
  };
  const res = await fetch(`${BASE}/meeting-tokens`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Daily createToken failed: ${res.status} ${txt}`);
  }
  const json = (await res.json()) as { token: string };
  return json.token;
}

export function roomNameFromUrl(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return url;
  }
}
