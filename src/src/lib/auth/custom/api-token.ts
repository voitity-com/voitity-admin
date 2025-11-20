const STORAGE_KEY = 'custom-api-access';
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hour

interface ApiTokenRecord {
  token: string;
  storedAt: number;
  lastActivity: number;
}

function readRecord(): ApiTokenRecord | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ApiTokenRecord;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeRecord(record: ApiTokenRecord): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function saveApiAccessToken(token: string): void {
  const now = Date.now();
  writeRecord({ token, storedAt: now, lastActivity: now });
}

export function clearApiAccessToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function updateApiLastActivity(): void {
  const record = readRecord();

  if (!record) {
    return;
  }

  record.lastActivity = Date.now();
  writeRecord(record);
}

export function hasExceededInactivityLimit(): boolean {
  const record = readRecord();

  if (!record) {
    return false;
  }

  return Date.now() - record.lastActivity >= INACTIVITY_LIMIT_MS;
}

export function getStoredApiToken(): string | null {
  const record = readRecord();
  return record?.token ?? null;
}
