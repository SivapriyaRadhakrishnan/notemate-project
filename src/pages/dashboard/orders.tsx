
import { useEffect, useState } from "react";

import { supabase } from "../../supabase/client";
import { releasePaymentToWriter } from "../../lib/assignment-utils";

import {
  CalendarDays,
  Trash2,
  Eye,
  Pencil,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  X,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";

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
  file_url?: string;
  file_keys?: string[];
  proof_keys?: string[];
  final_proof_keys?: string[];
  writer_id?: string;
  created_at: string;
}

const Orders = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isWriter = profile?.role === "writer";
  const isCustomer = profile?.role === "customer";
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Edit Modal States
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editPages, setEditPages] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Payment Checkout States
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payingAssignment, setPayingAssignment] = useState<Assignment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

  const loadRazorpayScript = async () => {
    return new Promise<boolean>((resolve) => {
      if ((window as any).Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Review Modal States
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewingAssignment, setReviewingAssignment] = useState<Assignment | null>(null);
  const [ratingOverall, setRatingOverall] = useState(5);
  const [ratingHandwriting, setRatingHandwriting] = useState(5);
  const [ratingSpeed, setRatingSpeed] = useState(5);
  const [ratingAccuracy, setRatingAccuracy] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  /* ----------------------------- */
  /* FETCH ASSIGNMENTS */
  /* ----------------------------- */

  useEffect(() => {
    fetchAssignments();
  }, [profile?.role]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !profile?.role) return;

      let query = supabase
        .from("assignments")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      query = isWriter ? query.eq("writer_id", user.id) : query.eq("user_id", user.id);

      const { data, error } = await query;

      if (error) {
        console.log(error.message);
        return;
      }

      setAssignments(data || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------- */
  /* OPEN EDIT MODAL */
  /* ----------------------------- */

  const openEditModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setEditTitle(assignment.title);
    setEditSubject(assignment.subject);
    setEditBudget(assignment.budget.toString());
    setEditPages(assignment.pages.toString());
    setEditDeadline(assignment.deadline);
    setEditStatus(assignment.status);
    setEditOpen(true);
  };

  /* ----------------------------- */
  /* UPDATE ASSIGNMENT */
  /* ----------------------------- */

  const updateAssignment = async () => {
    if (!selectedAssignment) return;

    const { error } = await supabase
      .from("assignments")
      .update({
        title: editTitle,
        subject: editSubject,
        budget: Number(editBudget),
        pages: Number(editPages),
        deadline: editDeadline,
        status: editStatus,
      })
      .eq("id", selectedAssignment.id);

    if (error) {
      alert(error.message);
      return;
    }

    setAssignments((prev) =>
      prev.map((item) =>
        item.id === selectedAssignment.id
          ? {
              ...item,
              title: editTitle,
              subject: editSubject,
              budget: Number(editBudget),
              pages: Number(editPages),
              deadline: editDeadline,
              status: editStatus,
            }
          : item
      )
    );

    setEditOpen(false);
    alert("Updated successfully!");
  };

  /* ----------------------------- */
  /* DELETE */
  /* ----------------------------- */

  const deleteAssignment = async (id: string) => {
    const confirmDelete = window.confirm("Delete this assignment?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("assignments").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setAssignments((prev) => prev.filter((item) => item.id !== id));
  };

  /* ----------------------------- */
  /* RAZORPAY PAYMENT CHECKOUT */
  /* ----------------------------- */

  const handleSimulatePayment = async () => {
    if (!payingAssignment) return;

    if (!razorpayKey) {
      alert("Razorpay is not configured. Please set VITE_RAZORPAY_KEY_ID.");
      return;
    }

    try {
      setPaymentLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const loaded = await loadRazorpayScript();
      if (!loaded || !(window as any).Razorpay) {
        alert("Unable to load Razorpay checkout. Please check your connection.");
        return;
      }

      const paymentServerBaseUrl =
        import.meta.env.VITE_PAYMENT_VERIFY_URL
          ? import.meta.env.VITE_PAYMENT_VERIFY_URL.replace(/\/verify-payment\/?$/i, "")
          : "http://localhost:3000";

      const createOrderUrl = `${paymentServerBaseUrl}/create-order`;
      const verifyUrl = `${paymentServerBaseUrl}/verify-payment`;

      const createOrderPayload = {
        amount: payingAssignment.budget * 100,
        currency: "INR",
        receipt: payingAssignment.id,
        notes: {
          assignment_id: payingAssignment.id,
          customer_id: user.id,
        },
      };

      console.log("[orders.tsx] Create order request:", createOrderUrl, createOrderPayload);

      const createOrderResponse = await fetch(createOrderUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createOrderPayload),
      });

      const createOrderResult = await createOrderResponse.json();
      console.log("[orders.tsx] Create order response:", createOrderResponse.status, createOrderResult);

      if (!createOrderResponse.ok) {
        throw new Error(createOrderResult?.error || "Unable to create Razorpay order.");
      }

      const orderId = createOrderResult.order_id;

      const options = {
        key: razorpayKey,
        amount: payingAssignment.budget * 100,
        currency: "INR",
        order_id: orderId,
        name: "NoteMate",
        description: `Payment for ${payingAssignment.title}`,
        image: "",
        handler: async (response: any) => {
          if (!response?.razorpay_payment_id) {
            alert("Payment was not completed.");
            return;
          }

          try {
            const verifyBody = {
              assignment_id: payingAssignment.id,
              user_id: user.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };

              console.log("[orders.tsx] Verify payment request:", verifyUrl, verifyBody);

            const verifyResponse = await fetch(verifyUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
                body: JSON.stringify(verifyBody),
            });

            const verifyResult = await verifyResponse.json();
              console.log("[orders.tsx] Verify payment response:", verifyResponse.status, verifyResult);
            if (!verifyResponse.ok) {
              throw new Error(verifyResult?.error || "Payment verification failed.");
            }

            alert("Payment successful! Funds are now securely held in escrow.");
            setCheckoutOpen(false);
            setPayingAssignment(null);
            fetchAssignments();
          } catch (paymentErr: any) {
            console.error(paymentErr);
            alert("Payment processing failed: " + (paymentErr?.message || "Please try again."));
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: profile?.full_name || "",
          email: user.email || "",
        },
        notes: {
          assignment_id: payingAssignment.id,
          customer_id: user.id,
        },
        theme: {
          color: "#7c3aed",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        console.error("Razorpay payment failed", response);
        alert("Payment failed. Please try again.");
        setPaymentLoading(false);
      });
      rzp.open();
      setPaymentLoading(false);
    } catch (err) {
      console.log(err);
      alert("Payment checkout could not be opened.");
      setPaymentLoading(false);
    }
  };

  /* ----------------------------- */
  /* DELIVERY LIFE CYCLE ACTIONS */
  /* ----------------------------- */

  const confirmDelivery = (assignment: Assignment) => {
    setReviewingAssignment(assignment);
    setRatingOverall(5);
    setRatingHandwriting(5);
    setRatingSpeed(5);
    setRatingAccuracy(5);
    setReviewText("");
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!reviewingAssignment) return;

    try {
      setReviewLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const writerId = reviewingAssignment.writer_id;
      if (!writerId) return;

      // Release escrowed payment and record commission.
      await releasePaymentToWriter(reviewingAssignment.id, writerId);

      // 4. Create review entry
      const { error: reviewError } = await supabase.from("reviews").insert([
        {
          assignment_id: reviewingAssignment.id,
          reviewer_id: user.id,
          reviewee_id: writerId,
          rating_overall: ratingOverall,
          rating_handwriting: ratingHandwriting,
          rating_speed: ratingSpeed,
          rating_accuracy: ratingAccuracy,
          review: reviewText,
        },
      ]);

      if (reviewError) {
        alert("Failed to submit review: " + reviewError.message);
        setReviewLoading(false);
        return;
      }

      // 5. Recalculate average rating of writer
      const { data: writerProfile, error: writerProfileError } = await supabase
        .from("profiles")
        .select("rating, rating_count")
        .eq("id", writerId)
        .single();

      if (writerProfileError) {
        alert("Failed to refresh writer rating: " + writerProfileError.message);
        setReviewLoading(false);
        return;
      }

      const newRatingCount = (writerProfile?.rating_count || 0) + 1;
      const currentRatingSum = (writerProfile?.rating || 0) * (writerProfile?.rating_count || 0);
      const newAverageRating = (currentRatingSum + ratingOverall) / newRatingCount;

      await supabase
        .from("profiles")
        .update({
          rating: Number(newAverageRating.toFixed(2)),
          rating_count: newRatingCount,
        })
        .eq("id", writerId);

      // 6. Update Assignment Status to Completed
      await supabase
        .from("assignments")
        .update({
          status: "completed",
          payment_status: "released",
          completed_at: new Date().toISOString(),
        })
        .eq("id", reviewingAssignment.id);

      // 7. Add notification for the writer
      await supabase.from("notifications").insert([
        {
          user_id: writerId,
          title: "Earnings Credited",
          message: `Your work for "${reviewingAssignment.title}" was confirmed and your earnings have been credited to your balance!`,
          read: false,
        },
      ]);

      alert("Delivery confirmed! Review submitted, and writer earnings released.");
      setReviewOpen(false);
      setReviewingAssignment(null);
      fetchAssignments();
    } catch (err) {
      console.log(err);
      alert("Error confirming delivery.");
    } finally {
      setReviewLoading(false);
    }
  };

  const raiseDispute = async (assignment: Assignment) => {
    const confirmDispute = window.confirm(
      "Are you sure you want to raise a dispute? The escrowed payment will be frozen and reviewed by NoteMate Admins."
    );
    if (!confirmDispute) return;

    try {
      const { error } = await supabase
        .from("assignments")
        .update({
          status: "disputed",
        })
        .eq("id", assignment.id);

      if (error) {
        alert("Failed to raise dispute: " + error.message);
        return;
      }

      // Send notifications to Admin and Writer
      if (assignment.writer_id) {
        await supabase.from("notifications").insert([
          {
            user_id: assignment.writer_id,
            title: "Dispute Raised",
            message: `A dispute has been raised on "${assignment.title}". The escrow balance is frozen until review.`,
            read: false,
          },
        ]);
      }

      alert("Dispute raised. The escrow is now frozen. Admins have been notified.");
      fetchAssignments();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-4xl font-black text-white">{isWriter ? "Orders" : "My Assignments"}</h1>
            <p className="mt-2 text-white/50">
              {isWriter ? "Track accepted assignment work and delivery status." : "Track your submitted assignments & escrow status."}
            </p>
          </div>
          {isCustomer && (
            <button
              onClick={() => navigate("/customer/create-assignment")}
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-blue-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition-all duration-300"
            >
              Post New Assignment
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white flex items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
            Loading assignments...
          </div>
        )}

        {/* Empty */}
        {!loading && assignments.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
            {isWriter ? "No accepted orders yet." : "No assignments submitted yet. Get started by posting one!"}
          </div>
        )}

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(isWriter ? `/writer-dashboard/orders/${item.id}` : `/customer/assignments/${item.id}`)}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:border-violet-500/30 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-violet-500/10 flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-black text-white line-clamp-1">{item.title}</h2>
                    <p className="mt-1 text-xs text-white/50">{item.subject}</p>
                  </div>

                  <span
                    className={`rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                      item.status === "pending"
                        ? "bg-amber-500/10 text-amber-400"
                        : item.status === "accepted"
                        ? "bg-blue-500/10 text-blue-400"
                        : item.status === "in_progress"
                        ? "bg-violet-500/10 text-violet-400"
                        : item.status === "ready"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : item.status === "completed"
                        ? "bg-ziAnc-500/10 text-zinc-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-6 space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">Escrow Value</span>
                    <span className="text-white font-black">₹{item.budget}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/40">Pages</span>
                    <span className="text-white">{item.pages} pages</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/40">Urgency</span>
                    <span className="text-white capitalize">{item.urgency || "Normal"}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/40">Delivery Mode</span>
                    <span className="text-white capitalize">
                      {item.delivery_mode === "physical" ? "Physical" : "Digital PDF"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Deadline</span>
                    <div className="flex items-center gap-1.5 text-white font-semibold">
                      <CalendarDays size={14} className="text-violet-400" />
                      <span>{item.deadline}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Escrow Ledger</span>
                    <span
                      className={`rounded-lg px-2 py-1 text-[10px] font-semibold border ${
                        item.payment_status === "held"
                          ? "bg-violet-500/10 text-violet-300 border-violet-500/20"
                          : item.payment_status === "released"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                          : item.payment_status === "refunded"
                          ? "bg-red-500/10 text-red-300 border-red-500/20"
                          : "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                      }`}
                    >
                      {item.payment_status === "held" && "Escrow Held"}
                      {item.payment_status === "released" && "Released"}
                      {item.payment_status === "refunded" && "Refunded"}
                      {item.payment_status === "pending" && "Payment Pending"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-8 pt-4 border-t border-white/5 space-y-3">
                {/* 1. Pay Now Button for Unpaid Orders */}
                {isCustomer && item.payment_status === "pending" && (
                  <button
                    onClick={() => {
                      setPayingAssignment(item);
                      setCheckoutOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all duration-300"
                  >
                    <CreditCard size={16} />
                    Pay Upfront (₹{item.budget})
                  </button>
                )}

                {/* 2. Chat with Writer if Accepted */}
                {item.writer_id && (
                  <button
                    onClick={() => navigate(isWriter ? "/writer-dashboard/messages" : "/customer/messages")}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-500/20 bg-violet-500/5 py-3 text-sm font-bold text-violet-400 hover:bg-violet-500/10 transition-all duration-300"
                  >
                    <MessageSquare size={16} />
                    Chat with Writer
                  </button>
                )}

                {/* 3. Confirm Delivery Actions (When writer submits proof / Ready) */}
                {isCustomer && item.status === "ready" && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => confirmDelivery(item)}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition-all duration-300"
                    >
                      <CheckCircle2 size={14} />
                      Confirm
                    </button>
                    <button
                      onClick={() => raiseDispute(item)}
                      className="flex items-center justify-center gap-1.5 rounded-2xl bg-red-600/20 border border-red-500/30 py-3 text-xs font-bold text-red-400 hover:bg-red-600/30 transition-all duration-300"
                    >
                      <AlertTriangle size={14} />
                      Dispute
                    </button>
                  </div>
                )}

                {/* Proof download if writer submitted keys */}
                {(item.proof_keys?.length || 0) > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-white/40 uppercase">Writer Proof Photos</p>
                    <div className="flex flex-wrap gap-2">
                      {item.proof_keys?.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs text-violet-300 hover:bg-white/10"
                        >
                          <Eye size={12} />
                          Proof #{idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* General Actions */}
                <div className="flex gap-2">
                  {item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-xs font-medium text-white hover:bg-white/10 transition-all duration-300"
                    >
                      <Eye size={14} />
                      Attached File
                    </a>
                  )}

                  {isCustomer && item.status === "pending" && item.payment_status === "pending" && (
                    <>
                      <button
                        onClick={() => openEditModal(item)}
                        className="flex items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-blue-400 hover:bg-blue-500/20 transition-all duration-300"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteAssignment(item.id)}
                        className="flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 hover:bg-red-500/20 transition-all duration-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RAZORPAY SIMULATOR MODAL */}
      {checkoutOpen && payingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#081120] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-violet-600 rounded-lg flex items-center justify-center font-black text-white text-sm">
                  R
                </div>
                <h3 className="text-xl font-bold text-white">Razorpay Secure</h3>
              </div>
              <button
                onClick={() => {
                  setCheckoutOpen(false);
                  setPayingAssignment(null);
                }}
                className="text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 border border-white/5 mb-6">
              <p className="text-xs text-white/50">Paying for:</p>
              <h4 className="text-base font-bold text-white mt-1">{payingAssignment.title}</h4>
              <div className="flex justify-between mt-3 text-xs border-t border-white/5 pt-3">
                <span className="text-white/40">Order ID:</span>
                <span className="text-white font-mono">{payingAssignment.id.slice(0, 13)}</span>
              </div>
              <div className="flex justify-between mt-1.5 text-xs">
                <span className="text-white/40">Amount:</span>
                <span className="text-violet-400 font-bold">₹{payingAssignment.budget}</span>
              </div>
            </div>

            {/* Simulated Payment Methods */}
            <div className="space-y-4">
              <label className="text-xs font-semibold text-white/70 block">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(["upi", "card", "netbanking"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-xl py-3 text-xs font-semibold uppercase border transition-all duration-300 ${
                      paymentMethod === method
                        ? "border-violet-500 bg-violet-500/10 text-white"
                        : "border-white/5 bg-[#030712] text-white/40 hover:border-white/10"
                    }`}
                  >
                    {method === "upi" ? "UPI" : method === "card" ? "Card" : "NetBanking"}
                  </button>
                ))}
              </div>

              {paymentMethod === "upi" && (
                <div className="space-y-1.5 mt-4">
                  <label className="text-xs text-white/50">UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="Customer @okaxis"
                    className="w-full rounded-xl border border-white/10 bg-[#030712] px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                  />
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="space-y-3 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-white/50">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4111 2222 3333 4444"
                      className="w-full rounded-xl border border-white/10 bg-[#030712] px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/50">Expiry Date</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full rounded-xl border border-white/10 bg-[#030712] px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-white/50">CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full rounded-xl border border-white/10 bg-[#030712] px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "netbanking" && (
                <div className="space-y-1.5 mt-4">
                  <label className="text-xs text-white/50">Popular Banks</label>
                  <select className="w-full rounded-xl border border-white/10 bg-[#030712] px-4 py-3 text-sm text-white outline-none focus:border-violet-500">
                    <option>State Bank of India</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={handleSimulatePayment}
              disabled={paymentLoading}
              className="mt-8 w-full rounded-2xl bg-violet-600 py-4 font-bold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {paymentLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Opening Razorpay Checkout...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Pay with Razorpay (₹{payingAssignment.budget})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* RATINGS & REVIEW MODAL */}
      {reviewOpen && reviewingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#081120] p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-2">Confirm Delivery & Review</h3>
            <p className="text-sm text-white/50 mb-6">
              Confirming delivery releases ₹{(reviewingAssignment.budget * 0.8).toFixed(0)} directly to the writer's available balance.
            </p>

            <div className="space-y-4">
              {/* Overall */}
              <div>
                <label className="text-xs font-bold text-white/60 mb-1.5 block uppercase">Overall Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => setRatingOverall(stars)}
                      className={`text-2xl transition-all ${stars <= ratingOverall ? "text-amber-400" : "text-white/20"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Rating Cards Grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Handwriting", val: ratingHandwriting, set: setRatingHandwriting },
                  { label: "Delivery Speed", val: ratingSpeed, set: setRatingSpeed },
                  { label: "Accuracy", val: ratingAccuracy, set: setRatingAccuracy },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/5 bg-white/5 p-3 text-center">
                    <span className="text-[10px] font-bold text-white/40 block mb-2">{item.label}</span>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => item.set(s)}
                          className={`text-sm ${s <= item.val ? "text-amber-400" : "text-white/20"}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Text Review */}
              <div className="space-y-2 mt-4">
                <label className="text-xs font-bold text-white/60 block uppercase">Written Feedback</label>
                <textarea
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share details of your experience with this writer..."
                  className="w-full rounded-2xl border border-white/10 bg-[#030712] p-4 text-sm text-white outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => {
                  setReviewOpen(false);
                  setReviewingAssignment(null);
                }}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-white"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={reviewLoading}
                className="rounded-2xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500 transition-all duration-300 disabled:opacity-50"
              >
                {reviewLoading ? "Releasing Escrow..." : "Confirm & Release"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#081120] p-8">
            <h2 className="mb-6 text-3xl font-black text-white">Edit Assignment</h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-white/50">Assignment Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter assignment title"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/50">Subject</label>
                <input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Enter subject"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/50">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:border-violet-500/50"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/50">Budget (₹)</label>
                <input
                  type="number"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/50">Number of Pages</label>
                <input
                  type="number"
                  value={editPages}
                  onChange={(e) => setEditPages(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-white/50">Deadline</label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:border-violet-500/50"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-2xl border border-white/10 px-5 py-3 text-white"
              >
                Cancel
              </button>
              <button
                onClick={updateAssignment}
                className="rounded-2xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Orders;
