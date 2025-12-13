import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicRoute } from "./components/PublicRoute";
import { AdminLayout } from "./layouts/AdminLayout";
import { Login } from "./pages/Login";
import { AcceptInvite } from "./pages/AcceptInvite";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { TodoList } from "./components/TodoList";
import { ProductList } from "./components/ProductList";
import { Users } from "./pages/Users";
import { Invites } from "./pages/Invites";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes (no layout) */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Accept invite - public but special handling */}
        <Route path="/accept-invite" element={<AcceptInvite />} />

        {/* Protected routes (with AdminLayout) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Navigate to="/todos" replace />} />
            <Route path="/todos" element={<TodoList />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/users" element={<Users />} />
            <Route path="/invites" element={<Invites />} />
          </Route>
        </Route>

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
