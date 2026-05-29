import { Navigate, Routes, Route } from "react-router-dom";

import Home from "./pages/home";
import Login from "./pages/login";
import Signup from "./pages/signup";

import ProtectedRoute from "./routes/protected-route";
import CustomerLayout from "./components/dashboard/CustomerLayout";
import WriterLayout from "./components/dashboard/WriterLayout";
import AdminLayout from "./components/dashboard/AdminLayout";

/* Dashboard Pages */
import DashboardHome from "./pages/dashboard/dashboard-home";
import WriterDashboard from "./pages/writer-dashboard.tsx";
import WriterApplication from "./pages/writer-application.tsx";
import PostAssignment from "./pages/dashboard/post-assignment";
import Orders from "./pages/dashboard/orders";
import Messages from "./pages/dashboard/messages";
import Payments from "./pages/dashboard/payments";
import Notifications from "./pages/dashboard/notifications";
import Profile from "./pages/dashboard/profile";
import Settings from "./pages/dashboard/settings";
import AdminDashboard from "./pages/dashboard/admin";
import AssignmentDetail from "./pages/dashboard/assignment-detail";import VerifyEmail from "./pages/verify-email";
function App() {
  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/" element={<Home />} />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/signup"
        element={<Signup />}
      />

      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route
        path="/writer-application"
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <WriterApplication />
          </ProtectedRoute>
        }
      />

      {/* Customer Dashboard */}
      <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="profile" element={<Profile />} />
          <Route path="messages" element={<Messages />} />
          <Route path="payments" element={<Payments />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="create-assignment" element={<PostAssignment />} />
          <Route path="assignments" element={<Orders />} />
          <Route path="assignments/:id" element={<AssignmentDetail role="customer" />} />
        </Route>
      </Route>

      {/* Writer Dashboard */}
      <Route element={<ProtectedRoute allowedRoles={["writer"]} />}>
        <Route path="/writer-dashboard" element={<WriterLayout />}>
          <Route index element={<WriterDashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="messages" element={<Messages />} />
          <Route path="payments" element={<Payments />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<AssignmentDetail role="writer" />} />
        </Route>
      </Route>

      {/* Admin Dashboard */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin-dashboard" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="writer-verifications" element={<AdminDashboard />} />
          <Route path="disputes" element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminDashboard />} />
          <Route path="commission-config" element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* Legacy redirects */}
      <Route path="/dashboard" element={<Navigate to="/customer" replace />} />
      <Route path="/dashboard/post-assignment" element={<Navigate to="/customer/create-assignment" replace />} />
      <Route path="/dashboard/orders" element={<Navigate to="/customer/assignments" replace />} />
      <Route path="/dashboard/messages" element={<Navigate to="/customer/messages" replace />} />
      <Route path="/dashboard/payments" element={<Navigate to="/customer/payments" replace />} />
      <Route path="/dashboard/notifications" element={<Navigate to="/customer/notifications" replace />} />
      <Route path="/dashboard/profile" element={<Navigate to="/customer/profile" replace />} />
      <Route path="/dashboard/settings" element={<Navigate to="/customer/settings" replace />} />
      <Route path="/dashboard/admin" element={<Navigate to="/admin-dashboard" replace />} />

    </Routes>
  );
}

export default App;
