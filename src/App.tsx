import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UserRoleProvider } from "./context/UserRoleContext";
import { ToastProvider } from "./context/ToastContext";
import { SectionsProvider } from "./context/SectionsProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { SignUp } from "./pages/SignUp";
import { Dashboard } from "./pages/Dashboard";
import { SectionPage } from "./pages/SectionPage";
import { Settings } from "./pages/Settings";
import { ManageUsers } from "./pages/ManageUsers";
import { Policies } from "./pages/Policies";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <UserRoleProvider user={user}>
      <SectionsProvider>{children}</SectionsProvider>
    </UserRoleProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="section/:sectionId" element={<SectionPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="manage-users" element={<ManageUsers />} />
        <Route path="policies" element={<Policies />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
