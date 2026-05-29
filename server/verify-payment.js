import express from "express";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RAZORPAY_KEY_ID || !RAZORPAY_SECRET) {
  console.error("Missing required env variables. Please set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_KEY_ID, and RAZORPAY_SECRET.");
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_SECRET,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const app = express();
app.use(cors());
app.use(express.json());

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_SECRET)
    .update(payload)
    .digest("hex");

  return expectedSignature === signature;
}

app.post("/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Missing or invalid order amount." });
    }

    const orderPayload = {
      amount: Number(amount),
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(orderPayload);

    return res.status(200).json({ success: true, order_id: order.id });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({ error: error?.message || "Unable to create Razorpay order." });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {
    const {
      assignment_id,
      user_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!assignment_id || !user_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing required payment fields." });
    }

    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: "Invalid Razorpay signature." });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("budget, payment_status, status")
      .eq("id", assignment_id)
      .single();

    if (assignmentError) {
      return res.status(500).json({ error: assignmentError.message });
    }

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found." });
    }

    if (assignment.payment_status === "held" || assignment.payment_status === "released") {
      return res.status(409).json({ error: "Payment already processed for this assignment." });
    }

    const { error: paymentInsertError } = await supabase.from("payments").insert({
      assignment_id,
      user_id,
      amount: assignment.budget,
      type: "payment",
      status: "success",
      razorpay_order_id,
      razorpay_payment_id,
    });

    if (paymentInsertError) {
      return res.status(500).json({ error: paymentInsertError.message });
    }

    const updatePayload = { payment_status: "held" };
    if (!assignment.status || assignment.status === "pending") {
      updatePayload.status = "pending";
    }

    const { error: assignmentUpdateError } = await supabase
      .from("assignments")
      .update(updatePayload)
      .eq("id", assignment_id);

    if (assignmentUpdateError) {
      return res.status(500).json({ error: assignmentUpdateError.message });
    }

    await supabase.from("notifications").insert({
      user_id,
      assignment_id,
      title: "Payment Held in Escrow",
      message: `Your payment of ₹${assignment.budget} is securely held in escrow. Writers can now claim this assignment.`,
      read: false,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ error: error?.message || "Payment verification failed." });
  }
});

const port = process.env.PAYMENT_VERIFY_PORT || 3000;
app.listen(port, () => {
  console.log(`Payment verification server listening on port ${port}`);
});
