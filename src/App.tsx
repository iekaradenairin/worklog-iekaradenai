import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Archive,
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  FileEdit,
  FileText,
  FolderOpen,
  Music4,
  PauseCircle,
  Play,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type Id = string;
type TaskStatus = "active" | "frozen" | "completed" | "archived";
type TimeLogSource = "timer" | "backfill" | "manual";

type Task = {
  id: Id;
  title: string;
  status: TaskStatus;
  memo?: string;
  category?: string;
  deadline?: string;
  estimateMinutes?: number;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
};

type WorkType = {
  id: Id;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RunningTimer = {
  id: Id;
  taskId: Id;
  workTypeId: Id;
  startAt: string;
  startNote?: string;
  createdAt: string;
  updatedAt: string;
};

type TimeLog = {
  id: Id;
  taskId: Id;
  workTypeId: Id;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  startNote?: string;
  endNote?: string;
  source: TimeLogSource;
  createdAt: string;
  updatedAt: string;
};

type AppMeta = {
  id: "app-meta";
  schemaVersion: number;
  revision: number;
  lastMutationAt: string;
  onboardingSeenAt?: string;
  lastBackupAt?: string;
  backupReminderDismissedAt?: string;
};

type AppData = {
  tasks: Task[];
  workTypes: WorkType[];
  runningTimers: RunningTimer[];
  timeLogs: TimeLog[];
  appMeta: AppMeta;
};

type BackupPayload = {
  appVersion: string;
  exportedAt: string;
  data: AppData;
};

const APP_VERSION = "0.2.0";
const DB_NAME = "dtm-worklog-db";
const DB_VERSION = 1;
const STORE_TASKS = "tasks";
const STORE_WORK_TYPES = "workTypes";
const STORE_RUNNING_TIMERS = "runningTimers";
const STORE_TIME_LOGS = "timeLogs";
const STORE_APP_META = "appMeta";
const APP_META_ID = "app-meta" as const;
const DEFAULT_WORK_TYPE_DEFS = [
  { name: "作曲", sortOrder: 10 },
  { name: "編曲", sortOrder: 20 },
  { name: "作詞", sortOrder: 30 },
  { name: "調声", sortOrder: 40 },
  { name: "修正", sortOrder: 50 },
  { name: "ミックス", sortOrder: 60 },
  { name: "マスタリング", sortOrder: 70 },
  { name: "その他", sortOrder: 80 },
] as const;
const SYNC_CHANNEL = "dtm-worklog-sync";

const workTypeToneStyles: Record<
  string,
  {
    card: string;
    cardActive: string;
    chip: string;
    settingsRow: string;
    settingsIndex: string;
    settingsAction: string;
  }
> = {
  作曲: {
    card: "border-white/60 bg-[rgba(200,217,236,0.30)] text-[color:var(--accent-teal)] hover:bg-[rgba(200,217,236,0.40)]",
    cardActive: "border-[rgba(78,115,171,0.16)] bg-[rgba(200,217,236,0.52)] text-[color:var(--accent-teal)] ring-2 ring-[rgba(78,115,171,0.12)] shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
    chip: "border-white/65 bg-[rgba(200,217,236,0.42)] text-[color:var(--accent-teal)]",
    settingsRow: "border-white/55 bg-[rgba(200,217,236,0.30)]",
    settingsIndex: "bg-white/70 text-[color:var(--accent-teal)]",
    settingsAction: "border-white/70 bg-white/56 text-[color:var(--accent-teal)] hover:bg-white/72",
  },
  編曲: {
    card: "border-white/60 bg-[rgba(143,182,216,0.20)] text-[color:var(--accent-primary)] hover:bg-[rgba(143,182,216,0.30)]",
    cardActive: "border-[rgba(95,126,184,0.16)] bg-[rgba(143,182,216,0.34)] text-[color:var(--accent-primary)] ring-2 ring-[rgba(95,126,184,0.10)] shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
    chip: "border-white/65 bg-[rgba(143,182,216,0.28)] text-[color:var(--accent-primary)]",
    settingsRow: "border-white/55 bg-[rgba(143,182,216,0.22)]",
    settingsIndex: "bg-white/70 text-[color:var(--accent-primary)]",
    settingsAction: "border-white/70 bg-white/56 text-[color:var(--accent-primary)] hover:bg-white/72",
  },
  作詞: {
    card: "border-white/60 bg-[rgba(207,60,131,0.06)] text-[color:var(--accent-highlight)] hover:bg-[rgba(207,60,131,0.10)]",
    cardActive: "border-[rgba(207,60,131,0.12)] bg-[rgba(207,60,131,0.12)] text-[color:var(--accent-highlight)] ring-2 ring-[rgba(207,60,131,0.08)] shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
    chip: "border-white/65 bg-[rgba(207,60,131,0.12)] text-[color:var(--accent-highlight)]",
    settingsRow: "border-white/55 bg-[rgba(207,60,131,0.06)]",
    settingsIndex: "bg-white/70 text-[color:var(--accent-highlight)]",
    settingsAction: "border-white/70 bg-white/56 text-[color:var(--accent-highlight)] hover:bg-white/72",
  },
  調声: {
    card: "border-white/60 bg-[rgba(175,199,225,0.20)] text-[#6883ad] hover:bg-[rgba(175,199,225,0.30)]",
    cardActive: "border-[rgba(107,132,176,0.16)] bg-[rgba(175,199,225,0.34)] text-[#6883ad] ring-2 ring-[rgba(107,132,176,0.10)] shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
    chip: "border-white/65 bg-[rgba(175,199,225,0.28)] text-[#6883ad]",
    settingsRow: "border-white/55 bg-[rgba(175,199,225,0.22)]",
    settingsIndex: "bg-white/70 text-[#6b84b0]",
    settingsAction: "border-white/70 bg-white/56 text-[#6b84b0] hover:bg-white/72",
  },
  修正: {
    card: "border-white/60 bg-[rgba(207,60,131,0.06)] text-[color:var(--accent-highlight)] hover:bg-[rgba(207,60,131,0.10)]",
    cardActive: "border-[rgba(207,60,131,0.12)] bg-[rgba(207,60,131,0.12)] text-[color:var(--accent-highlight)] ring-2 ring-[rgba(207,60,131,0.08)] shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
    chip: "border-white/65 bg-[rgba(207,60,131,0.12)] text-[color:var(--accent-highlight)]",
    settingsRow: "border-white/55 bg-[rgba(207,60,131,0.06)]",
    settingsIndex: "bg-white/70 text-[color:var(--accent-highlight)]",
    settingsAction: "border-white/70 bg-white/56 text-[color:var(--accent-highlight)] hover:bg-white/72",
  },
  ミックス: {
    card: "border-white/60 bg-[rgba(143,182,216,0.14)] text-[#6c8fb8] hover:bg-[rgba(143,182,216,0.24)]",
    cardActive: "border-[rgba(116,152,194,0.16)] bg-[rgba(143,182,216,0.26)] text-[#6c8fb8] ring-2 ring-[rgba(116,152,194,0.10)] shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
    chip: "border-white/65 bg-[rgba(143,182,216,0.22)] text-[#6c8fb8]",
    settingsRow: "border-white/55 bg-[rgba(143,182,216,0.16)]",
    settingsIndex: "bg-white/70 text-[#6c8fb8]",
    settingsAction: "border-white/70 bg-white/56 text-[#6c8fb8] hover:bg-white/72",
  },
  マスタリング: {
    card: "border-white/60 bg-[rgba(207,60,131,0.08)] text-[#b44a82] hover:bg-[rgba(207,60,131,0.12)]",
    cardActive: "border-[rgba(180,74,130,0.16)] bg-[rgba(207,60,131,0.14)] text-[#b44a82] ring-2 ring-[rgba(180,74,130,0.10)] shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
    chip: "border-white/65 bg-[rgba(207,60,131,0.14)] text-[#b44a82]",
    settingsRow: "border-white/55 bg-[rgba(207,60,131,0.08)]",
    settingsIndex: "bg-white/70 text-[#b44a82]",
    settingsAction: "border-white/70 bg-white/56 text-[#b44a82] hover:bg-white/72",
  },
  その他: {
    card: "border-white/60 bg-white/34 text-[color:var(--text-default)] hover:bg-white/48",
    cardActive: "border-white/70 bg-white/52 text-[color:var(--text-strong)] ring-2 ring-white/35 shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
    chip: "border-white/65 bg-white/44 text-[color:var(--text-default)]",
    settingsRow: "border-white/55 bg-white/34",
    settingsIndex: "bg-white/70 text-[color:var(--text-default)]",
    settingsAction: "border-white/70 bg-white/56 text-[color:var(--text-default)] hover:bg-white/72",
  },
};

const taskSelectionToneCycle = [
  {
    idle: "border-white/60 bg-[rgba(200,217,236,0.28)] text-[color:var(--accent-teal)] hover:bg-[rgba(200,217,236,0.38)]",
    active:
      "border-[rgba(78,115,171,0.16)] bg-[rgba(200,217,236,0.52)] text-[color:var(--accent-teal)] ring-2 ring-[rgba(78,115,171,0.12)] shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
  },
  {
    idle: "border-white/60 bg-[rgba(143,182,216,0.18)] text-[color:var(--accent-primary)] hover:bg-[rgba(143,182,216,0.28)]",
    active:
      "border-[rgba(95,126,184,0.16)] bg-[rgba(143,182,216,0.34)] text-[color:var(--accent-primary)] ring-2 ring-[rgba(95,126,184,0.10)] shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
  },
  {
    idle: "border-white/60 bg-[rgba(175,199,225,0.18)] text-[#6883ad] hover:bg-[rgba(175,199,225,0.28)]",
    active:
      "border-[rgba(107,132,176,0.16)] bg-[rgba(175,199,225,0.34)] text-[#6883ad] ring-2 ring-[rgba(107,132,176,0.10)] shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
  },
  {
    idle: "border-white/60 bg-[rgba(207,60,131,0.05)] text-[color:var(--accent-highlight)] hover:bg-[rgba(207,60,131,0.10)]",
    active:
      "border-[rgba(207,60,131,0.12)] bg-[rgba(207,60,131,0.12)] text-[color:var(--accent-highlight)] ring-2 ring-[rgba(207,60,131,0.08)] shadow-[0_10px_24px_rgba(56,59,62,0.06)]",
  },
];

function getTaskSelectionTone(index: number) {
  return taskSelectionToneCycle[index % taskSelectionToneCycle.length];
}

const statusMeta: Record<TaskStatus, { label: string; sectionClass: string; badgeClass: string }> = {
  active: {
    label: "進行中",
    sectionClass: "border-white/55 bg-white/38 backdrop-blur-[18px]",
    badgeClass: "border-white/55 bg-[var(--state-active-bg)] text-[var(--state-active-text)]",
  },
  frozen: {
    label: "凍結",
    sectionClass: "border-white/55 bg-white/34 backdrop-blur-[18px]",
    badgeClass: "border-white/55 bg-[var(--state-frozen-bg)] text-[var(--state-frozen-text)]",
  },
  completed: {
    label: "完了",
    sectionClass: "border-white/55 bg-white/34 backdrop-blur-[18px]",
    badgeClass: "border-white/55 bg-[var(--state-completed-bg)] text-[var(--state-completed-text)]",
  },
  archived: {
    label: "アーカイブ",
    sectionClass: "border-white/55 bg-white/30 backdrop-blur-[18px]",
    badgeClass: "border-white/55 bg-[var(--state-archived-bg)] text-[var(--state-archived-text)]",
  },
};

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function formatDateTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
}

function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function diffMinutes(startAt: string, endAt: string) {
  return Math.max(1, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000));
}

function isSameDay(a?: string, b?: string) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function daysSince(iso?: string) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

function toLocalInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const hours = `${d.getHours()}`.padStart(2, "0");
  const minutes = `${d.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromLocalInputValue(value: string) {
  return new Date(value).toISOString();
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildDefaultWorkTypes() {
  const now = nowIso();

  return DEFAULT_WORK_TYPE_DEFS.map((item) => ({
    id: makeId(),
    name: item.name,
    sortOrder: item.sortOrder,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildInitialMeta(): AppMeta {
  const now = nowIso();
  return {
    id: APP_META_ID,
    schemaVersion: 1,
    revision: 1,
    lastMutationAt: now,
  };
}

function buildEmptyAppData(): AppData {
  return {
    tasks: [],
    workTypes: buildDefaultWorkTypes(),
    runningTimers: [],
    timeLogs: [],
    appMeta: buildInitialMeta(),
  };
}

function ensureDefaultWorkTypes(current: WorkType[]) {
  const now = nowIso();
  const byName = new Map(current.map((item) => [item.name, item]));
  let changed = false;

  const normalized = [...current];

  DEFAULT_WORK_TYPE_DEFS.forEach((def) => {
    const existing = byName.get(def.name);

    if (!existing) {
      normalized.push({
        id: makeId(),
        name: def.name,
        sortOrder: def.sortOrder,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      changed = true;
      return;
    }

    if (existing.sortOrder !== def.sortOrder) {
      existing.sortOrder = def.sortOrder;
      existing.updatedAt = now;
      changed = true;
    }
  });

  return {
    workTypes: normalized.sort((a, b) => a.sortOrder - b.sortOrder),
    changed,
  };
}

function getNextWorkTypeSortOrder(items: WorkType[]) {
  const max = items.reduce((acc, item) => Math.max(acc, item.sortOrder), 0);
  return max === 0 ? 100 : Math.ceil((max + 1) / 10) * 10;
}

function createStoreIfMissing(db: IDBDatabase, name: string, options?: IDBObjectStoreParameters) {
  if (!db.objectStoreNames.contains(name)) {
    db.createObjectStore(name, options);
  }
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      createStoreIfMissing(db, STORE_TASKS, { keyPath: "id" });
      createStoreIfMissing(db, STORE_WORK_TYPES, { keyPath: "id" });
      createStoreIfMissing(db, STORE_RUNNING_TIMERS, { keyPath: "id" });
      createStoreIfMissing(db, STORE_TIME_LOGS, { keyPath: "id" });
      createStoreIfMissing(db, STORE_APP_META, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

async function readAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const data = await requestToPromise(store.getAll() as IDBRequest<T[]>);
  await transactionDone(tx);
  return data;
}

async function readOneFromStore<T>(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const data = await requestToPromise(store.get(key) as IDBRequest<T | undefined>);
  await transactionDone(tx);
  return data;
}

async function saveAppDataToDb(nextData: AppData, expectedRevision?: number) {
  const db = await openDb();
  const currentMeta = await readOneFromStore<AppMeta>(db, STORE_APP_META, APP_META_ID);
  const currentRevision = currentMeta?.revision ?? 0;
  if (typeof expectedRevision === "number" && currentRevision !== expectedRevision) {
    db.close();
    return { ok: false as const, stale: true as const };
  }
  const now = nowIso();
  const meta: AppMeta = {
    ...nextData.appMeta,
    id: APP_META_ID,
    schemaVersion: 1,
    revision: currentRevision + 1,
    lastMutationAt: now,
  };
  const tx = db.transaction([STORE_TASKS, STORE_WORK_TYPES, STORE_RUNNING_TIMERS, STORE_TIME_LOGS, STORE_APP_META], "readwrite");
  const tasksStore = tx.objectStore(STORE_TASKS);
  const workTypesStore = tx.objectStore(STORE_WORK_TYPES);
  const runningStore = tx.objectStore(STORE_RUNNING_TIMERS);
  const logsStore = tx.objectStore(STORE_TIME_LOGS);
  const metaStore = tx.objectStore(STORE_APP_META);

  tasksStore.clear();
  workTypesStore.clear();
  runningStore.clear();
  logsStore.clear();
  metaStore.clear();

  nextData.tasks.forEach((item) => tasksStore.put(item));
  nextData.workTypes.forEach((item) => workTypesStore.put(item));
  nextData.runningTimers.forEach((item) => runningStore.put(item));
  nextData.timeLogs.forEach((item) => logsStore.put(item));
  metaStore.put(meta);

  await transactionDone(tx);
  db.close();
  return { ok: true as const, data: { ...nextData, appMeta: meta } };
}

async function loadAppDataFromDb(): Promise<AppData> {
  const db = await openDb();
  let tasks = await readAllFromStore<Task>(db, STORE_TASKS);
  let workTypes = await readAllFromStore<WorkType>(db, STORE_WORK_TYPES);
  let runningTimers = await readAllFromStore<RunningTimer>(db, STORE_RUNNING_TIMERS);
  let timeLogs = await readAllFromStore<TimeLog>(db, STORE_TIME_LOGS);
  let appMeta = await readOneFromStore<AppMeta>(db, STORE_APP_META, APP_META_ID);
  db.close();

  const needsInit = !appMeta || workTypes.length === 0;
  if (needsInit) {
    const initial = buildEmptyAppData();
    const saved = await saveAppDataToDb(initial);
    if (saved.ok) return saved.data;
  }

  if (!appMeta) appMeta = buildInitialMeta();

  const ensured = ensureDefaultWorkTypes(workTypes);
  if (ensured.changed) {
    const normalizedData: AppData = {
      tasks,
      workTypes: ensured.workTypes,
      runningTimers,
      timeLogs,
      appMeta,
    };

    const saved = await saveAppDataToDb(normalizedData);
    if (saved.ok) return saved.data;

    workTypes = ensured.workTypes;
  }

  return {
    tasks,
    workTypes,
    runningTimers,
    timeLogs,
    appMeta,
  };
}

function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-gradient-to-br from-pink-100 via-violet-100 to-sky-100 p-2 text-violet-700 shadow-sm">{icon}</div>
      <div>
        <div className="text-base font-semibold text-slate-900">{title}</div>
        {sub ? <div className="text-sm text-slate-500">{sub}</div> : null}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  emphasize = false,
}: {
  label: string;
  value: string;
  accent: string;
  emphasize?: boolean;
}) {
  return (
    <Card className="rounded-[26px] border border-white/45 bg-white/56 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
      <CardContent className="flex min-h-[112px] flex-col justify-between p-5">
        <div className="text-sm font-medium leading-5 text-slate-500">{label}</div>
        <div className={`${emphasize ? "text-3xl" : "text-2xl"} font-bold tracking-tight ${accent}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const width = Math.max(6, (value / Math.max(max, 1)) * 100);
  return (
    <div className="h-3 w-full rounded-full bg-violet-100">
      <div className="h-3 rounded-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-sky-300" style={{ width: `${width}%` }} />
    </div>
  );
}

export default function DtmWorklogPrototype() {
  const [tab, setTab] = useState("home");
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [startSearch, setStartSearch] = useState("");
  const [taskListSearch, setTaskListSearch] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<Id>("");
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState<Id>("");
  const [startNote, setStartNote] = useState("");
  const [startOffset, setStartOffset] = useState("now");
  const [selectedStopTaskId, setSelectedStopTaskId] = useState<Id>("");
  const [endNote, setEndNote] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskMemo, setNewTaskMemo] = useState("");
  const [newWorkTypeName, setNewWorkTypeName] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTaskId, setManualTaskId] = useState<Id>("");
  const [manualWorkTypeId, setManualWorkTypeId] = useState<Id>("");
  const [manualStartAt, setManualStartAt] = useState("");
  const [manualEndAt, setManualEndAt] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [taskEditOpen, setTaskEditOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<Task | null>(null);
  const [logEditOpen, setLogEditOpen] = useState(false);
  const [logDraft, setLogDraft] = useState<TimeLog | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [taskDetailTaskId, setTaskDetailTaskId] = useState<Id>("");

  const tasks = data?.tasks ?? [];
  const workTypes = data?.workTypes ?? [];
  const runningTimers = data?.runningTimers ?? [];
  const timeLogs = data?.timeLogs ?? [];
  const appMeta = data?.appMeta ?? buildInitialMeta();

  useEffect(() => {
    let mounted = true;
    loadAppDataFromDb()
      .then((loaded) => {
        if (!mounted) return;
        setData(loaded);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setNotice("IndexedDB の初期化に失敗しました");
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channel.onmessage = async (event) => {
      const message = event.data;
      if (message?.type === "db-updated") {
        const latest = await loadAppDataFromDb();
        setData((current) => {
          if (!current) return latest;
          return latest.appMeta.revision > current.appMeta.revision ? latest : current;
        });
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4200);
    return () => clearTimeout(timer);
  }, [notice]);

  const sortedWorkTypes = useMemo(() => [...workTypes].sort((a, b) => a.sortOrder - b.sortOrder), [workTypes]);
  const activeWorkTypes = useMemo(() => sortedWorkTypes.filter((item) => item.isActive), [sortedWorkTypes]);
  const tasksById = useMemo(() => Object.fromEntries(tasks.map((task) => [task.id, task])), [tasks]);
  const workTypesById = useMemo(() => Object.fromEntries(workTypes.map((item) => [item.id, item])), [workTypes]);
  const activeTasks = useMemo(() => [...tasks].filter((task) => task.status === "active").sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [tasks]);

  useEffect(() => {
    if (!selectedTaskId && activeTasks[0]) setSelectedTaskId(activeTasks[0].id);
  }, [activeTasks, selectedTaskId]);

  useEffect(() => {
    if (!selectedWorkTypeId && activeWorkTypes[0]) setSelectedWorkTypeId(activeWorkTypes[0].id);
  }, [activeWorkTypes, selectedWorkTypeId]);

  useEffect(() => {
    if (!selectedStopTaskId && runningTimers[0]) setSelectedStopTaskId(runningTimers[0].taskId);
  }, [runningTimers, selectedStopTaskId]);

  const filteredStartTasks = useMemo(() => {
    if (!startSearch.trim()) return activeTasks;
    return activeTasks.filter((task) => task.title.toLowerCase().includes(startSearch.toLowerCase()));
  }, [activeTasks, startSearch]);

  const groupedTasks = useMemo(() => {
    const filtered = !taskListSearch.trim() ? tasks : tasks.filter((task) => task.title.toLowerCase().includes(taskListSearch.toLowerCase()));
    const sortFn = (a: Task, b: Task) => +new Date(b.createdAt) - +new Date(a.createdAt);
    return {
      active: filtered.filter((task) => task.status === "active").sort(sortFn),
      frozen: filtered.filter((task) => task.status === "frozen").sort(sortFn),
      completed: filtered.filter((task) => task.status === "completed").sort(sortFn),
      archived: filtered.filter((task) => task.status === "archived").sort(sortFn),
    };
  }, [tasks, taskListSearch]);

  const archivedTasks = useMemo(
    () =>
      [...tasks]
        .filter((task) => task.status === "archived")
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [tasks]
  );

  const todayRecordedMinutes = useMemo(() => {
    const today = nowIso();
    return timeLogs.filter((log) => isSameDay(log.endAt, today)).reduce((sum, log) => sum + log.durationMinutes, 0);
  }, [timeLogs]);

  const recentLogs = useMemo(() => [...timeLogs].sort((a, b) => +new Date(b.endAt) - +new Date(a.endAt)).slice(0, 5), [timeLogs]);
  const hasAnyUserData = useMemo(() => tasks.length > 0 || runningTimers.length > 0 || timeLogs.length > 0, [tasks, runningTimers, timeLogs]);
  const shouldShowBackupReminder = useMemo(() => {
    if (!hasAnyUserData) return false;
    if (isSameDay(appMeta.backupReminderDismissedAt, nowIso())) return false;
    return !appMeta.lastBackupAt || daysSince(appMeta.lastBackupAt) >= 14;
  }, [appMeta, hasAnyUserData]);

  const runningView = useMemo(
    () => runningTimers.map((timer) => ({ ...timer, task: tasksById[timer.taskId], workType: workTypesById[timer.workTypeId], elapsedMinutes: diffMinutes(timer.startAt, nowIso()) })),
    [runningTimers, tasksById, workTypesById]
  );

  const analysisByTask = useMemo(() => {
    const map = new Map<Id, number>();
    timeLogs.forEach((log) => map.set(log.taskId, (map.get(log.taskId) ?? 0) + log.durationMinutes));
    return [...map.entries()].map(([taskId, total]) => ({ taskId, title: tasksById[taskId]?.title ?? "不明", total })).sort((a, b) => b.total - a.total);
  }, [timeLogs, tasksById]);

  const analysisByWorkType = useMemo(() => {
    const map = new Map<Id, number>();
    timeLogs.forEach((log) => map.set(log.workTypeId, (map.get(log.workTypeId) ?? 0) + log.durationMinutes));
    return [...map.entries()].map(([workTypeId, total]) => ({ workTypeId, name: workTypesById[workTypeId]?.name ?? "不明", total })).sort((a, b) => b.total - a.total);
  }, [timeLogs, workTypesById]);

  const taskDetailTarget = useMemo(
    () => (taskDetailTaskId ? tasksById[taskDetailTaskId] : undefined),
    [taskDetailTaskId, tasksById]
  );

  const taskDetailLogs = useMemo(
    () =>
      [...timeLogs]
        .filter((log) => log.taskId === taskDetailTaskId)
        .sort((a, b) => +new Date(b.endAt) - +new Date(a.endAt)),
    [timeLogs, taskDetailTaskId]
  );

  const taskDetailTotalMinutes = useMemo(
    () => taskDetailLogs.reduce((sum, log) => sum + log.durationMinutes, 0),
    [taskDetailLogs]
  );

  const taskDetailByWorkType = useMemo(() => {
    const map = new Map<
      Id,
      { workTypeId: Id; name: string; total: number; count: number; lastAt: string }
    >();

    taskDetailLogs.forEach((log) => {
      const current = map.get(log.workTypeId);
      const name = workTypesById[log.workTypeId]?.name ?? "その他";

      if (current) {
        current.total += log.durationMinutes;
        current.count += 1;
        if (+new Date(log.endAt) > +new Date(current.lastAt)) {
          current.lastAt = log.endAt;
        }
      } else {
        map.set(log.workTypeId, {
          workTypeId: log.workTypeId,
          name,
          total: log.durationMinutes,
          count: 1,
          lastAt: log.endAt,
        });
      }
    });

    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [taskDetailLogs, workTypesById]);

  async function reloadLatest(showMessage?: string) {
    const latest = await loadAppDataFromDb();
    setData(latest);
    if (showMessage) setNotice(showMessage);
    return latest;
  }

  async function applyMutation(mutator: (draft: AppData) => AppData, successMessage?: string) {
    if (!data) return false;
    const latest = await loadAppDataFromDb();
    if (latest.appMeta.revision !== data.appMeta.revision) {
      setData(latest);
      setNotice("最新状態を読み込んだため、もう一度操作してください");
      return false;
    }
    const draft = deepClone(data);
    const next = mutator(draft);
    const result = await saveAppDataToDb(next, data.appMeta.revision);
    if (!result.ok) {
      await reloadLatest("保存前に他タブ更新を検知したため、最新状態を読み込みました");
      return false;
    }
    setData(result.data);
    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channel.postMessage({ type: "db-updated", revision: result.data.appMeta.revision });
    channel.close();
    if (successMessage) setNotice(successMessage);
    return true;
  }

  function openTaskDetail(taskId: Id) {
    setTaskDetailTaskId(taskId);
    setTaskDetailOpen(true);
  }

  function openTaskEdit(task: Task) {
    setTaskDraft(deepClone(task));
    setTaskEditOpen(true);
  }

  function openLogEdit(log: TimeLog) {
    setLogDraft(deepClone(log));
    setLogEditOpen(true);
  }

  async function saveNewTask() {
    const title = newTaskTitle.trim();
    if (!title) return setNotice("タスク名を入力してください");
    const duplicated = tasks.some((task) => task.title.trim() === title);
    if (duplicated && !window.confirm(`同名のタスク「${title}」がすでにあります。作成しますか？`)) {
      return;
    }
    const now = nowIso();
    const newTask: Task = {
      id: makeId(),
      title,
      status: "active",
      category: newTaskCategory.trim() || undefined,
      memo: newTaskMemo.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      statusChangedAt: now,
    };
    const ok = await applyMutation((draft) => ({ ...draft, tasks: [newTask, ...draft.tasks] }), "新しいタスクを追加しました");
    if (!ok) return;
    setSelectedTaskId(newTask.id);
    setNewTaskTitle("");
    setNewTaskCategory("");
    setNewTaskMemo("");
  }

  async function startTimer() {
    if (!selectedTaskId || !selectedWorkTypeId) return setNotice("制作物と作業項目を選んでください");
    const task = tasksById[selectedTaskId];
    const workType = workTypesById[selectedWorkTypeId];
    if (!task || task.status !== "active") return setNotice("進行中タスクのみ開始できます");
    if (!workType || !workType.isActive) return setNotice("有効な作業項目を選んでください");
    if (runningTimers.some((timer) => timer.taskId === selectedTaskId)) return setNotice("このタスクはすでに進行中です");

    const now = new Date();
    const offsets: Record<string, number> = { now: 0, m5: -5, m10: -10, m30: -30 };
    const startAt = new Date(now.getTime() + (offsets[startOffset] ?? 0) * 60_000).toISOString();
    const stamp = nowIso();
    const timer: RunningTimer = { id: makeId(), taskId: selectedTaskId, workTypeId: selectedWorkTypeId, startAt, startNote: startNote.trim() || undefined, createdAt: stamp, updatedAt: stamp };
    const ok = await applyMutation((draft) => ({
      ...draft,
      runningTimers: [timer, ...draft.runningTimers],
      tasks: draft.tasks.map((item) => (item.id === selectedTaskId ? { ...item, updatedAt: stamp } : item)),
    }), `${task.title} を開始しました`);
    if (!ok) return;
    setSelectedStopTaskId(selectedTaskId);
    setStartNote("");
    setTab("end");
  }

  async function stopTimer(taskId: Id, note?: string) {
    const timer = runningTimers.find((item) => item.taskId === taskId);
    if (!timer) return setNotice("進行中の作業が見つかりません");
    const endAt = nowIso();
    const log: TimeLog = { id: makeId(), taskId: timer.taskId, workTypeId: timer.workTypeId, startAt: timer.startAt, endAt, durationMinutes: diffMinutes(timer.startAt, endAt), startNote: timer.startNote, endNote: note?.trim() || undefined, source: "timer", createdAt: endAt, updatedAt: endAt };
    const ok = await applyMutation((draft) => ({
      ...draft,
      runningTimers: draft.runningTimers.filter((item) => item.id !== timer.id),
      timeLogs: [log, ...draft.timeLogs],
      tasks: draft.tasks.map((item) => (item.id === taskId ? { ...item, updatedAt: endAt } : item)),
    }), `${tasksById[taskId]?.title ?? "タスク"} の作業を終了しました`);
    if (!ok) return;
    setEndNote("");
    setSelectedStopTaskId("");
    setTab("home");
  }

  async function changeTaskStatus(taskId: Id, nextStatus: TaskStatus) {
    if (runningTimers.some((timer) => timer.taskId === taskId)) return setNotice("進行中作業があるので先に終了してください");
    const now = nowIso();
    await applyMutation((draft) => ({
      ...draft,
      tasks: draft.tasks.map((task) => task.id === taskId ? { ...task, status: nextStatus, statusChangedAt: now, updatedAt: now } : task),
    }), `状態を ${statusMeta[nextStatus].label} に変更しました`);
  }

  async function restoreArchivedTask(taskId: Id) {
    const now = nowIso();

    await applyMutation(
      (draft) => ({
        ...draft,
        tasks: draft.tasks.map((task) =>
          task.id === taskId
            ? { ...task, status: "active", updatedAt: now, statusChangedAt: now }
            : task
        ),
      }),
      "アーカイブから復元しました"
    );
  }

  async function saveTaskEdit() {
    if (!taskDraft) return;
    const title = taskDraft.title.trim();
    if (!title) return setNotice("タスク名を入力してください");
    const duplicated = tasks.some((task) => task.id !== taskDraft.id && task.title.trim() === title);
    if (duplicated && !window.confirm(`同名のタスク「${title}」がすでにあります。更新しますか？`)) return;
    const now = nowIso();
    const ok = await applyMutation((draft) => ({
      ...draft,
      tasks: draft.tasks.map((task) => task.id === taskDraft.id ? { ...taskDraft, title, category: taskDraft.category?.trim() || undefined, memo: taskDraft.memo?.trim() || undefined, updatedAt: now } : task),
    }), "タスクを更新しました");
    if (!ok) return;
    setTaskEditOpen(false);
    setTaskDraft(null);
  }

  async function addManualLog() {
    if (!manualTaskId || !manualWorkTypeId || !manualStartAt || !manualEndAt) return setNotice("手動ログの必須項目を入れてください");
    const startAt = fromLocalInputValue(manualStartAt);
    const endAt = fromLocalInputValue(manualEndAt);
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) return setNotice("終了は開始より後にしてください");
    const stamp = nowIso();
    const log: TimeLog = { id: makeId(), taskId: manualTaskId, workTypeId: manualWorkTypeId, startAt, endAt, durationMinutes: diffMinutes(startAt, endAt), endNote: manualNote.trim() || undefined, source: "manual", createdAt: stamp, updatedAt: stamp };
    const ok = await applyMutation((draft) => ({ ...draft, timeLogs: [log, ...draft.timeLogs] }), "手動ログを追加しました");
    if (!ok) return;
    setManualOpen(false);
    setManualTaskId("");
    setManualWorkTypeId("");
    setManualStartAt("");
    setManualEndAt("");
    setManualNote("");
  }

  async function saveLogEdit() {
    if (!logDraft) return;
    if (new Date(logDraft.endAt).getTime() <= new Date(logDraft.startAt).getTime()) return setNotice("終了は開始より後にしてください");
    const updated = { ...logDraft, durationMinutes: diffMinutes(logDraft.startAt, logDraft.endAt), updatedAt: nowIso() };
    const ok = await applyMutation((draft) => ({
      ...draft,
      timeLogs: draft.timeLogs.map((log) => log.id === updated.id ? updated : log),
    }), "ログを更新しました");
    if (!ok) return;
    setLogEditOpen(false);
    setLogDraft(null);
  }

  async function deleteLog(logId: Id) {
    if (!window.confirm("このログを削除しますか？")) return;
    await applyMutation((draft) => ({ ...draft, timeLogs: draft.timeLogs.filter((log) => log.id !== logId) }), "ログを削除しました");
  }

  async function addWorkType() {
    const name = newWorkTypeName.trim();
    if (!name) return setNotice("作業項目名を入力してください");
    if (workTypes.some((item) => item.name === name)) return setNotice("同名の作業項目があります");
    const stamp = nowIso();
    const workType: WorkType = {
      id: makeId(),
      name,
      sortOrder: getNextWorkTypeSortOrder(workTypes),
      isActive: true,
      createdAt: stamp,
      updatedAt: stamp,
    };
    const ok = await applyMutation((draft) => ({ ...draft, workTypes: [...draft.workTypes, workType] }), "作業項目を追加しました");
    if (!ok) return;
    setNewWorkTypeName("");
  }

  async function toggleWorkTypeActive(workTypeId: Id) {
    const stamp = nowIso();
    await applyMutation((draft) => ({
      ...draft,
      workTypes: draft.workTypes.map((item) => item.id === workTypeId ? { ...item, isActive: !item.isActive, updatedAt: stamp } : item),
    }), "作業項目を更新しました");
  }

  async function dismissOnboarding() {
    await applyMutation((draft) => ({ ...draft, appMeta: { ...draft.appMeta, onboardingSeenAt: nowIso() } }));
  }

  async function dismissBackupReminder() {
    await applyMutation((draft) => ({ ...draft, appMeta: { ...draft.appMeta, backupReminderDismissedAt: nowIso() } }));
  }

  async function exportBackup() {
    if (!data) return;
    const payload: BackupPayload = { appVersion: APP_VERSION, exportedAt: nowIso(), data: deepClone(data) };
    downloadText(`dtm-worklog-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json");
    await applyMutation((draft) => ({ ...draft, appMeta: { ...draft.appMeta, lastBackupAt: nowIso() } }), "バックアップを書き出しました");
  }

  function exportCsv() {
    const rows = [
      ["task", "workType", "startAt", "endAt", "durationMinutes", "note"],
      ...timeLogs.map((log) => [
        tasksById[log.taskId]?.title ?? "",
        workTypesById[log.workTypeId]?.name ?? "",
        log.startAt,
        log.endAt,
        String(log.durationMinutes),
        (log.endNote ?? log.startNote ?? "").replace(/\n/g, " "),
      ]),
    ];
    const text = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    downloadText(`dtm-worklog-logs-${new Date().toISOString().slice(0, 10)}.csv`, text, "text/csv");
    setNotice("CSVを書き出しました");
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayload;
      if (!parsed?.data?.tasks || !parsed?.data?.workTypes || !parsed?.data?.runningTimers || !parsed?.data?.timeLogs || !parsed?.data?.appMeta) {
        setNotice("バックアップファイルの形式が正しくありません");
        return;
      }
      if (!window.confirm("バックアップを読み込むと現在のデータをすべて置き換えます。続けますか？")) return;
      const imported = deepClone(parsed.data);
      imported.appMeta.id = APP_META_ID;
      imported.workTypes = ensureDefaultWorkTypes(imported.workTypes).workTypes;
      const result = await saveAppDataToDb(imported);
      if (!result.ok) return setNotice("バックアップの読み込みに失敗しました");
      setData(result.data);
      const channel = new BroadcastChannel(SYNC_CHANNEL);
      channel.postMessage({ type: "db-updated", revision: result.data.appMeta.revision });
      channel.close();
      setNotice("バックアップを復元しました");
    } catch {
      setNotice("バックアップの読み込みに失敗しました");
    }
  }

  async function resetAllData() {
    if (resetConfirmText !== "削除") {
      setNotice("確認テキストが一致しません");
      return;
    }

    const initial = buildEmptyAppData();
    const result = await saveAppDataToDb(initial);

    if (!result.ok) {
      setNotice("全データの削除に失敗しました");
      return;
    }

    setData(result.data);
    setResetConfirmText("");
    setResetDialogOpen(false);

    const channel = new BroadcastChannel(SYNC_CHANNEL);
    channel.postMessage({ type: "db-updated", revision: result.data.appMeta.revision });
    channel.close();

    setNotice("全データを削除しました");
  }


  if (loading || !data) {
    return <div className="p-10 text-slate-700">起動準備中...</div>;
  }

  return (

    <div className="min-h-screen p-6 text-slate-900">

      <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm">
              <Music4 className="h-4 w-4" /> DTM Worklog Prototype
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">DTM作業時間管理ツール</h1>
            <p className="mt-2 text-sm text-slate-600">各PRJの時間管理にご利用ください。データはブラウザ内にのみ保存されます。</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="今日の記録時間" value={formatMinutes(todayRecordedMinutes)} accent="text-[color:var(--accent-primary)]" emphasize />
            <StatCard label="作業中" value={`${runningTimers.length}件`} accent="text-[color:var(--accent-teal)]" />
            <StatCard label="進行中タスク" value={`${groupedTasks.active.length}件`} accent="text-[color:var(--accent-secondary)]" />
            <StatCard label="最終バックアップ" value={appMeta.lastBackupAt ? formatDateTime(appMeta.lastBackupAt) : "未実施"} accent="text-[color:var(--text-default)]" />
          </div>
        </motion.div>

        {!appMeta.onboardingSeenAt && (
          <Card className="mb-4 rounded-[24px] border border-white/45 bg-white/52 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-tight text-[color:var(--text-strong)]">
                  初回案内
                </div>
                <div className="mt-1 text-sm leading-7 text-[color:var(--text-default)]">
                  このアプリのデータはこのブラウザ内に保存されます。入力されたデータは一切オンライン上にアップされません。別のブラウザや別PCでは引き継がれないので、定期的なバックアップを推奨しています。
                </div>
              </div>

              <div className="shrink-0 pt-1 md:pt-2">
                <Button
                  className="rounded-full"
                  onClick={dismissOnboarding}
                >
                  了解
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {shouldShowBackupReminder && (
          <Card className="mb-4 rounded-[24px] border border-white/45 bg-white/52 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-tight text-[color:var(--text-strong)]">
                  バックアップ推奨
                </div>
                <div className="mt-1 text-sm leading-7 text-[color:var(--text-default)]">
                  最後のバックアップから2週間以上経っています。バックアップをしておくと安心です。
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 pt-1 md:pt-2">
                <Button onClick={exportBackup}>
                  <Download className="mr-2 h-4 w-4" />
                  今すぐバックアップ
                </Button>
                <Button variant="outline" className="rounded-full" onClick={dismissBackupReminder}>
                  あとで
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {notice && (
          <Card className="mb-4 rounded-[22px] border border-white/45 bg-white/52 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
            <CardContent className="flex min-h-[56px] items-center px-5 py-1 text-sm leading-6 text-[color:var(--accent-success)]">
              <div className="max-w-4xl">{notice}</div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
          <Card className="h-fit rounded-[28px] border border-white/45 bg-white/46 text-slate-900 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
            <CardContent className="p-4">
              <div className="mb-1 flex items-center gap-2 text-sm text-slate-500"><Sparkles className="h-4 w-4 text-violet-400" /> メニュー</div>
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0">
                  {[
                    ["home", <Activity className="mr-2 h-4 w-4" />, "ホーム"],
                    ["start", <Play className="mr-2 h-4 w-4" />, "開始画面"],
                    ["end", <Square className="mr-2 h-4 w-4" />, "終了画面"],
                    ["tasks", <FolderOpen className="mr-2 h-4 w-4" />, "タスク一覧"],
                    ["analysis", <BarChart3 className="mr-2 h-4 w-4" />, "分析画面"],
                    ["settings", <Settings2 className="mr-2 h-4 w-4" />, "設定"],
                  ].map(([value, icon, label]) => (
                    <TabsTrigger key={String(value)} value={String(value)} className="justify-start rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-600 data-[state=active]:border-violet-200 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">
                      {icon}{label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="mt-6 rounded-[24px] border border-violet-100 bg-violet-50/60 p-4 text-sm text-slate-600">
                <div className="mb-2 font-medium text-slate-900">バージョン0.9 追加項目</div>
                <ul className="space-y-2 leading-6">
                  <li>・IndexedDB 保存</li>
                  <li>・保存前に最新状態を確認</li>
                  <li>・タスク編集 / ログ編集 / ログ削除</li>
                  <li>・JSON バックアップ / 復元</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {tab === "home" && (
              <>
                <Card className="overflow-hidden rounded-[30px] border border-white/45 bg-white/55 shadow-[0_10px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                  <div className="h-4 bg-gradient-to-r from-rose-200 via-violet-200 to-sky-200" />
                  <CardContent className="flex flex-col gap-6 p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <div className="text-2xl font-bold">ホーム</div>
                        <div className="mt-1 text-sm text-slate-500">この画面ではタスクの開始・終了・確認が行えます。</div>
                      </div>
                      <div className="flex items-center gap-3 pt-1 md:pt-2">
                        <Button className="h-12 rounded-full border border-violet-300/40 bg-violet-500/85 px-6 text-white shadow-[0_10px_26px_rgba(124,58,237,0.22)] backdrop-blur-md hover:bg-violet-500/95" onClick={() => setTab("start")}>
                          <Play className="mr-2 h-4 w-4" />
                          作業を始める
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 rounded-full border-violet-100 bg-white/90 px-5 text-violet-700 hover:bg-violet-50"
                          onClick={() => setTab("end")}
                        >
                          <Square className="mr-2 h-4 w-4" />
                          作業を終える
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <Card className="rounded-[30px] border border-white/45 bg-white/46 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
                    <CardHeader>
                      <SectionTitle icon={<Clock3 className="h-5 w-5" />} title="作業中のタスク" sub="現在作業しているタスクは下記のとおり" />
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      {runningView.length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">進行中の作業はありません。</div>
                      ) : runningView.map((item, index) => (
                        <div key={item.id} className={`rounded-[26px] border p-4 ${index % 2 === 0 ? "border-pink-100 bg-pink-50/70" : "border-sky-100 bg-sky-50/70"}`}>
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-semibold">{item.task?.title}</div>
                                <Badge className={`rounded-full border backdrop-blur-[16px] ${(workTypeToneStyles[item.workType?.name ?? "その他"] ?? workTypeToneStyles["その他"]).chip}`}>{item.workType?.name}</Badge>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                                <span>開始 {formatDateTime(item.startAt)}</span>
                                <span>経過 {formatMinutes(item.elapsedMinutes)}</span>
                              </div>
                              {item.startNote ? <div className="mt-3 rounded-2xl bg-white/90 px-3 py-2 text-sm text-slate-600 ring-1 ring-white/80">メモ: {item.startNote}</div> : null}
                            </div>
                            <Button
                              variant="outline"
                              className="rounded-full border-violet-100 bg-white text-violet-700 shadow-sm hover:bg-violet-50"
                              onClick={() => stopTimer(item.taskId)}
                            >
                              この作業を終える
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="grid gap-6">
                    <Card className="rounded-[30px] border border-white/45 bg-white/46 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
                      <CardHeader>
                        <SectionTitle icon={<FolderOpen className="h-5 w-5" />} title="進行中タスクを再開する" sub="凍結タスクは表示されません" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {activeTasks.length === 0 ? (
                          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">進行中タスクはまだありません。タスク一覧で追加してください。</div>
                        ) : activeTasks.slice(0, 4).map((task, index) => (
                          <div
                            key={task.id}
                            className={`flex items-center justify-between rounded-[22px] border p-3 backdrop-blur-[18px] ${index % 2 === 0
                              ? "border-white/55 bg-[rgba(238,240,241,0.26)]"
                              : "border-white/55 bg-[rgba(214,223,233,0.26)]"
                              }`}
                          >
                            <div>
                              <div className="font-medium">{task.title}</div>
                              <div className="text-sm text-slate-500">{task.category} ・ 作成 {formatDateTime(task.createdAt)}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" className="rounded-full text-violet-700 hover:bg-white/80" onClick={() => { setSelectedTaskId(task.id); setTab("start"); }}>開始へ</Button>
                              <Button variant="ghost" className="rounded-full text-slate-700 hover:bg-white/80" onClick={() => openTaskEdit(task)}><FileEdit className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="rounded-[30px] border border-emerald-100 bg-white/85 shadow-sm">
                      <CardHeader>
                        <SectionTitle icon={<FileText className="h-5 w-5" />} title="直近ログ" sub="こちらから時刻修正もできます" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {recentLogs.length === 0 ? (
                          <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">まだログはありません。</div>
                        ) : recentLogs.map((log, index) => (
                          <div key={log.id} className="rounded-[22px] border border-white/55 bg-white/40 p-3 backdrop-blur-[18px]">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{tasksById[log.taskId]?.title}</div>
                                <div className="text-sm text-slate-500">{workTypesById[log.workTypeId]?.name} ・ {formatMinutes(log.durationMinutes)}</div>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" className="rounded-full text-slate-700 hover:bg-white/80" onClick={() => openLogEdit(log)}><FileEdit className="h-4 w-4" /></Button>
                                <Button variant="ghost" className="rounded-full text-rose-700 hover:bg-white/80" onClick={() => deleteLog(log.id)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                            {(log.endNote || log.startNote) ? <div className="mt-2 text-sm text-slate-600">{log.endNote || log.startNote}</div> : null}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}

            {tab === "start" && (
              <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <Card className="overflow-hidden rounded-[30px] border border-white/45 bg-white/52 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
                  <CardHeader>
                    <CardTitle className="text-2xl">作業を始める</CardTitle>
                    <div className="text-sm text-slate-500">進行中の制作物から選んで、上から順に決めれば始められます。</div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium">1. 制作物を選ぶ</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-violet-400" />
                        <Input value={startSearch} onChange={(e) => setStartSearch(e.target.value)} placeholder="進行中の制作物名で検索" className="h-12 rounded-full border-violet-100 bg-white pl-10" />
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {filteredStartTasks.map((task, index) => {
                          const active = selectedTaskId === task.id;
                          const tone = getTaskSelectionTone(index);

                          return (
                            <button
                              key={task.id}
                              onClick={() => setSelectedTaskId(task.id)}
                              className={`rounded-[22px] border px-4 py-4 text-left transition-all backdrop-blur-[16px] hover:-translate-y-[1px] ${active ? tone.active : tone.idle
                                }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold leading-6 text-[color:var(--text-strong)]">
                                    {task.title}
                                  </div>
                                  <div className="mt-1 text-sm text-[color:var(--text-muted)]">
                                    {task.category ? `${task.category} ・ ` : ""}
                                    {task.memo ?? "メモなし"}
                                  </div>
                                </div>

                                {active ? (
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 rounded-[24px] border border-dashed border-violet-200 bg-violet-50/50 p-4 text-sm text-violet-500">新しいタスクは「タスク一覧」画面で追加できます。</div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="block text-sm font-medium">2. 作業項目を選ぶ</label>
                        <Badge className="rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-xs font-semibold text-violet-700">
                          選択中: {workTypesById[selectedWorkTypeId]?.name ?? "未選択"}
                        </Badge>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {activeWorkTypes.map((option) => {
                          const active = selectedWorkTypeId === option.id;
                          const tone = workTypeToneStyles[option.name] ?? workTypeToneStyles["その他"];

                          return (
                            <button
                              key={option.id}
                              onClick={() => setSelectedWorkTypeId(option.id)}
                              className={`rounded-[18px] border px-4 py-3 text-left transition-all min-h-[64px] backdrop-blur-[16px] ${active ? tone.cardActive : tone.card
                                }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-base font-semibold leading-5">{option.name}</div>
                                {active ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>


                    <div>
                      <label className="mb-2 block text-sm font-medium">3. メモ（任意）</label>
                      <Textarea value={startNote} onChange={(e) => setStartNote(e.target.value)} placeholder="何をやるか一言メモ（任意）" className="min-h-[96px] rounded-[24px] border-violet-100 bg-white" />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">4. 開始時刻</label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          ["now", "今から開始"],
                          ["m5", "5分前"],
                          ["m10", "10分前"],
                          ["m30", "30分前"],
                        ].map(([value, label]) => {
                          const active = startOffset === value;

                          return (
                            <button
                              key={String(value)}
                              onClick={() => setStartOffset(String(value))}
                              className={`rounded-full px-4 py-2 text-sm font-medium transition ${active
                                ? "border border-[rgba(78,115,171,0.16)] bg-[rgba(200,217,236,0.52)] text-[color:var(--accent-teal)] shadow-[0_8px_20px_rgba(56,59,62,0.06)] backdrop-blur-[16px]"
                                : "border border-white/70 bg-white/42 text-[color:var(--text-default)] hover:bg-white/58 backdrop-blur-[16px]"
                                }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button className="h-12 rounded-full bg-violet-600 px-8 text-white shadow-sm hover:bg-violet-700" onClick={startTimer}><Play className="mr-2 h-4 w-4" />作業を始める</Button>
                      <Button
                        variant="outline"
                        className="h-12 rounded-full border-violet-200 text-violet-700"
                        onClick={() => setManualOpen(true)}
                      >
                        手動ログ追加
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[30px] border border-violet-100 bg-white/80 shadow-sm">
                  <CardHeader>
                    <SectionTitle icon={<CheckCircle2 className="h-5 w-5" />} title="開始画面について" sub="使い方や表示のルールを記載しています" />
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-600">
                    <div className="rounded-[24px] border border-pink-100 bg-pink-50/80 p-4">進行中タスクのみが表示されます。凍結や完了は表示されません。</div>
                    <div className="rounded-[24px] border border-sky-100 bg-sky-50/80 p-4">制作物を選択→作業項目を選択→必要であればメモを記載→開始時刻を選択→作業を始めるをクリック</div>
                    <div className="rounded-[24px] border border-violet-100 bg-white p-4">
                      <div className="text-sm font-semibold tracking-tight text-slate-900">今の選択内容</div>
                      <div className="mt-2 space-y-1">
                        <div>制作物: <span className="font-medium">{tasksById[selectedTaskId]?.title ?? "未選択"}</span></div>
                        <div>作業項目: <span className="font-medium">{workTypesById[selectedWorkTypeId]?.name ?? "未選択"}</span></div>
                        <div>開始メモ: <span className="font-medium">{startNote || "未入力"}</span></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "end" && (
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <Card className="rounded-[30px] border border-sky-100 bg-white/85 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl">作業を終える</CardTitle>
                    <div className="text-sm text-slate-500">進行中一覧から終えたい制作物を選んで止めます。</div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium">1. 終了する制作物を選ぶ</label>
                      <div className="grid gap-3">
                        {runningView.length === 0 ? (
                          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">進行中の作業がありません。</div>
                        ) : runningView.map((item, index) => {
                          const active = selectedStopTaskId === item.taskId;
                          return (
                            <button key={item.id} onClick={() => setSelectedStopTaskId(item.taskId)} className={`rounded-[24px] border p-4 text-left transition ${active ? "border-violet-300 bg-violet-100 text-violet-900 shadow-sm ring-2 ring-violet-200" : index % 2 === 0 ? "border-sky-100 bg-sky-50/70 hover:border-sky-200" : "border-pink-100 bg-pink-50/70 hover:border-pink-200"}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold">{item.task?.title}</div>
                                  <div className="mt-1 text-sm text-slate-500">{item.workType?.name} ・ 開始 {formatDateTime(item.startAt)} ・ 経過 {formatMinutes(item.elapsedMinutes)}</div>
                                </div>
                                <Badge className={`rounded-full border ${active ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-white text-slate-700 border-slate-200"}`}>進行中</Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">2. メモを追記（任意）</label>
                      <Textarea value={endNote} onChange={(e) => setEndNote(e.target.value)} placeholder="今日ここまでで何をしたか一言残す（任意）" className="min-h-[96px] rounded-[24px] border-sky-100 bg-white" />
                    </div>
                    <Button
                      variant="outline"
                      className="h-12 rounded-full border-violet-200 bg-white px-8 text-violet-700 shadow-sm hover:bg-violet-50"
                      onClick={() => stopTimer(selectedStopTaskId, endNote)}
                    >
                      <Square className="mr-2 h-4 w-4" />
                      この作業を終える
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-[30px] border border-white/45 bg-white/46 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
                  <CardHeader>
                    <SectionTitle icon={<PauseCircle className="h-5 w-5" />} title="終了画面について" sub="並列進行でも迷わず止められる" />
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-600">
                    <div className="rounded-[24px] border border-white/55 bg-pink-50/35 p-4 backdrop-blur-[18px]">終了時に作業項目を再入力させず、止める対象だけ選べば終われるようにしています。</div>
                    <div className="rounded-[24px] border border-white/55 bg-sky-50/35 p-4 backdrop-blur-[18px]">複数タスク進行中でも、進行中だけを並べることで終了対象が分かりやすくなります。</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "tasks" && (
              <div className="grid gap-6">
                <Card className="rounded-[30px] border border-white/45 bg-white/46 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
                  <CardHeader>
                    <CardTitle className="text-2xl">タスク一覧</CardTitle>
                    <div className="text-sm text-slate-500">進行中 → 凍結 → 完了 の順で表示し、各セクション内は新しい作成順で並べています。</div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-[24px] border border-violet-100 bg-violet-50/50 p-4">
                      <div className="mb-3 text-sm font-medium text-slate-900">新しいタスクを追加</div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="新しい楽曲名" className="rounded-full bg-white" />
                        <Input value={newTaskCategory} onChange={(e) => setNewTaskCategory(e.target.value)} placeholder="カテゴリ（任意）" className="rounded-full bg-white" />
                        <Input value={newTaskMemo} onChange={(e) => setNewTaskMemo(e.target.value)} placeholder="メモ（任意）" className="rounded-full bg-white" />
                      </div>
                      <div className="mt-3 flex justify-end"><Button className="rounded-full bg-violet-600 text-white hover:bg-violet-700" onClick={saveNewTask}><Plus className="mr-2 h-4 w-4" />追加</Button></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={taskListSearch}
                          onChange={(e) => setTaskListSearch(e.target.value)}
                          placeholder="タスク名で検索"
                          className="rounded-full pl-10"
                        />
                      </div>

                      <Button
                        variant="outline"
                        className="shrink-0 rounded-full"
                        onClick={() => setArchiveDialogOpen(true)}
                      >
                        アーカイブしたタスクを開く
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                      <Badge className="rounded-full border border-violet-200 bg-violet-50 text-violet-700">進行中 {groupedTasks.active.length}</Badge>
                      <Badge className="rounded-full border border-sky-200 bg-sky-50 text-sky-700">凍結 {groupedTasks.frozen.length}</Badge>
                      <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">完了 {groupedTasks.completed.length}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {(["active", "frozen", "completed"] as TaskStatus[]).map((status) => (
                  <Card className="rounded-[30px] border border-white/45 bg-white/46 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
                    <CardHeader>
                      <SectionTitle icon={status === "active" ? <Activity className="h-5 w-5" /> : status === "frozen" ? <PauseCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />} title={statusMeta[status].label} sub={status === "active" ? "今すすめている制作物" : status === "frozen" ? "再開未定で寝かせている制作物" : "完成した制作物"} />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {groupedTasks[status].length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">この状態のタスクはありません。</div>
                      ) : groupedTasks[status].map((task) => (
                        <div key={task.id} className={`rounded-[24px] border p-4 ${statusMeta[status].sectionClass}`}>
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-lg font-semibold">{task.title}</div>
                                <Badge className={`rounded-full border ${statusMeta[status].badgeClass}`}>{statusMeta[status].label}</Badge>
                              </div>
                              <div className="mt-2 text-sm text-slate-500">{task.category} ・ 作成 {formatDateTime(task.createdAt)} ・ 最終更新 {formatDateTime(task.updatedAt)}</div>
                              {task.memo ? <div className="mt-2 text-sm text-slate-600">{task.memo}</div> : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => openTaskEdit(task)}><FileEdit className="mr-2 h-4 w-4" />編集</Button>
                              {status === "active" && (
                                <>
                                  <Button variant="outline" className="rounded-full border-sky-200 bg-white text-sky-700 hover:bg-sky-50" onClick={() => changeTaskStatus(task.id, "frozen")}><PauseCircle className="mr-2 h-4 w-4" />凍結</Button>
                                  <Button variant="outline" className="rounded-full border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50" onClick={() => changeTaskStatus(task.id, "completed")}><CheckCircle2 className="mr-2 h-4 w-4" />完了</Button>
                                  <Button variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => changeTaskStatus(task.id, "archived")}><Archive className="mr-2 h-4 w-4" />アーカイブ</Button>
                                </>
                              )}
                              {status !== "active" && (
                                <>
                                  <Button variant="outline" className="rounded-full border-violet-200 bg-white text-violet-700 hover:bg-violet-50" onClick={() => changeTaskStatus(task.id, "active")}><Undo2 className="mr-2 h-4 w-4" />再開</Button>
                                  <Button variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => changeTaskStatus(task.id, "archived")}><Archive className="mr-2 h-4 w-4" />アーカイブ</Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}


              </div>
            )}

            {tab === "analysis" && (
              <div className="grid gap-6">
                <Card className="rounded-[30px] border border-white/45 bg-white/46 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
                  <CardHeader>
                    <CardTitle className="text-2xl">分析画面</CardTitle>
                    <div className="text-sm text-slate-500">ここでは実時間ではなく、記録時間（ログ合計）として扱います。</div>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-3">
                    <Card className="rounded-[24px] border border-pink-100 bg-pink-50/80 shadow-none"><CardContent className="p-4"><div className="text-sm text-slate-500">総記録時間</div><div className="mt-1 text-lg font-semibold">{formatMinutes(timeLogs.reduce((sum, log) => sum + log.durationMinutes, 0))}</div></CardContent></Card>
                    <Card className="rounded-[24px] border border-violet-100 bg-violet-50/80 shadow-none"><CardContent className="p-4"><div className="text-sm text-slate-500">ログ件数</div><div className="mt-1 text-lg font-semibold">{timeLogs.length}件</div></CardContent></Card>
                    <Card className="rounded-[24px] border border-sky-100 bg-sky-50/80 shadow-none"><CardContent className="p-4"><div className="text-sm text-slate-500">作業中</div><div className="mt-1 text-lg font-semibold">{runningTimers.length}件</div></CardContent></Card>
                  </CardContent>
                </Card>

                <div className="grid gap-6 xl:grid-cols-2">
                  <Card className="rounded-[30px] border border-white/45 bg-white/46 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
                    <CardHeader><SectionTitle icon={<BarChart3 className="h-5 w-5" />} title="制作物ごとの時間" /></CardHeader>
                    <CardContent className="space-y-4">
                      {analysisByTask.length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                          まだ分析できるログがありません。
                        </div>
                      ) : analysisByTask.map((row, index) => {
                        const tone = getTaskSelectionTone(index);

                        return (
                          <div
                            key={row.taskId}
                            className={`rounded-[24px] border p-4 backdrop-blur-[18px] ${tone.idle}`}
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium text-[color:var(--text-strong)]">{row.title}</div>
                                <div className="text-sm text-[color:var(--text-muted)]">
                                  合計 {formatMinutes(row.total)}
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => openTaskDetail(row.taskId)}
                              >
                                詳細
                              </Button>
                            </div>

                            <Bar value={row.total} max={analysisByTask[0]?.total ?? 1} />
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  <Card className="rounded-[30px] border border-white/45 bg-white/46 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
                    <CardHeader><SectionTitle icon={<BarChart3 className="h-5 w-5" />} title="作業項目ごとの時間" /></CardHeader>
                    <CardContent className="space-y-4">
                      {analysisByWorkType.length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                          まだ分析できるログがありません。
                        </div>
                      ) : analysisByWorkType.map((row) => {
                        const tone = workTypeToneStyles[row.name] ?? workTypeToneStyles["その他"];

                        return (
                          <div
                            key={row.workTypeId}
                            className={`rounded-[24px] border p-4 backdrop-blur-[18px] ${tone.settingsRow}`}
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <Badge className={`rounded-full border backdrop-blur-[16px] ${tone.chip}`}>
                                {row.name}
                              </Badge>
                              <div className="text-sm font-medium text-[color:var(--text-default)]">
                                {formatMinutes(row.total)}
                              </div>
                            </div>
                            <Bar value={row.total} max={analysisByWorkType[0]?.total ?? 1} />
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-[30px] border border-white/45 bg-white/46 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
                  <CardHeader>
                    <SectionTitle icon={<FileText className="h-5 w-5" />} title="ログ一覧" sub="ログ編集・削除ができる" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="rounded-full border-violet-200 text-violet-700" onClick={() => setManualOpen(true)}><Plus className="mr-2 h-4 w-4" />手動ログ追加</Button>
                      <Button variant="outline" className="rounded-full border-violet-200 text-violet-700" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />CSV出力</Button>
                    </div>
                    <ScrollArea className="h-[360px] rounded-[24px] border border-slate-100">
                      <div className="space-y-3 p-4">
                        {timeLogs.length === 0 ? (
                          <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                            まだログがありません。
                          </div>
                        ) : [...timeLogs].sort((a, b) => +new Date(b.endAt) - +new Date(a.endAt)).map((log) => {
                          const workTypeName = workTypesById[log.workTypeId]?.name ?? "その他";
                          const tone = workTypeToneStyles[workTypeName] ?? workTypeToneStyles["その他"];

                          return (
                            <div
                              key={log.id}
                              className={`rounded-[20px] border p-3 backdrop-blur-[18px] ${tone.settingsRow}`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="font-medium">{tasksById[log.taskId]?.title}</div>
                                  <div className="text-sm text-slate-500">
                                    {formatDateTime(log.startAt)} - {formatDateTime(log.endAt)} ・ {formatMinutes(log.durationMinutes)}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Badge className={`rounded-full border backdrop-blur-[16px] ${tone.chip}`}>
                                    {workTypeName}
                                  </Badge>
                                  <Button variant="ghost" className="rounded-full text-slate-700 hover:bg-white/80" onClick={() => openLogEdit(log)}>
                                    <FileEdit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" className="rounded-full text-rose-700 hover:bg-white/80" onClick={() => deleteLog(log.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              {(log.endNote || log.startNote) ? (
                                <div className="mt-2 text-sm text-slate-600">{log.endNote || log.startNote}</div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "settings" && (
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <Card className="rounded-[30px] border border-white/45 bg-white/46 shadow-[0_12px_34px_rgba(56,59,62,0.08)] backdrop-blur-[22px]">
                  <CardHeader>
                    <CardTitle className="text-2xl">作業項目の設定</CardTitle>
                    <div className="text-sm text-slate-500">項目の削除はできません（不要な場合は無効化）。</div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sortedWorkTypes.map((option, index) => {
                      const tone = workTypeToneStyles[option.name] ?? workTypeToneStyles["その他"];

                      return (
                        <div
                          key={option.id}
                          className={`flex items-center justify-between rounded-[22px] border p-3 backdrop-blur-[18px] ${tone.settingsRow}`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium shadow-sm ${tone.settingsIndex}`}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-[color:var(--text-strong)]">{option.name}</div>
                              <div className="text-sm text-[color:var(--text-muted)]">
                                {option.isActive ? "開始画面で選択可能" : "無効化中（過去ログには残る）"}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            className={`rounded-full ${tone.settingsAction}`}
                            onClick={() => toggleWorkTypeActive(option.id)}
                          >
                            {option.isActive ? "無効化" : "再有効化"}
                          </Button>
                        </div>
                      );
                    })}
                    <div className="rounded-[24px] border border-violet-100 bg-violet-50/50 p-4">
                      <div className="mb-3 text-sm font-medium">新しい作業項目を追加</div>
                      <div className="flex gap-3">
                        <Input value={newWorkTypeName} onChange={(e) => setNewWorkTypeName(e.target.value)} placeholder="例: 書き出し確認" className="rounded-full" />
                        <Button className="rounded-full bg-violet-600 text-white hover:bg-violet-700" onClick={addWorkType}><Plus className="mr-2 h-4 w-4" />追加</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[30px] border border-violet-100 bg-violet-50/70 text-slate-900 shadow-sm">
                  <CardHeader>
                    <SectionTitle icon={<Settings2 className="h-5 w-5" />} title="アプリデータの管理" sub="ブラウザ内に保存されたデータをバックアップ/復元できます" />
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
                    <div className="rounded-[24px] border border-white/55 bg-white/42 p-4 backdrop-blur-[18px]">
                      <div className="mb-2 font-medium text-slate-900">最終バックアップ</div>
                      <div className="mb-3 text-sm text-slate-500">{appMeta.lastBackupAt ? formatDateTime(appMeta.lastBackupAt) : "まだバックアップしていません"}</div>
                      <Button className="rounded-full bg-violet-600 text-white hover:bg-violet-700" onClick={exportBackup}><Download className="mr-2 h-4 w-4" />JSONを書き出す</Button>
                    </div>
                    <div className="rounded-[24px] border border-white/55 bg-white/42 p-4 backdrop-blur-[18px]">
                      <div className="mb-2 font-medium text-slate-900">バックアップを復元</div>
                      <div className="mb-3 text-sm text-slate-500">復元は現在のデータを丸ごと置き換えます。読み込む前に現在のバックアップを書き出しておくのがおすすめです。</div>
                      <Button variant="outline" className="rounded-full border-violet-200 text-violet-700" onClick={() => importInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />JSONを読み込む</Button>
                    </div>
                    <div className="rounded-[24px] border border-white/55 bg-white/42 p-4 backdrop-blur-[18px]">
                      <div className="mb-2 font-medium text-slate-900">CSV出力</div>
                      <div className="mb-3 text-sm text-slate-500">記録時間の一覧をスプレッドシートで見たいとき用です。</div>
                      <Button variant="outline" className="rounded-full border-violet-200 text-violet-700" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />ログCSVを書き出す</Button>
                    </div>
                    <div className="rounded-[24px] border border-white/55 bg-[rgba(207,60,131,0.06)] p-4 backdrop-blur-[18px]">
                      <div className="mb-2 font-medium text-slate-900">全データを削除</div>
                      <div className="mb-3 text-sm text-slate-500">
                        このアプリの情報をブラウザ内から削除し初期化します。実行には確認ダイアログで「削除」と入力する必要があります。
                      </div>
                      <Button
                        variant="outline"
                        className="rounded-full border-[rgba(207,60,131,0.18)] bg-[rgba(255,255,255,0.56)] text-[color:var(--accent-highlight)] hover:bg-[rgba(207,60,131,0.10)]"
                        onClick={() => setResetDialogOpen(true)}
                      >
                        全データを削除
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <Dialog open={taskEditOpen} onOpenChange={setTaskEditOpen}>
        <DialogContent className="max-w-xl rounded-[28px]">
          <DialogHeader><DialogTitle>タスクを編集</DialogTitle></DialogHeader>
          {taskDraft && (
            <div className="grid gap-4">
              <Input value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} placeholder="タスク名" className="rounded-2xl" />
              <Input value={taskDraft.category ?? ""} onChange={(e) => setTaskDraft({ ...taskDraft, category: e.target.value })} placeholder="カテゴリ（任意）" className="rounded-2xl" />
              <Textarea value={taskDraft.memo ?? ""} onChange={(e) => setTaskDraft({ ...taskDraft, memo: e.target.value })} placeholder="メモ（任意）" className="rounded-2xl" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setTaskEditOpen(false)}>閉じる</Button>
                <Button className="rounded-full bg-violet-600 text-white hover:bg-violet-700" onClick={saveTaskEdit}>保存</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={taskDetailOpen}
        onOpenChange={(open) => {
          setTaskDetailOpen(open);
          if (!open) setTaskDetailTaskId("");
        }}
      >
        <DialogContent className="max-w-2xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle>
              {taskDetailTarget ? `${taskDetailTarget.title} の内訳` : "タスク詳細"}
            </DialogTitle>
          </DialogHeader>

          {taskDetailTarget ? (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="rounded-[22px] border border-white/45 bg-white/52 shadow-none backdrop-blur-[18px]">
                  <CardContent className="p-4">
                    <div className="text-sm text-[color:var(--text-muted)]">総記録時間</div>
                    <div className="mt-1 text-lg font-semibold text-[color:var(--accent-primary)]">
                      {formatMinutes(taskDetailTotalMinutes)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[22px] border border-white/45 bg-white/52 shadow-none backdrop-blur-[18px]">
                  <CardContent className="p-4">
                    <div className="text-sm text-[color:var(--text-muted)]">ログ件数</div>
                    <div className="mt-1 text-lg font-semibold text-[color:var(--accent-teal)]">
                      {taskDetailLogs.length}件
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[22px] border border-white/45 bg-white/52 shadow-none backdrop-blur-[18px]">
                  <CardContent className="p-4">
                    <div className="text-sm text-[color:var(--text-muted)]">最終記録</div>
                    <div className="mt-1 text-lg font-semibold text-[color:var(--text-default)]">
                      {taskDetailLogs[0] ? formatDateTime(taskDetailLogs[0].endAt) : "-"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3">
                {taskDetailByWorkType.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    内訳にできるログがありません。
                  </div>
                ) : (
                  taskDetailByWorkType.map((row) => {
                    const tone =
                      workTypeToneStyles[row.name] ?? workTypeToneStyles["その他"];

                    return (
                      <div
                        key={row.workTypeId}
                        className={`rounded-[22px] border p-4 backdrop-blur-[18px] ${tone.settingsRow}`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Badge className={`rounded-full border backdrop-blur-[16px] ${tone.chip}`}>
                              {row.name}
                            </Badge>
                            <div className="text-sm text-[color:var(--text-muted)]">
                              {row.count}件
                            </div>
                          </div>

                          <div className="text-sm font-medium text-[color:var(--text-default)]">
                            {formatMinutes(row.total)}
                          </div>
                        </div>

                        <Bar
                          value={row.total}
                          max={taskDetailByWorkType[0]?.total ?? 1}
                        />

                        <div className="mt-2 text-xs text-[color:var(--text-muted)]">
                          最終記録: {formatDateTime(row.lastAt)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle>手動でログを追加</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <select
              className="rounded-2xl border border-slate-200 px-3 py-3"
              value={manualTaskId}
              onChange={(e) => setManualTaskId(e.target.value)}
            >
              <option value="">制作物を選ぶ</option>
              {tasks
                .filter((task) => task.status !== "archived")
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
            </select>

            <select
              className="rounded-2xl border border-slate-200 px-3 py-3"
              value={manualWorkTypeId}
              onChange={(e) => setManualWorkTypeId(e.target.value)}
            >
              <option value="">作業項目を選ぶ</option>
              {activeWorkTypes.map((workType) => (
                <option key={workType.id} value={workType.id}>
                  {workType.name}
                </option>
              ))}
            </select>

            <Input
              type="datetime-local"
              value={manualStartAt}
              onChange={(e) => setManualStartAt(e.target.value)}
              className="rounded-2xl"
            />

            <Input
              type="datetime-local"
              value={manualEndAt}
              onChange={(e) => setManualEndAt(e.target.value)}
              className="rounded-2xl"
            />

            <Textarea
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder="補足メモ（任意）"
              className="rounded-2xl"
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setManualOpen(false)}
              >
                閉じる
              </Button>
              <Button
                className="rounded-full bg-violet-600 text-white hover:bg-violet-700"
                onClick={addManualLog}
              >
                手動ログを保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle>アーカイブ済みタスク</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            {archivedTasks.length === 0 ? (
              <div className="rounded-[22px] border border-white/55 bg-white/38 px-4 py-10 text-center text-sm text-[color:var(--text-muted)] backdrop-blur-[18px]">
                アーカイブ済みタスクはありません。
              </div>
            ) : (
              archivedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-4 rounded-[22px] border border-white/55 bg-white/38 p-4 backdrop-blur-[18px]"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[color:var(--text-strong)]">
                      {task.title}
                    </div>
                    <div className="mt-1 text-sm text-[color:var(--text-muted)]">
                      {task.category ? `${task.category} ・ ` : ""}
                      {task.memo ?? "メモなし"}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => restoreArchivedTask(task.id)}
                  >
                    復元
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-lg rounded-[28px]">
          <DialogHeader>
            <DialogTitle>全データを削除</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-[22px] border border-white/55 bg-[rgba(207,60,131,0.06)] p-4 text-sm leading-6 text-[color:var(--text-default)] backdrop-blur-[18px]">
              この操作は危険です。<br />
              タスク/ログ/作業項目/設定情報を含む、このアプリのすべての情報をブラウザ内から削除し初期化します。<br />
              実行前にバックアップを書き出すことをおすすめします。
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[color:var(--text-strong)]">
                実行するには「削除」と入力してください
              </label>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="削除"
                className="rounded-[20px]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setResetDialogOpen(false);
                  setResetConfirmText("");
                }}
              >
                キャンセル
              </Button>

              <Button
                className="rounded-full border border-[rgba(207,60,131,0.18)] bg-[rgba(207,60,131,0.88)] text-white shadow-[0_10px_24px_rgba(207,60,131,0.18)] hover:brightness-[1.03] disabled:opacity-40"
                onClick={resetAllData}
                disabled={resetConfirmText !== "削除"}
              >
                全データを削除
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={logEditOpen} onOpenChange={setLogEditOpen}>
        <DialogContent className="max-w-xl rounded-[28px]">
          <DialogHeader><DialogTitle>ログを編集</DialogTitle></DialogHeader>
          {logDraft && (
            <div className="grid gap-4">
              <select className="rounded-2xl border border-slate-200 px-3 py-3" value={logDraft.taskId} onChange={(e) => setLogDraft({ ...logDraft, taskId: e.target.value })}>
                {tasks.filter((task) => task.status !== "archived").map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
              </select>
              <select className="rounded-2xl border border-slate-200 px-3 py-3" value={logDraft.workTypeId} onChange={(e) => setLogDraft({ ...logDraft, workTypeId: e.target.value })}>
                {workTypes.map((workType) => <option key={workType.id} value={workType.id}>{workType.name}</option>)}
              </select>
              <Input type="datetime-local" value={toLocalInputValue(logDraft.startAt)} onChange={(e) => setLogDraft({ ...logDraft, startAt: fromLocalInputValue(e.target.value) })} className="rounded-2xl" />
              <Input type="datetime-local" value={toLocalInputValue(logDraft.endAt)} onChange={(e) => setLogDraft({ ...logDraft, endAt: fromLocalInputValue(e.target.value) })} className="rounded-2xl" />
              <Textarea value={logDraft.endNote ?? logDraft.startNote ?? ""} onChange={(e) => setLogDraft({ ...logDraft, endNote: e.target.value })} placeholder="メモ（任意）" className="rounded-2xl" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setLogEditOpen(false)}>閉じる</Button>
                <Button className="rounded-full bg-violet-600 text-white hover:bg-violet-700" onClick={saveLogEdit}>保存</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
