import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  FileText,
  IndianRupee,
  Loader2,
  ShieldCheck,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  X,
  File,
} from "lucide-react";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../supabase/client";
import FileUploader from "../../components/FileUploader";
import {
  uploadAssignmentFiles,
  updateAssignmentProofs,
  updateAssignmentStatus,
  releasePaymentToWriter,
  createNotification,
  formatFileName,
} from "../../lib/assignment-utils";

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
  final_proof_keys?: string[];
  user_id: string;
  writer_id?: string;
  created_at: string;
  accepted_at?: string;
  delivered_at?: string;
  completed_at?: string;
}

const AssignmentDetail = ({ role }: { role: "customer" | "writer" }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Writer workflow states
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [showFinalUpload, setShowFinalUpload] = useState(false);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [finalFiles, setFinalFiles] = useState<File[]>([]);
  const [deliveryNote, setDeliveryNote] = useState("");

  // Customer workflow states
  const [showReview, setShowReview] = useState(false);
  const [ratingOverall, setRatingOverall] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const isWriter = role === "writer" && profile?.role === "writer";
  const isCustomer = role === "customer" && profile?.role === "customer";

  useEffect(() => {
    if (id) {
      fetchAssignment();
    }
  }, [id]);

  const fetchAssignment = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      setAssignment(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load assignment.");
    } finally {
      setLoading(false);
    }
  };

  // Writer: Upload proof images/progress
  const handleUploadProof = async () => {
    if (!assignment || proofFiles.length === 0) {
      alert("Please select proof files.");
      return;
    }

    try {
      setActionLoading(true);
      const proofUrls = await uploadAssignmentFiles(proofFiles, assignment.id, "proof");
      
      const existingProofs = assignment.proof_keys || [];
      const allProofs = [...existingProofs, ...proofUrls];
      
      await updateAssignmentProofs(assignment.id, allProofs, "proof");
      await updateAssignmentStatus(assignment.id, "in_progress");

      // Notify customer
      await createNotification({
  userId: assignment.user_id,
  assignmentId: assignment.id,
  type: "proof_uploaded",
  title: "Progress Update",
  message: `Writer has uploaded progress proof for "${assignment.title}"`,
});
      alert("Proof files uploaded successfully!");
      setProofFiles([]);
      setShowProofUpload(false);
      await fetchAssignment();
    } catch (err: any) {
      alert(err.message || "Failed to upload proof files.");
    } finally {
      setActionLoading(false);
    }
  };

  // Writer: Upload final completed work
  const handleUploadFinal = async () => {
    if (!assignment || finalFiles.length === 0) {
      alert("Please select final assignment files.");
      return;
    }

    try {
      setActionLoading(true);
      const finalUrls = await uploadAssignmentFiles(finalFiles, assignment.id, "final");
      
      const existingFinal = assignment.final_proof_keys || [];
      const allFinal = [...existingFinal, ...finalUrls];
      
      await updateAssignmentProofs(assignment.id, allFinal, "final");
      await updateAssignmentStatus(assignment.id, "ready");

      // Notify customer
     await createNotification({
  userId: assignment.user_id,
  assignmentId: assignment.id,
  type: "final_uploaded",
  title: "Assignment Delivered",
  message: `Your assignment "${assignment.title}" is ready for review!`,
});
      alert("Assignment delivered successfully!");
      setFinalFiles([]);
      setShowFinalUpload(false);
      setDeliveryNote("");
      await fetchAssignment();
    } catch (err: any) {
      alert(err.message || "Failed to upload final files.");
    } finally {
      setActionLoading(false);
    }
  };

  // Customer: Confirm delivery and release payment
  const handleConfirmDelivery = async () => {
    if (!assignment || !session?.user.id) return;

    try {
      setActionLoading(true);

      // Release payment to writer
      await releasePaymentToWriter(assignment.id, assignment.writer_id || "", assignment.user_id);

      // Update assignment status
      await updateAssignmentStatus(assignment.id, "completed");

      // Notify writer
     await createNotification({
  userId: assignment.writer_id || "",
  assignmentId: assignment.id,
  type: "payment_released",
  title: "Payment Released",
  message: `Customer confirmed delivery for "${assignment.title}". Payment released to your wallet!`,
});

      alert("Delivery confirmed! Payment released to writer.");
      await fetchAssignment();
    } catch (err: any) {
      alert(err.message || "Failed to confirm delivery.");
    } finally {
      setActionLoading(false);
    }
  };

  // Customer: Submit review
  const handleSubmitReview = async () => {
    if (!assignment || !session?.user.id) return;

    try {
      setActionLoading(true);

      const { error } = await supabase.from("reviews").insert([
        {
          assignment_id: assignment.id,
          reviewer_id: session.user.id,
          reviewee_id: assignment.writer_id,
          rating_overall: ratingOverall,
          rating_handwriting: ratingOverall,
          rating_speed: ratingOverall,
          rating_accuracy: ratingOverall,
          review: reviewText,
        },
      ]);

      if (error) throw error;

      alert("Review submitted successfully!");
      setShowReview(false);
      setRatingOverall(5);
      setReviewText("");
    } catch (err: any) {
      alert(err.message || "Failed to submit review.");
    } finally {
      setActionLoading(false);
    }
  };

  const downloadFile = (url: string, filename?: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-white/10 bg-white/5">
        <Loader2 className="animate-spin text-violet-400" size={28} />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-red-200">
        {error || "Assignment not found."}
      </div>
    );
  }

  const backPath = role === "writer" ? "/writer-dashboard/orders" : "/customer/assignments";
  const statusColors: Record<string, string> = {
    Pending: "bg-yellow-500/10 text-yellow-200 border-yellow-500/20",
    Accepted: "bg-blue-500/10 text-blue-200 border-blue-500/20",
    "In Progress": "bg-indigo-500/10 text-indigo-200 border-indigo-500/20",
    Ready: "bg-emerald-500/10 text-emerald-200 border-emerald-500/20",
    Completed: "bg-green-500/10 text-green-200 border-green-500/20",
    Cancelled: "bg-red-500/10 text-red-200 border-red-500/20",
    Disputed: "bg-orange-500/10 text-orange-200 border-orange-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to={backPath} className="text-sm font-semibold text-violet-300 hover:text-violet-200">
            ← Back to {role === "writer" ? "orders" : "assignments"}
          </Link>
          <h1 className="mt-3 text-4xl font-black text-white">{assignment.title}</h1>
          <p className="mt-2 text-white/50">{assignment.subject}</p>
        </div>

        <div className={`rounded-full border px-4 py-2 text-sm font-bold ${statusColors[assignment.status] || statusColors.Pending}`}>
          {assignment.status}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 md:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <IndianRupee className="text-emerald-400" size={24} />
          <p className="mt-4 text-sm text-white/50">Budget</p>
          <p className="mt-1 text-2xl font-black text-white">₹{assignment.budget.toLocaleString()}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <FileText className="text-blue-400" size={24} />
          <p className="mt-4 text-sm text-white/50">Pages</p>
          <p className="mt-1 text-2xl font-black text-white">{assignment.pages}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <CalendarDays className="text-amber-400" size={24} />
          <p className="mt-4 text-sm text-white/50">Deadline</p>
          <p className="mt-1 text-lg font-bold text-white">{new Date(assignment.deadline).toLocaleDateString()}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <ShieldCheck className="text-violet-400" size={24} />
          <p className="mt-4 text-sm text-white/50">Payment</p>
          <p className="mt-1 text-lg font-bold capitalize text-white">{assignment.payment_status}</p>
        </div>
      </div>

      {/* Assignment Brief */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-black text-white">Assignment Brief</h2>
        <p className="mt-4 whitespace-pre-wrap leading-relaxed text-white/60">
          {assignment.description || "No additional description was provided."}
        </p>
        <div className="mt-4 grid gap-3 text-sm text-white/60">
          <div>Delivery Mode: <span className="capitalize font-semibold text-white">{assignment.delivery_mode}</span></div>
          <div>Urgency: <span className="capitalize font-semibold text-white">{assignment.urgency}</span></div>
        </div>
      </section>

      {/* WRITER WORKFLOW */}
      {isWriter && (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-xl font-black text-white">Your Workflow</h2>

          {/* Upload Proof */}
          {(assignment.status === "accepted" || assignment.status === "in_progress") && (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-200">Step 1: Upload Progress Proof</p>
                  <p className="mt-1 text-sm text-blue-200/70">Share images/documents proving you're working on this assignment</p>
                </div>
                <button
                  onClick={() => setShowProofUpload(!showProofUpload)}
                  className="text-blue-300 hover:text-blue-200"
                >
                  {showProofUpload ? <X size={20} /> : <Upload size={20} />}
                </button>
              </div>

              {showProofUpload && (
                <div className="mt-4 space-y-4">
                  <FileUploader
                    onFilesSelected={setProofFiles}
                    label="Proof Files"
                    maxFiles={3}
                    maxSizeMB={20}
                    isLoading={actionLoading}
                    disabled={actionLoading}
                  />
                  <button
                    onClick={handleUploadProof}
                    disabled={actionLoading || proofFiles.length === 0}
                    className="w-full rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-50 transition"
                  >
                    {actionLoading ? "Uploading..." : "Upload Proof"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Upload Final Work */}
          {(assignment.status === "in_progress" || assignment.status === "accepted") && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-emerald-200">Step 2: Upload Final Work</p>
                  <p className="mt-1 text-sm text-emerald-200/70">Upload completed assignment files when ready for delivery</p>
                </div>
                <button
                  onClick={() => setShowFinalUpload(!showFinalUpload)}
                  className="text-emerald-300 hover:text-emerald-200"
                >
                  {showFinalUpload ? <X size={20} /> : <Upload size={20} />}
                </button>
              </div>

              {showFinalUpload && (
                <div className="mt-4 space-y-4">
                  <FileUploader
                    onFilesSelected={setFinalFiles}
                    label="Final Assignment Files"
                    maxFiles={5}
                    maxSizeMB={20}
                    isLoading={actionLoading}
                    disabled={actionLoading}
                  />

                  <div>
                    <label className="text-sm font-semibold text-white">Delivery Notes (optional)</label>
                    <textarea
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="Add any notes about the delivery..."
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-violet-500"
                      rows={3}
                      disabled={actionLoading}
                    />
                  </div>

                  <button
                    onClick={handleUploadFinal}
                    disabled={actionLoading || finalFiles.length === 0}
                    className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50 transition"
                  >
                    {actionLoading ? "Uploading..." : "Mark as Delivered"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Proof Files List */}
          {assignment.proof_keys && assignment.proof_keys.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Progress Proofs ({assignment.proof_keys.length})</p>
              <div className="mt-3 space-y-2">
                {assignment.proof_keys.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-white/5 p-2">
                    <div className="flex items-center gap-2">
                      <File size={16} className="text-white/50" />
                      <span className="text-sm text-white/70">{formatFileName(url)}</span>
                    </div>
                    <button
                      onClick={() => downloadFile(url, `proof-${idx}.pdf`)}
                      className="text-violet-400 hover:text-violet-300"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Files List */}
          {assignment.final_proof_keys && assignment.final_proof_keys.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">Submitted Work ({assignment.final_proof_keys.length})</p>
              <div className="mt-3 space-y-2">
                {assignment.final_proof_keys.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-white/5 p-2">
                    <div className="flex items-center gap-2">
                      <File size={16} className="text-white/50" />
                      <span className="text-sm text-white/70">{formatFileName(url)}</span>
                    </div>
                    <button
                      onClick={() => downloadFile(url, `final-${idx}.pdf`)}
                      className="text-violet-400 hover:text-violet-300"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* CUSTOMER WORKFLOW */}
      {isCustomer && (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-xl font-black text-white">Your Actions</h2>

          {assignment.status === "ready" && (
            <div className="space-y-4">
              {/* Download Files */}
              {assignment.final_proof_keys && assignment.final_proof_keys.length > 0 && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="font-semibold text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    Assignment Ready for Review
                  </p>
                  <div className="mt-4 space-y-2">
                    {assignment.final_proof_keys.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => downloadFile(url, `assignment-${idx}.pdf`)}
                        className="w-full flex items-center justify-between rounded-lg bg-emerald-500/20 p-3 text-emerald-200 hover:bg-emerald-500/30 transition"
                      >
                        <div className="flex items-center gap-2">
                          <Download size={18} />
                          <span>{formatFileName(url)}</span>
                        </div>
                        <span className="text-xs">Download</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm Delivery */}
              <button
                onClick={handleConfirmDelivery}
                disabled={actionLoading}
                className="w-full rounded-2xl bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-400 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                {actionLoading ? "Confirming..." : "Confirm Delivery & Release Payment"}
              </button>
            </div>
          )}

          {assignment.status === "completed" && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <div>
                  <p className="font-semibold text-emerald-200">Assignment Completed</p>
                  <p className="mt-1 text-sm text-emerald-200/70">Payment released to writer. Leave a review to help others!</p>
                </div>
              </div>

              <button
                onClick={() => setShowReview(!showReview)}
                className="mt-4 w-full rounded-lg border border-emerald-500/50 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 transition"
              >
                {showReview ? "Cancel Review" : "Leave Review"}
              </button>

              {showReview && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-white">Overall Rating</label>
                    <select
                      value={ratingOverall}
                      onChange={(e) => setRatingOverall(parseInt(e.target.value))}
                      disabled={actionLoading}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ Excellent</option>
                      <option value={4}>⭐⭐⭐⭐ Good</option>
                      <option value={3}>⭐⭐⭐ Average</option>
                      <option value={2}>⭐⭐ Fair</option>
                      <option value={1}>⭐ Poor</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-white">Review (optional)</label>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your experience..."
                      maxLength={300}
                      disabled={actionLoading}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-violet-500"
                      rows={3}
                    />
                    <p className="mt-1 text-xs text-white/40">{reviewText.length}/300</p>
                  </div>

                  <button
                    onClick={handleSubmitReview}
                    disabled={actionLoading}
                    className="w-full rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50 transition"
                  >
                    {actionLoading ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              )}
            </div>
          )}

          {["pending", "accepted", "in_progress"].includes(assignment.status) && (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-300 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-semibold">Assignment In Progress</p>
                <p className="mt-1">Waiting for writer to deliver. You'll be notified when ready!</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Chat/Messages Quick Link */}
      <button
        onClick={() => navigate(`${role === "writer" ? "/writer-dashboard" : "/customer"}/messages`)}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white hover:bg-white/10 transition flex items-center justify-center gap-2"
      >
        <MessageSquare size={20} />
        Open Chat with {isWriter ? "Customer" : "Writer"}
      </button>
    </div>
  );
};

export default AssignmentDetail;
