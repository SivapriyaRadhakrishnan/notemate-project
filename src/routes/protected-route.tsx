import { Navigate, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../context/auth-context";
import { Clock, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "../supabase/client";

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children?: React.ReactNode;
  allowedRoles?: Array<"customer" | "writer" | "admin">;
}) => {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div
        className="
          flex min-h-screen
          items-center justify-center
          bg-[#020617]
          text-white
        "
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
          <p className="text-white/60 text-sm font-medium">Loading NoteMate...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const getDashboardRoute = (role: string) => {
    if (role === "writer") return "/writer-dashboard";
    if (role === "admin") return "/admin-dashboard";
    return "/customer";
  };

  if (session?.user && !session.user.email_confirmed_at) {
    return <Navigate to="/verify-email" replace />;
  }

  if (profile && allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={getDashboardRoute(profile.role)} replace />;
  }

  // Verification Gate for Writers
  if (profile && profile.role === "writer" && profile.writer_status !== "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] p-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <Clock size={32} />
          </div>

          <h2 className="text-2xl font-black text-white">Verification Pending</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Thanks for signing up as a writer! Our admin team is currently reviewing your college ID card photo. This process usually takes 2-4 hours.
          </p>

          <div className="mt-8 rounded-2xl bg-white/5 p-4 border border-white/5 flex items-center gap-3 text-left">
            <ShieldCheck className="text-violet-400 shrink-0" size={20} />
            <span className="text-xs text-white/50">
              We'll activate your dashboard as soon as you're approved.
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/10 bg-red-500/5 py-4 text-sm font-bold text-red-400 transition-all duration-300 hover:bg-red-500/10"
          >
            <LogOut size={16} />
            Logout from Account
          </button>
        </div>
      </div>
    );
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
