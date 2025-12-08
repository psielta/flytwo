import { useEffect, useState } from "react";
import { ApiClient } from "../api/api-client";
import type { TodoDto, CreateTodoRequest, UpdateTodoRequest } from "../api/api-client";

const client = new ApiClient("http://localhost:5110");

export function TodoList() {
  const [todos, setTodos] = useState<TodoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const fetchTodos = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = await client.todoAll(signal);
      setTodos(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch todos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTodos(controller.signal);
    return () => controller.abort();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const request: CreateTodoRequest = {
        title: newTitle,
        description: newDescription || undefined,
      };
      await client.todoPOST(request);
      setNewTitle("");
      setNewDescription("");
      fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo");
    }
  };

  const handleToggleComplete = async (todo: TodoDto) => {
    try {
      const request: UpdateTodoRequest = {
        title: todo.title,
        description: todo.description,
        isCompleted: !todo.isCompleted,
      };
      await client.todoPUT(todo.id!, request);
      fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await client.todoDELETE(id);
      fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete todo");
    }
  };

  const startEditing = (todo: TodoDto) => {
    setEditingId(todo.id!);
    setEditTitle(todo.title || "");
    setEditDescription(todo.description || "");
  };

  const handleUpdate = async (id: number) => {
    try {
      const todo = todos.find((t) => t.id === id);
      const request: UpdateTodoRequest = {
        title: editTitle,
        description: editDescription || undefined,
        isCompleted: todo?.isCompleted || false,
      };
      await client.todoPUT(id, request);
      setEditingId(null);
      fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo");
    }
  };

  if (loading && todos.length === 0) {
    return <div>Loading todos...</div>;
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h2>Todo List</h2>

      {error && <div style={{ color: "red", marginBottom: "1rem" }}>Error: {error}</div>}

      <form onSubmit={handleCreate} style={{ marginBottom: "1.5rem" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <input
            type="text"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Add Todo
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {todos.map((todo) => (
          <li
            key={todo.id}
            style={{
              padding: "1rem",
              marginBottom: "0.5rem",
              backgroundColor: todo.isCompleted ? "#e8f5e9" : "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            {editingId === todo.id ? (
              <div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ width: "100%", marginBottom: "0.5rem", padding: "0.25rem" }}
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{ width: "100%", marginBottom: "0.5rem", padding: "0.25rem" }}
                />
                <button onClick={() => handleUpdate(todo.id!)} style={{ marginRight: "0.5rem" }}>
                  Save
                </button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <input
                    type="checkbox"
                    checked={todo.isCompleted}
                    onChange={() => handleToggleComplete(todo)}
                    style={{ marginRight: "0.5rem" }}
                  />
                  <span style={{ textDecoration: todo.isCompleted ? "line-through" : "none" }}>
                    <strong>{todo.title}</strong>
                    {todo.description && <span style={{ color: "#666" }}> - {todo.description}</span>}
                  </span>
                </div>
                <div>
                  <button onClick={() => startEditing(todo)} style={{ marginRight: "0.5rem" }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(todo.id!)} style={{ color: "red" }}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {todos.length === 0 && !loading && <p>No todos yet. Add one above!</p>}
    </div>
  );
}
