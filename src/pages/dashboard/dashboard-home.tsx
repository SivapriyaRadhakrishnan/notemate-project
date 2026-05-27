import DashboardStats from "../../components/dashboard/dashboard-stats";
import ActiveOrderCard from "../../components/dashboard/active-order-card";
import { updateAssignmentStatus } from "../../lib/assignment-utils";
import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";
import { useAuth } from "../../context/auth-context";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  subject: string;
  budget: number;
  pages: number;
  deadline: string;
  status: string;
  payment_status: string;
  urgency: string;
  delivery_mode: string;
  description?: string;
  file_url?: string;
  file_keys?: string[];
  proof_keys?: string[];
  final_proof_keys?: string[];
  writer_id?: string;
  created_at: string;
  user_id: string;
}

const DashboardHome = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  // Tab states for Writer Dashboard
  const [writerTab, setWriterTab] = useState<"feed" | "active">("feed");

  // Data states
  const [customerAssignments, setCustomerAssignments] = useState<Assignment[]>([]);
  const [writerFeed, setWriterFeed] = useState<Assignment[]>([]);
  const [writerActiveJobs, setWriterActiveJobs] = useState<Assignment[]>([]);
  
  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [uploadProgressId, setUploadProgressId] = useState<string | null>(null);

  // Stats counters
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    financial: 0,
  });

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile, writerTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (profile?.role === "writer") {
        // --- WRITER FLOW ---
        // 1. Fetch available feed (Pending status & escrow paid/held)
        const { data: feedData, error: feedError } = await supabase
          .from("assignments")
          .select("*")
          .eq("status", "pending")
          .eq("payment_status", "held")
          .order("created_at", { ascending: false });

        if (feedError) console.error(feedError);
        setWriterFeed(feedData || []);

        // 2. Fetch active accepted jobs
        const { data: activeJobs, error: activeError } = await supabase
          .from("assignments")
          .select("*")
          .eq("writer_id", user.id)
          .neq("status", "completed")
          .order("created_at", { ascending: false });

        if (activeError) console.error(activeError);
        setWriterActiveJobs(activeJobs || []);

        // Calculate Writer Stats
        const { data: allWriterJobs } = await supabase
          .from("assignments")
          .select("*")
          .eq("writer_id", user.id);

        const totalWriterJobs = allWriterJobs?.length || 0;
        const activeCount = activeJobs?.length || 0;
        const completedCount = allWriterJobs?.filter(j => j.status === "completed").length || 0;
        const earnings = profile.available_balance || 0;

        setStats({
          total: totalWriterJobs,
          active: activeCount,
          completed: completedCount,
          financial: earnings,
        });

      } else {
        // --- CUSTOMER FLOW (Default / Customer ) ---
        const { data, error } = await supabase
          .from("assignments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(error.message);
          return;
        }

        const assignmentsData = data || [];
        setCustomerAssignments(assignmentsData);

        const total = assignmentsData.length;
        const active = assignmentsData.filter(
          (item) => item.status !== "completed" && item.status !== "cancelled"
        ).length;
        const completed = assignmentsData.filter(
          (item) => item.status === "completed"
        ).length;
        
        // Sum budget for assignments that are paid or active
        const budget = assignmentsData.reduce(
          (acc, item) => acc + (item.payment_status === "held" || item.payment_status === "released" ? item.budget : 0),
          0
        );

        setStats({
          total,
          active,
          completed,
          financial: budget,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------- */
  /* WRITER ACTIONS */
  /* ----------------------------- */

  const acceptAssignment = async (assignment: Assignment) => {
    try {
      setActionLoadingId(assignment.id);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Optimistic lock atomic update: Assign current user as writer only if status is still Pending
     const { data, error } = await supabase
  .from("assignments")
  .update({
    writer_id: user.id,
  })
  .eq("id", assignment.id)
  .eq("status", "pending")
  .select();

      if (error) {
        alert("Failed to accept task: " + error.message);
        return;
      }

      if (!data || data.length === 0) {
        alert("Task was already accepted by another writer!");
        fetchDashboardData();
        return;
      }
await updateAssignmentStatus(assignment.id, "accepted");
    

      alert("Successfully accepted assignment! Chat is now open.");
      setWriterTab("active");
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const uploadProofPhoto = async (e: React.ChangeEvent<HTMLInputElement>, assignment: Assignment) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      setUploadProgressId(assignment.id);

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("assignments")
        .upload(fileName, file);

      if (uploadError) {
        alert("Failed to upload proof photo: " + uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("assignments").getPublicUrl(fileName);

      const updatedProofKeys = [...(assignment.proof_keys || []), publicUrl];
      
      // If status is 'Accepted', progress starts offline, update to 'In Progress'
      const newStatus = assignment.status === "accepted" ? "in_progress" : assignment.status;

      const { error: updateError } = await supabase
        .from("assignments")
        .update({
          proof_keys: updatedProofKeys,
          status: newStatus,
        })
        .eq("id", assignment.id);

      if (updateError) {
        alert("Failed to update task records: " + updateError.message);
        return;
      }

      // Add notification for Customer 
      await supabase.from("notifications").insert([
        {
          user_id: assignment.user_id,
          title: "Progress Photo Uploaded",
          message: `Your writer uploaded a new progress photo for "${assignment.title}".`,
          read: false,
        },
      ]);

      alert("Progress photo uploaded successfully!");
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert("Error uploading proof.");
    } finally {
      setUploadProgressId(null);
    }
  };

  const markAsDelivered = async (assignment: Assignment) => {
    const confirmDel = window.confirm("Are you sure you want to mark this assignment as fully delivered? Make sure all proof photos are uploaded.");
    if (!confirmDel) return;

    try {
      setActionLoadingId(assignment.id);

      const { error } = await supabase
        .from("assignments")
        .update({
          status: "ready",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", assignment.id);

      if (error) {
        alert("Failed to mark delivered: " + error.message);
        return;
      }

      // Add notification for Customer 
      await supabase.from("notifications").insert([
        {
          user_id: assignment.user_id,
          title: "Assignment Delivered",
          message: `Your writer marked "${assignment.title}" as delivered. Please review and confirm delivery.`,
          read: false,
        },
      ]);

      alert("Assignment marked as delivered! Awaiting customer review.");
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <div className="space-y-10">
        {/* Dynamic Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black text-white">
              Welcome, {profile?.full_name || "NoteMate User"}
            </h1>
            <p className="mt-1 text-white/50">
              Role: <span className="text-violet-400 capitalize font-bold">{profile?.role || "Customer "}</span>
            </p>
          </div>
          {profile?.role === "customer" && (
            <button
              onClick={() => navigate("/customer/create-assignment")}
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-blue-500 px-6 py-3 font-semibold text-white hover:opacity-90 shadow-lg shadow-violet-600/20"
            >
              Post Assignment
            </button>
          )}
        </div>

        {/* Dynamic Stats */}
        <DashboardStats
          total={stats.total}
          active={stats.active}
          completed={stats.completed}
          financial={stats.financial}
          financialLabel={profile?.role === "writer" ? "Earnings (Available)" : "Active Budget"}
        />

        {/* WRITER VIEW */}
        {profile?.role === "writer" && (
          <div className="space-y-6">
            {/* Tabs Selector */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setWriterTab("feed")}
                className={`px-6 py-4 font-bold text-sm border-b-2 transition-all duration-300 ${
                  writerTab === "feed"
                    ? "border-violet-500 text-white"
                    : "border-transparent text-white/40 hover:text-white"
                }`}
              >
                Available Assignment Feed ({writerFeed.length})
              </button>
              <button
                onClick={() => setWriterTab("active")}
                className={`px-6 py-4 font-bold text-sm border-b-2 transition-all duration-300 ${
                  writerTab === "active"
                    ? "border-violet-500 text-white"
                    : "border-transparent text-white/40 hover:text-white"
                }`}
              >
                My Active Jobs ({writerActiveJobs.length})
              </button>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white flex items-center justify-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
                Loading feed...
              </div>
            ) : (
              <>
                {/* 1. WRITER FEED TAB */}
                {writerTab === "feed" && (
                  <div className="grid gap-6 md:grid-cols-2">
                    {writerFeed.length === 0 ? (
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/50 text-center md:col-span-2">
                        No new assignments available in the feed right now. Check back shortly!
                      </div>
                    ) : (
                      writerFeed.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between hover:border-violet-500/20 transition-all duration-300"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="text-xl font-bold text-white line-clamp-1">{item.title}</h3>
                              <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                Paid Upfront
                              </span>
                            </div>
                            <p className="text-xs text-white/50 mt-1">{item.subject}</p>
                            
                            <p className="text-sm text-white/70 mt-4 line-clamp-2 bg-[#020617]/50 rounded-xl p-3 border border-white/5">
                              {item.description || "No description provided."}
                            </p>

                            <div className="grid grid-cols-2 gap-3 mt-6 text-xs text-white/60">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-white/30 uppercase">Pages</span>
                                <span className="font-bold text-white mt-0.5">{item.pages} Pages</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-white/30 uppercase">Urgency</span>
                                <span className="font-bold text-violet-400 mt-0.5 capitalize">{item.urgency || "Normal"}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-white/30 uppercase">Due Date</span>
                                <span className="font-bold text-white mt-0.5">{item.deadline}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-white/30 uppercase">Delivery</span>
                                <span className="font-bold text-white mt-0.5 capitalize">{item.delivery_mode || "Digital"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                            <div>
                              <span className="text-[10px] text-white/30 uppercase block">Your Earnings</span>
                              <span className="text-2xl font-black text-emerald-400">₹{Math.round(item.budget * 0.8)}</span>
                              <span className="text-[10px] text-white/40 block mt-0.5">(20% NoteMate Fee)</span>
                            </div>
                            <button
                              onClick={() => acceptAssignment(item)}
                              disabled={actionLoadingId === item.id}
                              className="rounded-2xl bg-gradient-to-r from-violet-600 to-blue-500 px-6 py-3.5 text-xs font-bold text-white hover:opacity-90 transition-all duration-300 disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {actionLoadingId === item.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                              ) : (
                                <Sparkles size={14} />
                              )}
                              Accept Assignment
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 2. WRITER ACTIVE JOBS TAB */}
                {writerTab === "active" && (
                  <div className="grid gap-6 md:grid-cols-2">
                    {writerActiveJobs.length === 0 ? (
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/50 text-center md:col-span-2">
                        You have no active assignments. Browse the available feed to accept tasks!
                      </div>
                    ) : (
                      writerActiveJobs.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between hover:border-violet-500/20 transition-all duration-300"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="text-xl font-bold text-white line-clamp-1">{item.title}</h3>
                              <span
                                className={`rounded-xl px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                  item.status === "accepted"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : item.status === "in_progress"
                                    ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                                    : item.status === "ready"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <p className="text-xs text-white/50 mt-1">{item.subject}</p>

                            <div className="mt-4 rounded-xl bg-white/5 p-3 border border-white/5 flex justify-between text-xs">
                              <span className="text-white/40">Payout Earnings</span>
                              <span className="text-emerald-400 font-bold">₹{Math.round(item.budget * 0.8)}</span>
                            </div>

                            {/* Proofs Section */}
                            <div className="mt-6 space-y-3">
                              <p className="text-[10px] font-bold text-white/30 uppercase">Delivered/Progress Photos</p>
                              
                              <div className="flex flex-wrap gap-2">
                                {item.proof_keys?.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-violet-300 border border-white/5"
                                  >
                                    Proof #{idx + 1}
                                  </a>
                                ))}
                              </div>

                              {/* Upload Form */}
                              <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-[#0B1120] py-3 text-center cursor-pointer hover:border-violet-500/40 text-xs text-white/50">
                                {uploadProgressId === item.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
                                ) : (
                                  <Upload size={14} className="text-violet-400" />
                                )}
                                Upload Progress/Proof Photo
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={uploadProgressId === item.id}
                                  onChange={(e) => uploadProofPhoto(e, item)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>

                          <div className="mt-8 pt-4 border-t border-white/5 flex gap-3">
                            <button
                              onClick={() => navigate("/customer/messages")}
                              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-xs font-bold text-white hover:bg-white/10 transition-all duration-300"
                            >
                              <MessageSquare size={14} />
                              Chat
                            </button>

                            {item.status !== "ready" && (
                              <button
                                onClick={() => markAsDelivered(item)}
                                disabled={actionLoadingId === item.id}
                                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all duration-300 disabled:opacity-50"
                              >
                                Mark as Delivered
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* CUSTOMER VIEW */}
        {profile?.role === "customer" && (
          <div>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">Active Assignments</h2>
                <p className="mt-1 text-white/50">Track your ongoing assignments and deliverables.</p>
              </div>
              <button
                onClick={() => navigate("/customer/assignments")}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                View All
              </button>
            </div>

            {/* Empty State */}
            {customerAssignments.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/60 text-center">
                You have no active assignments. Let's create your first order!
              </div>
            )}

            {/* Cards */}
            <div className="grid gap-6 xl:grid-cols-2">
              {customerAssignments.map((item) => (
                <ActiveOrderCard
                  key={item.id}
                  title={item.title}
                  subject={item.subject}
                  progress={
                    item.status === "completed"
                      ? 100
                      : item.status === "pending"
                      ? 20
                      : item.status === "accepted"
                      ? 45
                      : item.status === "in_progress"
                      ? 70
                      : 90
                  }
                  dueDate={item.deadline}
                  status={item.status}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DashboardHome;
