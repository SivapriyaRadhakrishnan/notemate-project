import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/client";
import { useAuth } from "../../context/auth-context";
import {
  ShieldAlert,
  UserCheck,
  Percent,
  BarChart3,
  Check,
  X,
  Eye,
  AlertOctagon,
  Scale,
} from "lucide-react";

interface PendingWriter {
  id: string;
  user_id: string;
  full_name: string;
  college_id_key: string;
  created_at: string;
}

interface VerifiedWriter {
  id: string;
  full_name: string;
  writer_status?: string;
  verified?: boolean;
  created_at: string;
}

interface DisputedOrder {
  id: string;
  title: string;
  subject: string;
  budget: number;
  user_id: string;
  writer_id: string;
  proof_keys?: string[];
  created_at: string;
}

interface ConfigItem {
  key: string;
  value: number;
}

type AdminTab = "verification" | "disputes" | "commission" | "analytics";

type WriterVerificationFilter = "pending" | "verified";

const adminTabs: Array<{ id: AdminTab; label: string; path: string; icon: typeof UserCheck }> = [
  { id: "verification", label: "Writer Verifications", path: "/admin-dashboard/writer-verifications", icon: UserCheck },
  { id: "disputes", label: "Dispute Center", path: "/admin-dashboard/disputes", icon: Scale },
  { id: "commission", label: "Commission Config", path: "/admin-dashboard/commission-config", icon: Percent },
  { id: "analytics", label: "Analytics Summary", path: "/admin-dashboard/analytics", icon: BarChart3 },
];

const getAdminTabFromPath = (pathname: string): AdminTab => {
  if (pathname.includes("/disputes")) return "disputes";
  if (pathname.includes("/commission-config")) return "commission";
  if (pathname.includes("/analytics")) return "analytics";
  return "verification";
};

const AdminDashboard = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => getAdminTabFromPath(location.pathname));
  
  // Data States
  const [pendingWriters, setPendingWriters] = useState<PendingWriter[]>([]);
  const [verifiedWriters, setVerifiedWriters] = useState<VerifiedWriter[]>([]);
  const [writerVerificationFilter, setWriterVerificationFilter] = useState<WriterVerificationFilter>("pending");
  const [disputedOrders, setDisputedOrders] = useState<DisputedOrder[]>([]);
  const [config, setConfig] = useState<ConfigItem[]>([]);
  const [analytics, setAnalytics] = useState({
    gmv: 0,
    revenue: 0,
    activeWriters: 0,
    disputeRate: 0,
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(getAdminTabFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (profile?.role === "admin") {
      fetchAdminData();
    }
  }, [profile, activeTab, writerVerificationFilter]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      if (activeTab === "verification") {
        if (writerVerificationFilter === "pending") {
          const { data, error } = await supabase
            .from("writer_applications")
            .select("*")
            .eq("status", "pending");

          if (error) throw error;
          setPendingWriters(data || []);
        } else {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, writer_status, verified, created_at")
            .eq("role", "writer")
            .eq("verified", true)
            .eq("writer_status", "approved");

          if (error) throw error;
          setVerifiedWriters(data || []);
        }

      } else if (activeTab === "disputes") {
        // Fetch disputed orders
        const { data, error } = await supabase
          .from("assignments")
          .select("*")
          .eq("status", "disputed");

        if (error) throw error;
        setDisputedOrders(data || []);

      } else if (activeTab === "commission") {
        // Fetch config
        const { data, error } = await supabase
          .from("commission_config")
          .select("*");

        if (error) throw error;
        setConfig(data || []);

      } else if (activeTab === "analytics") {
        // Fetch analytics
        const { data: completedOrders } = await supabase
          .from("assignments")
          .select("budget")
          .eq("status", "completed");

        const gmv = completedOrders?.reduce((acc, curr) => acc + curr.budget, 0) || 0;

        const { data: commissions, error: commissionError } = await supabase
  .from("platform_commissions")
  .select("amount");

if (commissionError) throw commissionError;

const revenue =
  commissions?.reduce(
    (total, item) => total + Number(item.amount || 0),
    0
  ) || 0;

        const { count: writersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "writer")
          .eq("verified", true);

        const { count: totalOrders } = await supabase
          .from("assignments")
          .select("*", { count: "exact", head: true });

        const { count: disputedCount } = await supabase
          .from("assignments")
          .select("*", { count: "exact", head: true })
          .eq("status", "disputed");

        const disputeRate = totalOrders ? ((disputedCount || 0) / totalOrders) * 100 : 0;
console.log("COMPLETED ORDERS:", completedOrders);
console.log("GMV:", gmv);

console.log("COMMISSIONS:", commissions);
console.log("REVENUE:", revenue);

console.log("WRITERS COUNT:", writersCount);
console.log("DISPUTED COUNT:", disputedCount);
console.log("TOTAL ORDERS:", totalOrders);
        setAnalytics({
          gmv,
          revenue,
          activeWriters: writersCount || 0,
          disputeRate,
        });

      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------- */
  /* WRITER ACTIONS */
  /* ----------------------------- */

 const handleApproveWriter = async (writerId: string) => {
  try {
    console.log("APPROVING USER:", writerId);

    setActionId(writerId);

    // UPDATE PROFILE
    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .update({
        role: "writer",
        verified: true,
        writer_status: "approved",
      })
      .eq("id", writerId)
       .select()
  .maybeSingle();

    console.log("PROFILE DATA:", profileData);
    console.log("PROFILE ERROR:", profileError);
    console.log("WRITER ID:", writerId);

const { data: existingProfile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", writerId);

console.log("EXISTING PROFILE:", existingProfile);

    if (profileError) {
      throw profileError;
    }

    // UPDATE APPLICATION
    const { error: appError } = await supabase
      .from("writer_applications")
      .update({
        status: "approved",
      })
      .eq("user_id", writerId);

    if (appError) {
      throw appError;
    }

    alert("Writer approved successfully!");

    fetchAdminData();

  } catch (err: any) {
    console.error(err);
    alert(err.message);
  } finally {
    setActionId(null);
  }
};

  const handleRejectWriter = async (writerId: string) => {
  try {
    setActionId(writerId);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        verified: false,
        writer_status: "rejected",
      })
      .eq("id", writerId);

    if (profileError) throw profileError;

    const { error: appError } = await supabase
      .from("writer_applications")
      .update({
        status: "rejected",
      })
      .eq("user_id", writerId);

    if (appError) throw appError;

    alert("Writer rejected");

    fetchAdminData();

  } catch (err: any) {
    alert(err.message);
  } finally {
    setActionId(null);
  }
};

  /* ----------------------------- */
  /* DISPUTE ACTIONS */
  /* ----------------------------- */

  const handleResolveDispute = async (
    order: DisputedOrder,
    outcome: "refund" | "release" | "split"
  ) => {
    try {
      setActionId(order.id);
      
      const refundRate = outcome === "refund" ? 1.0 : outcome === "split" ? 0.5 : 0;
      const releaseRate = outcome === "release" ? 0.8 : outcome === "split" ? 0.4 : 0;

      const customerRefund = order.budget * refundRate;
      const writerPayout = order.budget * releaseRate;

      // 1. Release to writer if applicable
      if (writerPayout > 0) {
        const { data: writerProfile } = await supabase
          .from("profiles")
          .select("available_balance")
          .eq("id", order.writer_id)
          .single();

        const currentBalance = Number(writerProfile?.available_balance || 0);
        await supabase
          .from("profiles")
          .update({
            available_balance: currentBalance + writerPayout,
          })
          .eq("id", order.writer_id);

        // Log Payout
        await supabase.from("payments").insert([
          {
            assignment_id: order.id,
            user_id: order.writer_id,
            amount: writerPayout,
            type: "payout",
            status: "success",
          },
        ]);
      }

      // 2. Refund to Customer  if applicable
      if (customerRefund > 0) {
        await supabase.from("payments").insert([
          {
            assignment_id: order.id,
            user_id: order.user_id,
            amount: customerRefund,
            type: "refund",
            status: "success",
          },
        ]);
      }

      // 3. Update assignment lifecycle
      const finalStatus = outcome === "refund" ? "cancelled" : "completed";
      const finalPaymentStatus = outcome === "refund" ? "refunded" : "released";

      const { error } = await supabase
        .from("assignments")
        .update({
          status: finalStatus,
          payment_status: finalPaymentStatus,
          completed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) throw error;

      // 4. Notify both parties
      await supabase.from("notifications").insert([
        {
          user_id: order.user_id,
          title: "Dispute Resolved",
          message: `Dispute on "${order.title}" resolved. Outcome: ${outcome === "refund" ? "Full Refund" : outcome === "release" ? "Payout Released to Writer" : "Split Payout"}.`,
          read: false,
        },
        {
          user_id: order.writer_id,
          title: "Dispute Resolved",
          message: `Dispute on "${order.title}" resolved. Outcome: ${outcome === "refund" ? "Refunded to Customer" : outcome === "release" ? "Earnings Credited" : "Split Payout credited"}.`,
          read: false,
        },
      ]);

      alert(`Dispute resolved successfully: ${outcome.toUpperCase()}`);
      setDisputedOrders(prev => prev.filter(d => d.id !== order.id));
    } catch (err: any) {
      alert("Resolution failed: " + err.message);
    } finally {
      setActionId(null);
    }
  };

  /* ----------------------------- */
  /* CONFIG ACTIONS */
  /* ----------------------------- */

  const handleUpdateConfig = async (key: string, currentValue: number) => {
    const newValue = window.prompt(`Update ${key} coefficient:`, currentValue.toString());
    if (newValue === null) return;

    const parsed = Number(newValue);
    if (isNaN(parsed)) {
      alert("Please enter a valid numeric value.");
      return;
    }

    try {
      const { error } = await supabase
        .from("commission_config")
        .update({ value: parsed })
        .eq("key", key);

      if (error) throw error;

      alert(`${key} updated successfully.`);
      setConfig(prev => prev.map(c => c.key === key ? { ...c, value: parsed } : c));
    } catch (err: any) {
      alert("Failed to update config: " + err.message);
    }
  };

  if (profile?.role !== "admin") {
    return (
      <>
        <div className="flex h-[50vh] flex-col items-center justify-center text-center text-white/50">
          <ShieldAlert size={48} className="text-red-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white">Access Denied</h2>
          <p className="text-sm mt-1">This panel is restricted to NoteMate Administrators only.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-white">Admin Dashboard</h1>
          <p className="mt-2 text-white/50">Manage writer verifications, commission configs, analytics, and disputes.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-white/10 shrink-0 overflow-x-auto">
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`px-6 py-4 font-bold text-sm border-b-2 transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-violet-500 text-white"
                    : "border-transparent text-white/40 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Panels */}
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white flex items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
            Loading admin console...
          </div>
        ) : (
          <>
            {/* 1. WRITER VERIFICATIONS */}
            {activeTab === "verification" && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-white">
                    {writerVerificationFilter === "pending" ? "Pending Writer Approval Queue" : "Verified Writers"}
                  </h2>
                  <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70">
                    {writerVerificationFilter === "pending" ? pendingWriters.length : verifiedWriters.length} entries
                  </div>
                </div>

                <div className="mb-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => setWriterVerificationFilter("pending")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      writerVerificationFilter === "pending"
                        ? "bg-violet-500 text-white"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setWriterVerificationFilter("verified")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      writerVerificationFilter === "verified"
                        ? "bg-violet-500 text-white"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    Verified
                  </button>
                </div>

                {writerVerificationFilter === "pending" ? (
                  pendingWriters.length === 0 ? (
                    <p className="text-xs text-white/40 text-center py-8">Approval queue is empty.</p>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      {pendingWriters.map((writer) => (
                        <div
                          key={writer.id}
                          className="rounded-2xl border border-white/5 bg-white/5 p-5 flex flex-col justify-between"
                        >
                          <div>
                            <h3 className="text-base font-bold text-white">{writer.full_name}</h3>
                            <span className="text-[10px] text-white/40 block mt-1 font-mono">UID: {writer.user_id}</span>
                            
                            <div className="mt-4 rounded-xl bg-white/5 p-3 border border-white/5 flex items-center justify-between">
                              <span className="text-xs text-white/60">College ID Photo</span>
                              <a
                                href={writer.college_id_key}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-violet-400 font-bold hover:underline flex items-center gap-1"
                              >
                                <Eye size={14} />
                                View ID Document
                              </a>
                            </div>
                          </div>

                          <div className="mt-6 flex gap-3">
                            <button
                              onClick={() => handleApproveWriter(writer.user_id)}
                              disabled={actionId === writer.id}
                              className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              <Check size={14} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectWriter(writer.user_id)}
                              disabled={actionId === writer.id}
                              className="flex-1 rounded-xl border border-red-500/20 bg-red-500/5 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              <X size={14} />
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : verifiedWriters.length === 0 ? (
                  <p className="text-xs text-white/40 text-center py-8">No verified writers found.</p>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {verifiedWriters.map((writer) => (
                      <div
                        key={writer.id}
                        className="rounded-2xl border border-white/5 bg-white/5 p-5"
                      >
                        <h3 className="text-base font-bold text-white">{writer.full_name}</h3>
                        <span className="text-[10px] text-white/40 block mt-1 font-mono">UID: {writer.id}</span>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
                          <span className="rounded-full bg-emerald-500/10 px-2 py-1">Verified</span>
                          <span className="rounded-full bg-white/5 px-2 py-1">{writer.writer_status || "writer"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. DISPUTE RESOLUTIONS */}
            {activeTab === "disputes" && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-xl font-bold text-white mb-6">Disputed Orders Center ({disputedOrders.length})</h2>
                {disputedOrders.length === 0 ? (
                  <p className="text-xs text-white/40 text-center py-8">No disputed orders available.</p>
                ) : (
                  <div className="space-y-6">
                    {disputedOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-white/5 bg-white/5 p-6 flex flex-col justify-between gap-6"
                      >
                        <div className="flex justify-between items-start flex-col gap-3 sm:flex-row sm:items-center border-b border-white/5 pb-4">
                          <div>
                            <h3 className="text-lg font-black text-white">{order.title}</h3>
                            <p className="text-xs text-white/40 mt-1 capitalize">Subject: {order.subject} | Escrow Balance: <strong className="text-violet-400 font-bold">₹{order.budget}</strong></p>
                          </div>
                          <span className="rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 border border-red-500/20 uppercase">
                            Disputed
                          </span>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-3">
                            <span className="text-[10px] font-bold text-white/30 uppercase">Evidence & Proofs</span>
                            {order.proof_keys && order.proof_keys.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {order.proof_keys.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-violet-300 hover:bg-white/10"
                                  >
                                    <Eye size={12} />
                                    Proof Document #{idx + 1}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-white/40 italic">No progress proof photos uploaded by writer.</p>
                            )}
                          </div>

                          <div className="space-y-3">
                            <span className="text-[10px] font-bold text-white/30 uppercase">Review Coordination</span>
                            <p className="text-xs text-white/50 leading-relaxed">
                              Resolve the escrow dispute in accordance with platform policies. Check messaging transcript before resolving.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-3">
                          <button
                            onClick={() => handleResolveDispute(order, "refund")}
                            disabled={actionId === order.id}
                            className="flex-1 min-w-[120px] rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            Full Refund to Customer 
                          </button>
                          <button
                            onClick={() => handleResolveDispute(order, "release")}
                            disabled={actionId === order.id}
                            className="flex-1 min-w-[120px] rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            Release Payout to Writer
                          </button>
                          <button
                            onClick={() => handleResolveDispute(order, "split")}
                            disabled={actionId === order.id}
                            className="flex-1 min-w-[120px] rounded-xl bg-amber-600 py-3 text-xs font-bold text-white hover:bg-amber-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            Split Payout (50/50)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. COMMISSION CONFIG */}
            {activeTab === "commission" && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-xl font-bold text-white mb-6">Commission & Pricing Coefficients</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs text-white/40 uppercase">
                        <th className="pb-3 font-semibold">Parameter Key</th>
                        <th className="pb-3 font-semibold">Coefficient Value</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm text-white/70">
                      {config.map((item) => (
                        <tr key={item.key}>
                          <td className="py-4 font-mono text-xs">{item.key}</td>
                          <td className="py-4 font-bold text-white">
                            {item.key.includes("RATE") || item.key.includes("CHARGE") || item.key.includes("VALUE") ? `₹ ${item.value}` : `${item.value}x`}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => handleUpdateConfig(item.key, item.value)}
                              className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 text-xs text-violet-400 hover:bg-violet-500/10 transition-all"
                            >
                              Edit Rate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. PLATFORM ANALYTICS */}
            {activeTab === "analytics" && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-violet-600/10 text-violet-400 flex items-center justify-center shrink-0">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase block">Gross Merchandise Value</span>
                    <span className="text-2xl font-black text-white">₹{analytics.gmv.toLocaleString()}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Percent size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase block">Platform Commission Revenue</span>
                    <span className="text-2xl font-black text-white">₹{analytics.revenue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <UserCheck size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase block">Active Verified Writers</span>
                    <span className="text-2xl font-black text-white">{analytics.activeWriters}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                    <AlertOctagon size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase block">Platform Dispute Rate</span>
                    <span className="text-2xl font-black text-white">{analytics.disputeRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default AdminDashboard;
