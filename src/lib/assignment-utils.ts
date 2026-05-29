import { supabase } from "../supabase/client";

/**
 * Upload assignment files (proof or final work)
 */
export async function uploadAssignmentFiles(
    files: File[],
    assignmentId: string,
    type: "proof" | "final"
): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${assignmentId}/${type}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from("assignments")
            .upload(fileName, file);

        if (uploadError) {
            throw new Error(`File upload failed: ${file.name}. ${uploadError.message}`);
        }

        const { data } = supabase.storage.from("assignments").getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
}

/**
 * Update assignment status and timestamps
 */
export async function updateAssignmentStatus(

    assignmentId: string,
    status: "draft" | "pending" | "open" | "accepted" | "in_progress" | "ready_for_review" | "completed" | "cancelled" | "disputed" | "refunded"
): Promise<void> {
    console.log("UPDATE ASSIGNMENT STATUS RUNNING");
    console.log("STATUS:", status);
    const timestamps: Record<string, string> = {};

    if (status === "accepted") {
        timestamps.accepted_at = new Date().toISOString();
        console.log("ACCEPTED STATUS BLOCK RUNNING");
    } else if (status === "ready_for_review") {
        timestamps.delivered_at = new Date().toISOString();
    } else if (status === "completed") {
        timestamps.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from("assignments")
        .update({ status, ...timestamps })
        .eq("id", assignmentId);

    if (error) throw error;
    if (status === "accepted") {
        const { data: assignment } = await supabase
            .from("assignments")
            .select("user_id")
            .eq("id", assignmentId)
            .single();

        if (assignment) {
            await createNotification({
                userId: assignment.user_id,
                assignmentId,
                type: "assignment_accepted",
                title: "Assignment Accepted",
                message: "A writer has accepted your assignment.",
            });
        }
    }
}

/**
 * Update assignment with proof files
 */
export async function updateAssignmentProofs(
    assignmentId: string,
    proofUrls: string[],
    type: "proof" | "final"
): Promise<void> {
    const fieldName = type === "proof" ? "proof_keys" : "final_proof_keys";

    const { error } = await supabase
        .from("assignments")
        .update({
            [fieldName]: proofUrls,
            status: type === "final" ? "ready_for_review" : "in_progress",
        })
        .eq("id", assignmentId);

    if (error) throw error;
    if (type === "final") {
        const { data: assignment } = await supabase
            .from("assignments")
            .select("user_id")
            .eq("id", assignmentId)
            .single();

        if (assignment) {
            await createNotification({
                userId: assignment.user_id,
                assignmentId,
                type: "final_uploaded",
                title: "Final Files Submitted",
                message: "Your assignment files are ready for review.",
            });
        }
    }
}

/**
 * Get payment breakdown for assignment
 */
export async function getPaymentBreakdown(assignmentId: string) {
    const { data: assignment, error } = await supabase
        .from("assignments")
        .select("budget, commission_rate, writer_amount, commission_amount")
        .eq("id", assignmentId)
        .single();

    if (error) throw error;

    const commissionRate = assignment.commission_rate || 0.2;
    const commissionAmount = Math.round(assignment.budget * commissionRate * 100) / 100;
    const writerAmount = assignment.budget - commissionAmount;

    return {
        totalBudget: assignment.budget,
        commissionRate,
        commissionAmount,
        writerAmount,
    };
}

/**
 * Release payment to writer and deduct commission
 */
export async function releasePaymentToWriter(
    assignmentId: string,
    writerId: string
): Promise<void> {
    try {
        // GET ASSIGNMENT
        const { data: assignment, error: fetchError } = await supabase
            .from("assignments")
            .select("*")
            .eq("id", assignmentId)
            .maybeSingle();

        if (fetchError) {
            console.log("ASSIGNMENT FETCH ERROR:", fetchError);
            throw fetchError;
        }

        if (!assignment) {
            throw new Error("Assignment not found");
        }

        // CALCULATE PAYMENT
        const budget = Number(assignment.budget || 0);
        const commissionRate =  Number(assignment.commission_rate || 20) / 100;
        const commissionAmount = Math.round(budget * commissionRate * 100) / 100;
        const writerAmount =  Math.round((budget - commissionAmount) * 100) / 100;

        // GET WRITER PROFILE
        const { data: writerProfile, error: writerFetchError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", writerId)
            .maybeSingle();
        console.log("WRITER ID:", writerId);
        console.log("WRITER PROFILE:", writerProfile);
        
        if (writerFetchError) {
            console.log("WRITER FETCH ERROR:", writerFetchError);
            throw writerFetchError;
        }

        if (!writerProfile) {
            throw new Error("Writer profile not found");
        }

        // UPDATE WRITER BALANCE
        const currentBalance = Number(writerProfile.available_balance || 0);

        const newBalance = currentBalance + writerAmount;
        console.log("CURRENT BALANCE:", currentBalance);
console.log("WRITER AMOUNT:", writerAmount);
console.log("NEW BALANCE:", newBalance);

       const { data: updatedProfile, error: writerUpdateError } = await supabase
    .from("profiles")
    .update({
        available_balance: newBalance,
    })
    .eq("id", writerId)
    .select();

console.log("UPDATED PROFILE:", updatedProfile);

const { data: verifyProfile } = await supabase
    .from("profiles")
    .select("id, available_balance")
    .eq("id", writerId)
    .single();

console.log("PROFILE AFTER UPDATE:", verifyProfile);

        if (writerUpdateError) {
            console.log("WRITER UPDATE ERROR:", writerUpdateError);
            throw writerUpdateError;
        }
console.log("WRITER BALANCE UPDATED SUCCESSFULLY");
        // INSERT PAYMENT RECORD
        const { error: paymentInsertError } = await supabase
            .from("payments")
            .insert({
                assignment_id: assignmentId,
                user_id: writerId,
                amount: writerAmount,
                type: "payout",
                status: "success",
            });

        if (paymentInsertError) {
            console.log("PAYMENT INSERT ERROR:", paymentInsertError);
            throw paymentInsertError;
        }

        // INSERT PLATFORM COMMISSION AUDIT
        const { error: commissionInsertError } = await supabase
            .from("platform_commissions")
            .insert({
                assignment_id: assignmentId,
                amount: commissionAmount,
                commission_rate: commissionRate,
            });

        if (commissionInsertError) {
            console.log("COMMISSION INSERT ERROR:", commissionInsertError);
            throw commissionInsertError;
        }

        // UPDATE ASSIGNMENT
        const { error: assignmentUpdateError } = await supabase
            .from("assignments")
            .update({
                payment_status: "released",
                writer_amount: writerAmount,
                commission_amount: commissionAmount,
                status: "completed",
                completed_at: new Date().toISOString(),
            })
            .eq("id", assignmentId);

        if (assignmentUpdateError) {
            console.log("ASSIGNMENT UPDATE ERROR:", assignmentUpdateError);
            throw assignmentUpdateError;
        }

        console.log("PAYMENT RELEASE SUCCESS");
        await createNotification({
            userId: writerId,
            assignmentId,
            type: "payment_released",
            title: "Payment Released",
            message: `₹${writerAmount} has been credited to your wallet.`,
        });
    } catch (error: any) {
        console.log("FULL PAYMENT ERROR:", error);

        throw new Error(
            `Payment release failed: ${error?.message || JSON.stringify(error)
            }`
        );
    }
}

/**
 * Create notification for assignment status change
 */
export async function createNotification({
    userId,
    assignmentId,
    type,
    title,
    message,
    metadata = {},
}: {
    userId: string;
    assignmentId?: string;
    type: string;
    title: string;
    message: string;
    metadata?: any;
}) {
    console.log("CREATING NOTIFICATION");
    const { error } = await supabase
        .from("notifications")
        .insert({
            user_id: userId,
            assignment_id: assignmentId,
            type,
            title,
            message,
            metadata,
            read: false,
        });

   if (error) {
  console.log("NOTIFICATION ERROR:", error);
} else {
  console.log("NOTIFICATION SUCCESS");
}
}

/**
 * Get assignment with all related data
 */
export async function getAssignmentWithDetails(assignmentId: string) {
    const { data, error } = await supabase
        .from("assignments")
        .select(
            `*,
      user:profiles!assignments_user_id_fkey(full_name, avatar_url),
      writer:profiles!assignments_writer_id_fkey(full_name, avatar_url, rating)`
        )
        .eq("id", assignmentId)
        .single();


    if (error) throw error;
    return data;
}

/**
 * Check if file can be downloaded (delivery mode specific)
 */
export function canDownloadDelivery(deliveryMode: string): boolean {
    if (deliveryMode === "digital") {
        return true;
    }
    // Physical delivery files are for reference only
    return true;
}

/**
 * Format file URL for display
 */
export function formatFileName(url: string): string {
    try {
        const parts = url.split("/");
        return decodeURIComponent(parts[parts.length - 1].split("-").slice(1).join("-")) || "File";
    } catch {
        return "File";
    }
}
