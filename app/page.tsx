"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type EnergyKey = "very-low" | "low" | "medium" | "high" | "very-high";
type EffortKey = "tiny" | "small" | "medium" | "large" | "huge";
type Category = "Self-care" | "Mandatory" | "Work" | "Social" | "Chores";
type Status = "planned" | "done" | "skipped";

type Task = {
  id: string;
  title: string;
  effort: EffortKey;
  category: Category;
  notes?: string;
  archived?: boolean;
};

type CheckIn = {
  date: string;
  energy: EnergyKey;
  mood: string;
  warnings: string[];
  notes: string;
};

type TodayTask = {
  taskId: string;
  status: Status;
};

type RecoveryItem = {
  id: string;
  title: string;
  description: string;
  effort: "Very low" | "Low" | "Medium";
};

type AppState = {
  deviceId: string;
  checkIns: Record<string, CheckIn>;
  tasks: Task[];
  today: Record<string, TodayTask[]>;
  recoveryItems: RecoveryItem[];
};

const STORAGE_KEY = "ida-spoons-mvp-v1";

const energyOptions: Record<EnergyKey, { label: string; spoons: number; description: string }> = {
  "very-low": { label: "Very low", spoons: 4, description: "Keep the day small." },
  low: { label: "Low", spoons: 7, description: "Prioritise essentials." },
  medium: { label: "Medium", spoons: 10, description: "A balanced day." },
  high: { label: "High", spoons: 14, description: "More capacity than usual." },
  "very-high": { label: "Very high", spoons: 18, description: "Still pace yourself." },
};

const effortOptions: Record<EffortKey, { label: string; spoons: number }> = {
  tiny: { label: "Tiny", spoons: 1 },
  small: { label: "Small", spoons: 2 },
  medium: { label: "Medium", spoons: 4 },
  large: { label: "Large", spoons: 6 },
  huge: { label: "Huge", spoons: 8 },
};

const categories: Category[] = ["Self-care", "Mandatory", "Work", "Social", "Chores"];

const warningOptions = [
  "Noise feels sharper",
  "Irritable or tearful",
  "Struggling to start tasks",
  "Avoiding messages",
  "Body feels heavy",
  "Need quiet / darkness",
];

const starterTasks: Task[] = [
  { id: "task-water", title: "Drink water", effort: "tiny", category: "Self-care" },
  { id: "task-shower", title: "Shower", effort: "medium", category: "Self-care" },
  { id: "task-food", title: "Make simple food", effort: "small", category: "Mandatory" },
  { id: "task-walk", title: "Short walk", effort: "small", category: "Self-care" },
  { id: "task-laundry", title: "Laundry", effort: "large", category: "Chores" },
];

const starterRecovery: RecoveryItem[] = [
  {
    id: "rec-breathe",
    title: "Box breathing",
    description: "Breathe in for 4, hold for 4, out for 4, hold for 4. Repeat three times.",
    effort: "Very low",
  },
  {
    id: "rec-dark",
    title: "Low-stimulation reset",
    description: "Dim lights, reduce sound, sit somewhere neutral for ten minutes.",
    effort: "Very low",
  },
  {
    id: "rec-message",
    title: "Send a low-effort message",
    description: "Text someone: 'Low energy today. I may be slow to reply.'",
    effort: "Low",
  },
  {
    id: "rec-safe",
    title: "Safe sensory input",
    description: "Use a weighted blanket, soft jumper, familiar playlist, or another reliable comfort.",
    effort: "Low",
  },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createInitialState(): AppState {
  return {
    deviceId: makeId("device"),
    checkIns: {},
    tasks: starterTasks,
    today: {},
    recoveryItems: starterRecovery,
  };
}

function getCategoryClasses(category: Category) {
  switch (category) {
    case "Self-care":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "Mandatory":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "Work":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "Social":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "Chores":
      return "border-stone-200 bg-stone-50 text-stone-900";
  }
}

export default function Home() {
  const date = todayKey();
  const [state, setState] = useState<AppState>(() => createInitialState());
  const [isLoaded, setIsLoaded] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskEffort, setNewTaskEffort] = useState<EffortKey>("small");
  const [newTaskCategory, setNewTaskCategory] = useState<Category>("Self-care");
  const [newRecoveryTitle, setNewRecoveryTitle] = useState("");
  const [newRecoveryDescription, setNewRecoveryDescription] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        setState(JSON.parse(saved) as AppState);
      } catch {
        setState(createInitialState());
      }
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [isLoaded, state]);

  const checkIn = state.checkIns[date] ?? {
    date,
    energy: "medium" as EnergyKey,
    mood: "",
    warnings: [],
    notes: "",
  };

  const activeTasks = state.tasks.filter((task) => !task.archived);
  const todayTasks = state.today[date] ?? [];
  const plannedTaskIds = new Set(todayTasks.map((task) => task.taskId));
  const plannedTasks = todayTasks
    .map((todayTask) => ({
      todayTask,
      task: state.tasks.find((task) => task.id === todayTask.taskId),
    }))
    .filter((entry): entry is { todayTask: TodayTask; task: Task } => Boolean(entry.task));

  const spoonBudget = energyOptions[checkIn.energy].spoons;
  const usedSpoons = plannedTasks.reduce((total, entry) => total + effortOptions[entry.task.effort].spoons, 0);
  const doneSpoons = plannedTasks
    .filter((entry) => entry.todayTask.status === "done")
    .reduce((total, entry) => total + effortOptions[entry.task.effort].spoons, 0);
  const remainingSpoons = spoonBudget - usedSpoons;
  const recoverySuggestion = useMemo(() => {
    const lowEffort = state.recoveryItems.filter((item) => item.effort !== "Medium");
    return lowEffort[0] ?? state.recoveryItems[0];
  }, [state.recoveryItems]);

  function updateCheckIn(update: Partial<CheckIn>) {
    setState((current) => ({
      ...current,
      checkIns: {
        ...current.checkIns,
        [date]: { ...checkIn, ...update },
      },
    }));
  }

  function toggleWarning(warning: string) {
    const warnings = checkIn.warnings.includes(warning)
      ? checkIn.warnings.filter((item) => item !== warning)
      : [...checkIn.warnings, warning];

    updateCheckIn({ warnings });
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTaskTitle.trim();

    if (!title) return;

    setState((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          id: makeId("task"),
          title,
          effort: newTaskEffort,
          category: newTaskCategory,
        },
      ],
    }));

    setNewTaskTitle("");
    setNewTaskEffort("small");
    setNewTaskCategory("Self-care");
  }

  function toggleTodayTask(taskId: string) {
    setState((current) => {
      const todaysTasks = current.today[date] ?? [];
      const exists = todaysTasks.some((task) => task.taskId === taskId);

      return {
        ...current,
        today: {
          ...current.today,
          [date]: exists
            ? todaysTasks.filter((task) => task.taskId !== taskId)
            : [...todaysTasks, { taskId, status: "planned" as Status }],
        },
      };
    });
  }

  function setTodayStatus(taskId: string, status: Status) {
    setState((current) => ({
      ...current,
      today: {
        ...current.today,
        [date]: (current.today[date] ?? []).map((task) => (task.taskId === taskId ? { ...task, status } : task)),
      },
    }));
  }

  function archiveTask(taskId: string) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, archived: true } : task)),
      today: {
        ...current.today,
        [date]: (current.today[date] ?? []).filter((task) => task.taskId !== taskId),
      },
    }));
  }

  function addRecoveryItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newRecoveryTitle.trim();

    if (!title) return;

    setState((current) => ({
      ...current,
      recoveryItems: [
        ...current.recoveryItems,
        {
          id: makeId("recovery"),
          title,
          description: newRecoveryDescription.trim(),
          effort: "Low",
        },
      ],
    }));

    setNewRecoveryTitle("");
    setNewRecoveryDescription("");
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] text-stone-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-stone-500">Ida / spoons MVP</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Plan the day around the energy you actually have.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
                Check in, choose a realistic set of tasks, and keep a recovery list close when things start to feel too much.
              </p>
            </div>
            <div className="rounded-3xl bg-stone-950 p-5 text-white">
              <p className="text-sm text-stone-300">Today&apos;s budget</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-6xl font-semibold">{spoonBudget}</span>
                <span className="pb-2 text-stone-300">spoons</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-stone-300">Planned</p>
                  <p className="text-2xl font-semibold">{usedSpoons}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-stone-300">Completed</p>
                  <p className="text-2xl font-semibold">{doneSpoons}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">1. Daily check-in</h2>
                <p className="mt-2 text-stone-600">Pick an energy level. The app turns it into today&apos;s spoon budget.</p>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">{date}</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-5">
              {(Object.keys(energyOptions) as EnergyKey[]).map((key) => {
                const option = energyOptions[key];
                const isSelected = checkIn.energy === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateCheckIn({ energy: key })}
                    className={`rounded-2xl border p-3 text-left transition ${
                      isSelected ? "border-stone-950 bg-stone-950 text-white" : "border-stone-200 bg-stone-50 hover:border-stone-400"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className={`mt-1 block text-xs ${isSelected ? "text-stone-300" : "text-stone-500"}`}>
                      {option.spoons} spoons
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-stone-700">Mood / weather report</span>
              <input
                value={checkIn.mood}
                onChange={(event) => updateCheckIn({ mood: event.target.value })}
                placeholder="Flat, wired, okay, fragile..."
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-stone-500"
              />
            </label>

            <div className="mt-5">
              <p className="text-sm font-medium text-stone-700">Warning signs</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {warningOptions.map((warning) => {
                  const selected = checkIn.warnings.includes(warning);

                  return (
                    <button
                      key={warning}
                      type="button"
                      onClick={() => toggleWarning(warning)}
                      className={`rounded-full border px-3 py-2 text-sm transition ${
                        selected ? "border-amber-300 bg-amber-100 text-amber-950" : "border-stone-200 bg-white text-stone-600"
                      }`}
                    >
                      {warning}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-stone-700">Notes</span>
              <textarea
                value={checkIn.notes}
                onChange={(event) => updateCheckIn({ notes: event.target.value })}
                placeholder="Anything that would help future-you plan the day."
                className="mt-2 min-h-24 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-stone-500"
              />
            </label>
          </article>

          <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">2. Task bank</h2>
            <p className="mt-2 text-stone-600">Use relative effort first. Exact spoon counts are handled in the background.</p>

            <form onSubmit={addTask} className="mt-5 grid gap-3">
              <input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Add a task, e.g. reply to email"
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-stone-500"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={newTaskEffort}
                  onChange={(event) => setNewTaskEffort(event.target.value as EffortKey)}
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-stone-500"
                >
                  {(Object.keys(effortOptions) as EffortKey[]).map((key) => (
                    <option key={key} value={key}>
                      {effortOptions[key].label} · {effortOptions[key].spoons} spoons
                    </option>
                  ))}
                </select>
                <select
                  value={newTaskCategory}
                  onChange={(event) => setNewTaskCategory(event.target.value as Category)}
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-stone-500 sm:col-span-1"
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                <button className="rounded-2xl bg-stone-950 px-4 py-3 font-medium text-white transition hover:bg-stone-800">
                  Add task
                </button>
              </div>
            </form>

            <div className="mt-5 grid gap-3">
              {activeTasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full border px-2 py-1 ${getCategoryClasses(task.category)}`}>{task.category}</span>
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-stone-600">
                        {effortOptions[task.effort].label} · {effortOptions[task.effort].spoons} spoons
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleTodayTask(task.id)}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${
                        plannedTaskIds.has(task.id) ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {plannedTaskIds.has(task.id) ? "Planned" : "Plan today"}
                    </button>
                    <button type="button" onClick={() => archiveTask(task.id)} className="rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-500">
                      Hide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">3. Today&apos;s plan</h2>
                <p className="mt-2 text-stone-600">Keep the total within today&apos;s budget where possible.</p>
              </div>
              <div className={`rounded-2xl px-4 py-3 text-sm ${remainingSpoons < 0 ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
                {remainingSpoons < 0 ? `${Math.abs(remainingSpoons)} spoons over budget` : `${remainingSpoons} spoons remaining`}
              </div>
            </div>

            {plannedTasks.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
                No tasks planned yet. Add tasks from the task bank.
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {plannedTasks.map(({ task, todayTask }) => (
                  <div key={task.id} className="rounded-2xl border border-stone-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="mt-1 text-sm text-stone-500">
                          {task.category} · {effortOptions[task.effort].spoons} spoons
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(["planned", "done", "skipped"] as Status[]).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setTodayStatus(task.id, status)}
                            className={`rounded-full px-3 py-2 text-sm capitalize ${
                              todayTask.status === status ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">4. Recovery</h2>
            <p className="mt-2 text-stone-600">For overwhelm, burnout warning signs, or sensory overload.</p>

            {checkIn.warnings.length >= 3 && recoverySuggestion ? (
              <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Threshold reached</p>
                <h3 className="mt-2 text-xl font-semibold text-amber-950">Try: {recoverySuggestion.title}</h3>
                <p className="mt-2 text-amber-900">{recoverySuggestion.description}</p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3">
              {state.recoveryItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-stone-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-stone-600">{item.description}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">{item.effort}</span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={addRecoveryItem} className="mt-5 grid gap-3 rounded-2xl bg-stone-50 p-4">
              <input
                value={newRecoveryTitle}
                onChange={(event) => setNewRecoveryTitle(event.target.value)}
                placeholder="Add a recovery item"
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-500"
              />
              <input
                value={newRecoveryDescription}
                onChange={(event) => setNewRecoveryDescription(event.target.value)}
                placeholder="What helps?"
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-stone-500"
              />
              <button className="rounded-2xl bg-stone-950 px-4 py-3 font-medium text-white transition hover:bg-stone-800">
                Add recovery item
              </button>
            </form>
          </article>
        </section>

        <footer className="rounded-[2rem] border border-stone-200 bg-white/80 p-5 text-sm text-stone-500">
          <p>
            Prototype mode: data is saved to this browser using device ID <span className="font-mono text-stone-700">{state.deviceId.slice(0, 18)}...</span>.
            No login is required.
          </p>
        </footer>
      </section>
    </main>
  );
}
