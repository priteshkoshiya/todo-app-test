"use client";

import { useState, useEffect, useRef } from "react";

interface Task {
  id: number;
  text: string;
  completed: boolean;
}

export default function TodoApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const inputRef = useRef<HTMLInputElement>(null);

  // Load theme from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem("todo-theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    }
  }, []);

  // Apply theme to <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("todo-theme", theme);
  }, [theme]);

  // Load tasks from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem("todo-tasks");
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Persist tasks to localStorage on change
  useEffect(() => {
    localStorage.setItem("todo-tasks", JSON.stringify(tasks));
  }, [tasks]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function addTask() {
    const text = input.trim();
    if (!text) return;
    setTasks((prev) => [
      ...prev,
      { id: Date.now(), text, completed: false },
    ]);
    setInput("");
    inputRef.current?.focus();
  }

  function toggleTask(id: number) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  function deleteTask(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") addTask();
  }

  const remaining = tasks.filter((t) => !t.completed).length;

  return (
    <div className="min-h-screen bg-bg flex items-start justify-center px-4 pt-16 pb-16 transition-colors duration-300">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center relative">
          <h1 className="text-3xl font-bold text-text tracking-tight">
            My Tasks
          </h1>
          {tasks.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              {remaining === 0
                ? "All done 🎉"
                : `${remaining} task${remaining !== 1 ? "s" : ""} remaining`}
            </p>
          )}
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="absolute right-0 top-0 w-9 h-9 flex items-center justify-center rounded-full border border-hairline text-muted hover:text-text hover:border-primary transition-colors"
          >
            {theme === "dark" ? (
              /* Sun icon */
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="22" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="2" y1="12" x2="4" y2="12" />
                <line x1="20" y1="12" x2="22" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              /* Moon icon */
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* Input row */}
        <div className="flex gap-2 mb-6">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a new task…"
            maxLength={200}
            className="flex-1 bg-surface text-text placeholder-muted border border-hairline rounded-lg px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={addTask}
            disabled={!input.trim()}
            className="bg-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-3 rounded-lg transition-opacity whitespace-nowrap"
          >
            Add
          </button>
        </div>

        {/* Task list */}
        {tasks.length === 0 ? (
          <div className="text-center py-16 text-muted text-sm select-none">
            No tasks yet. Add one above!
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 bg-surface border border-hairline rounded-lg px-4 py-3 group transition-colors hover:border-primary/40"
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task.id)}
                  aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                  className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                  style={{
                    borderColor: task.completed ? "var(--color-primary)" : "var(--color-muted)",
                    backgroundColor: task.completed ? "var(--color-primary)" : "transparent",
                  }}
                >
                  {task.completed && (
                    <svg
                      className="w-3 h-3 text-white"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  )}
                </button>

                {/* Task text */}
                <span
                  className="flex-1 text-sm leading-snug break-words"
                  style={{
                    color: task.completed ? "var(--color-muted)" : "var(--color-text)",
                    textDecoration: task.completed ? "line-through" : "none",
                  }}
                >
                  {task.text}
                </span>

                {/* Delete button */}
                <button
                  onClick={() => deleteTask(task.id)}
                  aria-label="Delete task"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted hover:text-red-400 transition-all"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="4" y1="4" x2="12" y2="12" />
                    <line x1="12" y1="4" x2="4" y2="12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Clear completed */}
        {tasks.some((t) => t.completed) && (
          <div className="mt-4 text-right">
            <button
              onClick={() => setTasks((prev) => prev.filter((t) => !t.completed))}
              className="text-xs text-muted hover:text-accent transition-colors"
            >
              Clear completed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
