import { useEffect, useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import {
  Box,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Checkbox,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ApiClient } from "../api/api-client";
import type { TodoDto, CreateTodoRequest, UpdateTodoRequest } from "../api/api-client";

const client = new ApiClient("http://localhost:5110");

const TodoSchema = Yup.object().shape({
  title: Yup.string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must be at most 200 characters")
    .required("Title is required"),
  description: Yup.string()
    .max(1000, "Description must be at most 1000 characters")
    .nullable(),
});

interface TodoFormValues {
  title: string;
  description: string;
}

const initialFormValues: TodoFormValues = {
  title: "",
  description: "",
};

export function TodoList() {
  const [todos, setTodos] = useState<TodoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoDto | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<TodoDto | null>(null);

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

  const handleSubmit = async (values: TodoFormValues, { resetForm }: { resetForm: () => void }) => {
    try {
      if (editingTodo) {
        const request: UpdateTodoRequest = {
          title: values.title,
          description: values.description || undefined,
          isCompleted: editingTodo.isCompleted,
        };
        await client.todoPUT(editingTodo.id!, request);
      } else {
        const request: CreateTodoRequest = {
          title: values.title,
          description: values.description || undefined,
        };
        await client.todoPOST(request);
      }
      resetForm();
      setDialogOpen(false);
      setEditingTodo(null);
      fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save todo");
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

  const handleDelete = async () => {
    if (!todoToDelete) return;
    try {
      await client.todoDELETE(todoToDelete.id!);
      setDeleteConfirmOpen(false);
      setTodoToDelete(null);
      fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete todo");
    }
  };

  const startEditing = (todo: TodoDto) => {
    setEditingTodo(todo);
    setDialogOpen(true);
  };

  const openNewTodoDialog = () => {
    setEditingTodo(null);
    setDialogOpen(true);
  };

  const completedCount = todos.filter(t => t.isCompleted).length;
  const pendingCount = todos.length - completedCount;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Todo List
          </Typography>
          <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
            <Chip label={`${pendingCount} pending`} color="warning" size="small" />
            <Chip label={`${completedCount} completed`} color="success" size="small" />
          </Box>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={openNewTodoDialog}
        >
          Add Todo
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && todos.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : todos.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            No todos yet. Add one above!
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {todos.map((todo, index) => (
              <ListItem
                key={todo.id}
                divider={index < todos.length - 1}
                sx={{
                  backgroundColor: todo.isCompleted ? "action.hover" : "inherit",
                }}
                secondaryAction={
                  <Box>
                    <IconButton size="small" onClick={() => startEditing(todo)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setTodoToDelete(todo);
                        setDeleteConfirmOpen(true);
                      }}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={todo.isCompleted}
                    onChange={() => handleToggleComplete(todo)}
                    color="primary"
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      sx={{
                        textDecoration: todo.isCompleted ? "line-through" : "none",
                        color: todo.isCompleted ? "text.secondary" : "text.primary",
                      }}
                    >
                      {todo.title}
                    </Typography>
                  }
                  secondary={todo.description}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Todo Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTodo ? "Edit Todo" : "New Todo"}</DialogTitle>
        <Formik
          initialValues={
            editingTodo
              ? { title: editingTodo.title || "", description: editingTodo.description || "" }
              : initialFormValues
          }
          validationSchema={TodoSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
            <Form>
              <DialogContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    fullWidth
                    name="title"
                    label="Title"
                    value={values.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.title && Boolean(errors.title)}
                    helperText={touched.title && errors.title}
                    autoFocus
                  />
                  <TextField
                    fullWidth
                    name="description"
                    label="Description (optional)"
                    multiline
                    rows={3}
                    value={values.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.description && Boolean(errors.description)}
                    helperText={touched.description && errors.description}
                  />
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingTodo ? "Update" : "Create"}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{todoToDelete?.title}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
