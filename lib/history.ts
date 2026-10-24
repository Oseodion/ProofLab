import { isTaskRecord, type TaskRecord } from "@/lib/types";

const KEY = "prooflab.tasks.v1";
const SESSION_PREFIX = "prooflab.task.";
const MAX_TASKS = 30;
const EMPTY: TaskRecord[] = [];

const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cache: TaskRecord[] = EMPTY;
const sessionCache = new Map<string, { raw: string; task: TaskRecord | null }>();

function canUseDom(): boolean {
  return typeof window !== "undefined";
}

function notify(): void {
  cacheRaw = null;
  for (const listener of listeners) listener();
}

export function subscribeTasks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTasksSnapshot(): TaskRecord[] {
  return loadTasks();
}

export function getServerTasksSnapshot(): null {
  return null;
}

export function loadTasks(): TaskRecord[] {
  if (!canUseDom()) return EMPTY;
  let raw = "";
  try {
    raw = window.localStorage.getItem(KEY) ?? "";
  } catch {
    return EMPTY;
  }
  if (cacheRaw === raw) return cache;
  cacheRaw = raw;
  if (!raw) {
    cache = EMPTY;
    return cache;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    cache = Array.isArray(parsed) ? parsed.filter(isTaskRecord).slice(0, MAX_TASKS) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

export function getTask(id: string): TaskRecord | null {
  const listed = loadTasks().find((task) => task.id === id);
  if (listed) return listed;
  if (!canUseDom()) return null;
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(`${SESSION_PREFIX}${id}`);
  } catch {
    return null;
  }
  if (!raw) return null;
  const cached = sessionCache.get(id);
  if (cached?.raw === raw) return cached.task;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const task = isTaskRecord(parsed) ? parsed : null;
    sessionCache.set(id, { raw, task });
    return task;
  } catch {
    sessionCache.set(id, { raw, task: null });
    return null;
  }
}

export function saveTask(task: TaskRecord): "local" | "session" | "none" {
  if (!canUseDom()) return "none";
  const next = [task, ...loadTasks().filter((item) => item.id !== task.id)].slice(0, MAX_TASKS);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    notify();
    return "local";
  } catch {
    try {
      window.sessionStorage.setItem(`${SESSION_PREFIX}${task.id}`, JSON.stringify(task));
      sessionCache.delete(task.id);
      notify();
      return "session";
    } catch {
      return "none";
    }
  }
}

export function removeTask(id: string): void {
  if (!canUseDom()) return;
  const next = loadTasks().filter((task) => task.id !== id);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Leave the previous value in place if the browser rejects the write.
  }
  try {
    window.sessionStorage.removeItem(`${SESSION_PREFIX}${id}`);
    sessionCache.delete(id);
  } catch {
    // Ignore session storage failures.
  }
  notify();
}
