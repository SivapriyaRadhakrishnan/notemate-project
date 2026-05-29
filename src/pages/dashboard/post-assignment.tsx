
import { useState, useEffect } from "react";

import { supabase } from "../../supabase/client";

import {
  Upload,
  CalendarDays,
  BookOpen,
  FileText,
  Trash2,
} from "lucide-react";

const PostAssignment = () => {
  /* ----------------------------- */
  /* STATES */
  /* ----------------------------- */

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [pages, setPages] = useState("");
  const [deadline, setDeadline] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent" | "express">("normal");
  const [subjectType, setSubjectType] = useState<"standard" | "technical" | "diagram-heavy">("standard");
  const [deliveryMode, setDeliveryMode] = useState<"digital" | "physical">("digital");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  /* ----------------------------- */
  /* PRICING ENGINE */
  /* ----------------------------- */

  useEffect(() => {
    const pagesCount = Number(pages);
    if (!pagesCount || pagesCount <= 0) {
      setCalculatedPrice(0);
      return;
    }

    const baseRate = 12; // ₹12 per page
    const urgencyMultipliers = {
      normal: 1.0,
      urgent: 1.4,
      express: 1.8,
    };
    const subjectMultipliers = {
      standard: 1.0,
      technical: 1.2,
      "diagram-heavy": 1.5,
    };
    const deliveryCharges = {
      digital: 0,
      physical: 40,
    };

    const uMult = urgencyMultipliers[urgency];
    const sMult = subjectMultipliers[subjectType];
    const dCharge = deliveryCharges[deliveryMode];

    const price = pagesCount * baseRate * uMult * sMult + dCharge;
    setCalculatedPrice(Math.round(Math.max(price, 60))); // ₹60 min order value
  }, [pages, urgency, subjectType, deliveryMode]);

  /* ----------------------------- */
  /* FILE MANAGEMENT */
  /* ----------------------------- */

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Limit to max 5 files total
      if (files.length + selectedFiles.length > 5) {
        alert("You can upload a maximum of 5 files per assignment.");
        return;
      }

      // Check file size (10MB limit)
      const oversized = selectedFiles.some(file => file.size > 10 * 1024 * 1024);
      if (oversized) {
        alert("Each file must be smaller than 10MB.");
        return;
      }

      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  /* ----------------------------- */
  /* SUBMIT */
  /* ----------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !subject.trim() || !pages || !deadline) {
      alert("Please fill in all required fields.");
      return;
    }

    if (Number(pages) <= 0) {
      alert("Pages count must be greater than zero.");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("User session not found. Please log in.");
        return;
      }

      /* ----------------------------- */
      /* MULTI FILE UPLOAD */
      /* ----------------------------- */

      const fileUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("assignments")
          .upload(fileName, file);

        if (uploadError) {
          alert(`File upload failed: ${file.name}. ${uploadError.message}`);
          setLoading(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("assignments").getPublicUrl(fileName);

        fileUrls.push(publicUrl);
      }

      /* ----------------------------- */
      /* SAVE TO DATABASE */
      /* ----------------------------- */
/* ----------------------------- */
/* SAVE TO DATABASE */
/* ----------------------------- */

const { data: assignment, error } = await supabase
  .from("assignments")
  .insert([
    {
      user_id: user.id,
      title,
      subject,
      description,
      budget: calculatedPrice,
      pages: Number(pages),
      deadline,
      file_url: fileUrls[0] || "",
      file_keys: fileUrls,
      urgency,
      delivery_mode: deliveryMode,
      subject_type: subjectType,
      status: "pending",
      payment_status: "pending",
    },
  ])
  .select()
  .single();

if (error) {
  alert("Failed to submit assignment: " + error.message);
  return;
}

/* ----------------------------- */
/* CREATE RAZORPAY ORDER & COLLECT PAYMENT (ESCROW) */
/* ----------------------------- */
try {
  const loadRazorpayScript = async () => {
    return new Promise<boolean>((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const loaded = await loadRazorpayScript();
  if (!loaded || !(window as any).Razorpay) {
    alert("Assignment created but Razorpay checkout couldn't be loaded. You can retry payment from My Orders.");
  } else {
    const paymentServerBaseUrl =
      import.meta.env.VITE_PAYMENT_VERIFY_URL
        ? import.meta.env.VITE_PAYMENT_VERIFY_URL.replace(/\/verify-payment\/?$/i, "")
        : "http://localhost:3000";

    const createOrderUrl = `${paymentServerBaseUrl}/create-order`;
    const verifyUrl = `${paymentServerBaseUrl}/verify-payment`;

    const createOrderPayload = {
      amount: calculatedPrice * 100,
      currency: "INR",
      receipt: assignment.id,
      notes: {
        assignment_id: assignment.id,
        customer_id: user.id,
      },
    };

    const createOrderResponse = await fetch(createOrderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createOrderPayload),
    });

    const createOrderResult = await createOrderResponse.json();
    if (!createOrderResponse.ok) {
      console.error(createOrderResult);
      alert("Assignment created but payment could not be initialized. Please try paying from My Orders.");
    } else {
      const orderId = createOrderResult.order_id;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: calculatedPrice * 100,
        currency: "INR",
        order_id: orderId,
        name: "NoteMate",
        description: assignment.title,
        handler: async function (response: any) {
          if (!response?.razorpay_payment_id) {
            alert("Payment was not completed.");
            return;
          }

          const verifyBody = {
            assignment_id: assignment.id,
            user_id: user.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };

          const verifyResponse = await fetch(verifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(verifyBody),
          });

          const verifyResult = await verifyResponse.json();
          if (!verifyResponse.ok) {
            console.error(verifyResult);
            alert("Payment verification failed. Please try again from My Orders.");
            return;
          }

          alert("Payment successful! Your assignment is now live and visible to writers.");

          /* Reset */
          setTitle("");
          setSubject("");
          setDescription("");
          setPages("");
          setDeadline("");
          setUrgency("normal");
          setSubjectType("standard");
          setDeliveryMode("digital");
          setFiles([]);
        },
        prefill: {
          name: user?.user_metadata?.full_name || "",
          email: user?.email || "",
        },
        notes: {
          assignment_id: assignment.id,
          customer_id: user.id,
        },
        theme: { color: "#7c3aed" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        console.error("Razorpay payment failed", resp);
        alert("Payment failed. You can retry from My Orders.");
      });
      rzp.open();
    }
  }
} catch (err) {
  console.error(err);
  alert("An error occurred while initializing payment. You can complete payment from My Orders.");
}

    } catch (error) {
      console.log(error);
      alert("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-white">Post Assignment</h1>
          <p className="mt-2 text-white/50">
            Submit your assignment requirements and calculate price dynamically.
          </p>
        </div>

        {/* Form + Pricing Sidebar Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Assignment Title */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Assignment Title <span className="text-violet-400">*</span>
                </label>
                <div className="relative">
                  <FileText
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter assignment title"
                    className="w-full rounded-2xl border border-white/10 bg-[#0B1120] py-4 pl-12 pr-4 text-white outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Subject + Deadline */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Subject */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Subject <span className="text-violet-400">*</span>
                  </label>
                  <div className="relative">
                    <BookOpen
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter subject"
                      className="w-full rounded-2xl border border-white/10 bg-[#0B1120] py-4 pl-12 pr-4 text-white outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Deadline <span className="text-violet-400">*</span>
                  </label>
                  <div className="relative">
                    <CalendarDays
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                      type="date"
                      required
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-2xl border border-white/10 bg-[#0B1120] py-4 pl-12 pr-4 text-white outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Pages + Subject Difficulty */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Pages */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Number of Pages <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={pages}
                    onChange={(e) => setPages(e.target.value)}
                    placeholder="Enter page count"
                    className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-4 text-white outline-none focus:border-violet-500"
                  />
                </div>

                {/* Subject Difficulty Type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Subject Complexity <span className="text-violet-400">*</span>
                  </label>
                  <select
                    value={subjectType}
                    onChange={(e) => setSubjectType(e.target.value as any)}
                    className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-4 text-white outline-none focus:border-violet-500"
                  >
                    <option value="standard">Standard (1.0x)</option>
                    <option value="technical">Technical / Math (1.2x)</option>
                    <option value="diagram-heavy">Diagram Heavy (1.5x)</option>
                  </select>
                </div>
              </div>

              {/* Urgency + Delivery Mode */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Urgency */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Urgency Settings <span className="text-violet-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["normal", "urgent", "express"].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setUrgency(level as any)}
                        className={`rounded-xl py-3 text-xs font-semibold capitalize border transition-all duration-300 ${
                          urgency === level
                            ? "border-violet-500 bg-violet-500/10 text-white"
                            : "border-white/10 bg-[#0B1120] text-white/50 hover:border-white/20"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Mode */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Delivery Mode <span className="text-violet-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { mode: "digital", label: "Digital PDF" },
                      { mode: "physical", label: "Physical Copy" },
                    ].map((item) => (
                      <button
                        key={item.mode}
                        type="button"
                        onClick={() => setDeliveryMode(item.mode as any)}
                        className={`rounded-xl py-3 text-xs font-semibold border transition-all duration-300 ${
                          deliveryMode === item.mode
                            ? "border-violet-500 bg-violet-500/10 text-white"
                            : "border-white/10 bg-[#0B1120] text-white/50 hover:border-white/20"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Description / Guidelines
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain assignment requirements in detail..."
                  className="w-full rounded-2xl border border-white/10 bg-[#0B1120] p-5 text-white outline-none focus:border-violet-500"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Upload Reference Materials (Max 5 files)
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0B1120] px-6 py-8 text-center hover:border-violet-500 transition-all duration-300">
                  <Upload size={30} className="text-violet-400" />
                  <p className="mt-2 text-sm text-white">Click to upload reference materials</p>
                  <p className="text-xs text-white/40 mt-1">PDF, JPG, PNG up to 10MB each</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <FileText size={16} className="text-violet-400" />
                          <span className="text-xs text-white/70 truncate max-w-[200px]">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-white/30">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-blue-500 py-4 text-lg font-semibold text-white hover:opacity-90 transition-all duration-300 disabled:opacity-50"
              >
                {loading ? "Submitting Requirements..." : "Submit Assignment"}
              </button>
            </form>
          </div>

          {/* Pricing Estimation Sidebar */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h3 className="text-xl font-bold text-white mb-4">Pricing Engine</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Base Rate</span>
                  <span className="text-white">₹12 / page</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Pages Count</span>
                  <span className="text-white">{pages || "0"}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Complexity Factor</span>
                  <span className="text-white">
                    {subjectType === "standard" && "1.0x (Standard)"}
                    {subjectType === "technical" && "1.2x (Technical)"}
                    {subjectType === "diagram-heavy" && "1.5x (Diagram-heavy)"}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Urgency Multiplier</span>
                  <span className="text-white font-semibold">
                    {urgency === "normal" && "1.0x (Normal)"}
                    {urgency === "urgent" && "1.4x (Urgent)"}
                    {urgency === "express" && "1.8x (Express)"}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Delivery Charge</span>
                  <span className="text-white">
                    {deliveryMode === "physical" ? "₹40 (Physical Copy)" : "₹0 (Digital PDF)"}
                  </span>
                </div>

                <hr className="border-white/10 my-4" />

                <div className="flex justify-between items-center">
                  <span className="text-white font-black text-lg">Total Cost</span>
                  <span className="text-violet-400 text-3xl font-black">₹{calculatedPrice}</span>
                </div>

                <div className="rounded-2xl bg-violet-500/10 p-3 border border-violet-500/10 text-center">
                  <span className="text-[10px] text-violet-300 font-medium">
                    * Guaranteed escrow holds funds securely until you confirm delivery.
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h4 className="text-sm font-bold text-white mb-2">Urgency Guidelines</h4>
              <ul className="space-y-2 text-xs text-white/50 list-disc list-inside">
                <li><strong className="text-white/70">Normal</strong>: Completed in 3-5 days.</li>
                <li><strong className="text-white/70">Urgent</strong>: Completed in 24-48 hours (1.4x rate).</li>
                <li><strong className="text-white/70">Express</strong>: Completed in under 24 hours (1.8x rate).</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PostAssignment;
