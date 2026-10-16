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
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage after mount
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

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem("todo-tasks", JSON.stringify(tasks));
  }, [tasks]);

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
    <div className="min-h-screen bg-bg flex items-start justify-center px-4 pt-16 pb-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text tracking-tight">
            My Tasks 11111111111
          </h1>
          {tasks.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              {remaining === 0
                ? "All done 🎉"
                : `${remaining} task${remaining !== 1 ? "s" : ""} remaining`}
            </p>
          )}
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
