import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";
import { useAuth } from "../../context/auth-context";
import {
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  X,
  CreditCard,
} from "lucide-react";

interface PaymentRecord {
  id: string;
  assignment_id: string;
  amount: number;
  type: "payment" | "payout" | "refund";
  status: "pending" | "success" | "failed";
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  created_at: string;
}

interface AssignmentMap {
  [key: string]: string;
}

const Payments = () => {
  const { profile, refreshProfile } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  
  // Withdrawal States
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"upi" | "bank">("upi");
  const [withdrawUpi, setWithdrawUpi] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [profile]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch assignments to resolve titles
      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select("id, title");

      const map: AssignmentMap = {};
      assignmentsData?.forEach((a) => {
        map[a.id] = a.title;
      });
      setAssignments(map);

      // 2. Fetch payment transactions for the user
      const { data: paymentsData, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(paymentsData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------- */
  /* WITHDRAW SIMULATION */
  /* ----------------------------- */

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);

    if (!profile) return;
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (amount > profile.available_balance) {
      alert("Withdrawal amount exceeds your available balance.");
      return;
    }

    const upiRegex = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;

    if (payoutMethod === "upi" && !upiRegex.test(withdrawUpi)) {
      alert("Enter a valid UPI ID");
      return;
    }

    try {
      setWithdrawLoading(true);

      const { error } = await supabase.rpc("request_withdrawal", {
        p_amount: amount,
        p_method: payoutMethod,
        p_upi_id: payoutMethod === "upi" ? withdrawUpi : null,
        p_account_number: payoutMethod === "bank" ? bankAccount : null,
        p_ifsc_code: payoutMethod === "bank" ? bankIfsc : null,
      });

      if (error) {
        alert("Failed to request withdrawal: " + error.message);
        return;
      }

      alert(`Withdrawal request of ?${amount} submitted. It will be processed through Razorpay Transfer.`);
      setWithdrawOpen(false);
      setWithdrawAmount("");
      setWithdrawUpi("");
      setBankAccount("");
      setBankIfsc("");

      await refreshProfile();
      await fetchPayments();
    } catch (err) {
      console.error(err);
      alert("Withdrawal request failed.");
    } finally {
      setWithdrawLoading(false);
    }
  };
  return (
    <>
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-4xl font-black text-white">Payments</h1>
            <p className="mt-2 text-white/50">View your transaction history & ledger balances.</p>
          </div>
          {profile?.role === "writer" && (
            <button
              onClick={() => setWithdrawOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 px-6 py-3 font-semibold text-white hover:opacity-90 shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Wallet size={18} />
              Withdraw Earnings
            </button>
          )}
        </div>

        {/* Financial Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-violet-600/10 text-violet-400 flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Available Balance</span>
              <span className="text-2xl font-black text-white">
                ₹{profile?.role === "writer" ? (profile.available_balance || 0).toLocaleString() : "0"}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Total Payouts</span>
              <span className="text-2xl font-black text-white">
                ₹{payments
                  .filter((p) => p.type === "payout" && p.status === "success")
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl flex items-center gap-4 md:col-span-2 lg:col-span-1">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CreditCard size={24} />
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Total Payments</span>
              <span className="text-2xl font-black text-white">
                ₹{payments
                  .filter((p) => p.type === "payment" && p.status === "success")
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white mb-6">Transaction History</h2>

          {loading ? (
            <div className="text-xs text-white/40 text-center py-8">Loading transactions...</div>
          ) : payments.length === 0 ? (
            <div className="text-xs text-white/40 text-center py-8">No payments available in history.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-white/40 uppercase">
                    <th className="pb-3 font-semibold">Transaction ID</th>
                    <th className="pb-3 font-semibold">Reference Item</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-white/70">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-4 font-mono text-xs">{p.id.slice(0, 13)}</td>
                      <td className="py-4 font-medium text-white">
                        {assignments[p.assignment_id] || "NoteMate System Payout"}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          {p.type === "payout" ? (
                            <span className="text-red-400 bg-red-500/10 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">Debit</span>
                          ) : (
                            <span className="text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">Credit</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 font-bold text-white">₹{p.amount}</td>
                      <td className="py-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 text-xs text-white/40">
                        {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* WITHDRAWAL MODAL */}
      {withdrawOpen && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#081120] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Withdrawal Payout</h3>
              <button onClick={() => setWithdrawOpen(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="rounded-2xl bg-white/5 p-4 border border-white/5 flex items-center justify-between">
                <span className="text-xs text-white/50">Maximum Available:</span>
                <span className="text-lg font-black text-white">₹{profile.available_balance}</span>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-white/70">
                  Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={profile.available_balance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-2xl border border-white/10 bg-[#030712] px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-white/70">
                  Payout Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("upi")}
                    className={`rounded-xl py-3 text-xs font-semibold uppercase border transition-all duration-300 ${
                      payoutMethod === "upi"
                        ? "border-violet-500 bg-violet-500/10 text-white"
                        : "border-white/5 bg-[#030712] text-white/40"
                    }`}
                  >
                    UPI Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("bank")}
                    className={`rounded-xl py-3 text-xs font-semibold uppercase border transition-all duration-300 ${
                      payoutMethod === "bank"
                        ? "border-violet-500 bg-violet-500/10 text-white"
                        : "border-white/5 bg-[#030712] text-white/40"
                    }`}
                  >
                    Bank Account
                  </button>
                </div>
              </div>

              {payoutMethod === "upi" ? (
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">UPI ID</label>
                  <input
                    type="text"
                    required
                    value={withdrawUpi}
                    onChange={(e) => setWithdrawUpi(e.target.value)}
                    placeholder="writer@okicici"
                    className="w-full rounded-xl border border-white/10 bg-[#030712] px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-white/50">Bank Account Number</label>
                    <input
                      type="text"
                      required
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="Account Number"
                      className="w-full rounded-xl border border-white/10 bg-[#030712] px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-white/50">IFSC Code</label>
                    <input
                      type="text"
                      required
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value)}
                      placeholder="IFSC Code"
                      className="w-full rounded-xl border border-white/10 bg-[#030712] px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={withdrawLoading}
                className="mt-6 w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {withdrawLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Transferring Payout...
                  </>
                ) : (
                  <>
                    <ArrowUpRight size={16} />
                    Confirm Withdrawal (₹{withdrawAmount || "0"})
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Payments;
