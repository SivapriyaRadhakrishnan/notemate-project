import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import { useAuth } from "../context/auth-context";
import { updateAssignmentStatus } from "../lib/assignment-utils";
import {
  Sparkles,
  Upload,
  MessageSquare,
  ArrowUpRight,
  CheckCircle,
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  subject: string;
  description?: string;
  budget: number;
  pages: number;
  deadline: string;
  status: string;
  payment_status: string;
  urgency: string;
  delivery_mode: string;
  proof_keys?: string[];
  file_keys?: string[];
  user_id: string;
  writer_id?: string;
  created_at: string;
}

const WriterDashboard = () => {
  const navigate = useNavigate();

  const { profile } = useAuth();

  const [availableJobs, setAvailableJobs] =
    useState<Assignment[]>([]);

  const [activeJobs, setActiveJobs] =
    useState<Assignment[]>([]);

  const [completedJobs, setCompletedJobs] =
    useState<Assignment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [actionLoadingId, setActionLoadingId] =
    useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    earnings: 0,
  });

  useEffect(() => {
    if (profile) {
      loadWriterData();
    }
  }, [profile]);

  const loadWriterData = async () => {
    try {
      setLoading(true);
      setLoadError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || profile?.role !== "writer")
        return;

      const [
        {
          data: feedData,
          error: feedError,
        },
        {
          data: activeData,
          error: activeError,
        },
        {
          data: completedData,
          error: completedError,
        },
      ] = await Promise.all([
        supabase
          .from("assignments")
          .select("*")
          .eq("status", "open")
          .is("writer_id", null)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("assignments")
          .select("*")
          .eq("writer_id", user.id)
          .in("status", [
            "accepted",
            "in_progress",
            "ready_for_review",
          ])
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("assignments")
          .select("*")
          .eq("writer_id", user.id)
          .eq("status", "completed")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (feedError) throw feedError;
      if (activeError) throw activeError;
      if (completedError)
        throw completedError;

      setAvailableJobs(feedData || []);
      setActiveJobs(activeData || []);
      setCompletedJobs(
        completedData || []
      );

      setStats({
        total:
          (activeData?.length || 0) +
          (completedData?.length || 0),

        active: activeData?.length || 0,

        completed:
          completedData?.length || 0,

        earnings:
          profile.available_balance || 0,
      });
    } catch (err) {
      console.error(
        "Error loading writer dashboard:",
        err
      );

      setLoadError(
        err instanceof Error
          ? err.message
          : "Unable to load writer assignments."
      );
    } finally {
      setLoading(false);
    }
  };

  const acceptJob = async (
    assignment: Assignment
  ) => {
    try {
      setActionLoadingId(
        assignment.id
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Atomic acceptance: set writer_id only if status is still `open` and unclaimed
      const { data: updated, error: updateError } = await supabase
        .from("assignments")
        .update({ writer_id: user.id })
        .eq("id", assignment.id)
        .eq("status", "open")
        .is("writer_id", null)
        .select();

      if (updateError) throw updateError;

      if (!updated || updated.length === 0) {
        alert("This assignment was claimed by another writer.");
        await loadWriterData();
        return;
      }

      await updateAssignmentStatus(assignment.id, "accepted");
      alert("Assignment accepted successfully.");
      await loadWriterData();
    } catch (err: any) {
      console.error(err);

      alert(
        err?.message ||
          "Unable to accept assignment."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-10">
      {loadError && (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-200">
          {loadError}
        </div>
      )}

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black text-white">
            Writer Dashboard
          </h1>

          <p className="mt-2 text-white/50">
            Manage assignments,
            track earnings, and stay
            ahead of deadlines.
          </p>
        </div>

        {/* STATS */}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/50">
              Available Feed
            </p>

            <p className="mt-3 text-3xl font-black text-white">
              {availableJobs.length}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/50">
              Active Assignments
            </p>

            <p className="mt-3 text-3xl font-black text-white">
              {activeJobs.length}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/50">
              Wallet Balance
            </p>

            <p className="mt-3 text-3xl font-black text-emerald-400">
              ₹
              {Math.round(
                stats.earnings
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* AVAILABLE ASSIGNMENTS */}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">
                Available Assignments
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                New opportunities
              </h2>
            </div>

            <Sparkles
              size={24}
              className="text-violet-400"
            />
          </div>

          {loading ? (
            <div className="text-white/60">
              Loading assignments...
            </div>
          ) : availableJobs.length ===
            0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#020617] p-8 text-center text-white/60">
              No  assignments
              are available right
              now.
            </div>
          ) : (
            <div className="space-y-4">
              {availableJobs.map(
                (assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-3xl border border-white/10 bg-[#020617] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-black text-white">
                          {
                            assignment.title
                          }
                        </p>

                        <p className="mt-2 text-sm text-white/50">
                          {
                            assignment.subject
                          }
                        </p>
                      </div>

                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                        {
                          assignment.urgency
                        }
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-white/60 sm:grid-cols-2">
                      <div>
                        Pages:{" "}
                        {
                          assignment.pages
                        }
                      </div>

                      <div>
                        Budget: ₹
                        {
                          assignment.budget
                        }
                      </div>

                      <div>
                        Due:{" "}
                        {
                          assignment.deadline
                        }
                      </div>

                      <div>
                        Delivery:{" "}
                        {
                          assignment.delivery_mode
                        }
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <button
                        onClick={() =>
                          acceptJob(
                            assignment
                          )
                        }
                        disabled={
                          actionLoadingId ===
                          assignment.id
                        }
                        className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 text-xs font-bold uppercase text-white transition hover:bg-violet-400 disabled:opacity-50"
                      >
                        {actionLoadingId ===
                        assignment.id
                          ? "Accepting..."
                          : "Accept Assignment"}
                      </button>

                      <span className="text-xs text-white/40">
                        Posted{" "}
                        {new Date(
                          assignment.created_at
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* ACTIVE WORK */}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-white/50">
                Active & Completed
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Your workload
              </h2>
            </div>

            <ArrowUpRight
              size={24}
              className="text-blue-400"
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-[#020617] p-5">
              <p className="text-sm text-white/50">
                In Progress
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {activeJobs.length}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#020617] p-5">
              <p className="text-sm text-white/50">
                Completed
              </p>

              <p className="mt-3 text-3xl font-black text-white">
                {completedJobs.length}
              </p>
            </div>
          </div>

          {/* ACTION CENTER */}

          <div className="mt-8 rounded-3xl border border-white/10 bg-[#020617] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/50">
                  Action center
                </p>

                <p className="mt-2 text-white">
                  Upload proofs,
                  message customers,
                  and keep assignments
                  moving.
                </p>
              </div>

              <CheckCircle
                size={32}
                className="text-emerald-400"
              />
            </div>

            {activeJobs.length > 0 ? (
              <div className="mt-6 grid gap-3">
                {activeJobs
                  .slice(0, 1)
                  .map((job) => (
                    <div
                      key={job.id}
                      className="space-y-2"
                    >
                      <button
                        onClick={() =>
                          navigate(
                            `/writer-dashboard/orders/${job.id}`
                          )
                        }
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        <Upload
                          size={16}
                          className="mr-2 inline-block"
                        />
                        Upload Proofs
                        for "{job.title}"
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/writer-dashboard/messages`
                          )
                        }
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        <MessageSquare
                          size={16}
                          className="mr-2 inline-block"
                        />
                        Open Chat
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/50">
                No active
                assignments. Accept an
                assignment to see
                options here.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default WriterDashboard;