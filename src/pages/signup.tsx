import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useForm } from "react-hook-form";

import { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";

import AuthLayout from "../components/auth/auth-layout";
import AuthInput from "../components/auth/auth-input";

import Button from "../components/ui/button";

import { supabase } from "../supabase/client";
import { Upload, GraduationCap, User } from "lucide-react";

/* ----------------------------- */
/* VALIDATION */
/* ----------------------------- */

const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(
        2,
        "Full name is required"
      ),

    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),

    password: z
      .string()
      .min(
        6,
        "Password must be at least 6 characters"
      ),

    confirmPassword: z.string(),
  })

  .refine(
    (data) =>
      data.password ===
      data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

/* ----------------------------- */
/* TYPES */
/* ----------------------------- */

type SignupFormData = z.infer<
  typeof signupSchema
>;

const Signup = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<"customer" | "writer">("customer");
  const [collegeIdFile, setCollegeIdFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  /* ----------------------------- */
  /* SUBMIT */
  /* ----------------------------- */

  const onSubmit = async (
    data: SignupFormData
  ) => {
    if (role === "writer" && !collegeIdFile) {
      alert("Please upload your college ID card for verification.");
      return;
    }

    try {
      setSubmitting(true);
      let collegeIdKey = "";

      if (role === "writer" && collegeIdFile) {
        const fileExt = collegeIdFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Try uploading to college-ids storage bucket.
        // Make sure to create this bucket in Supabase storage and set public permissions.
        const { error: uploadError } = await supabase.storage
          .from("college-ids")
          .upload(fileName, collegeIdFile);

        if (uploadError) {
          console.warn("Storage upload failed, attempting creation of bucket...", uploadError);
          // If bucket doesn't exist, we fall back to a public URL mock or try again
          alert("Failed to upload College ID. Please make sure the 'college-ids' bucket is created in Supabase Storage. Details: " + uploadError.message);
          setSubmitting(false);
          return;
        }

        collegeIdKey = fileName;
      }

      const { data: signUpData, error } =
        await supabase.auth.signUp({
          email: data.email,
          password: data.password,

          options: {
            data: {
              full_name: data.fullName,
              role: role,
              college_id_key: collegeIdKey || null,
              writer_status: role === "writer" ? "pending" : "approved",
            },
          },
        });

      if (error) {
        alert(error.message);
        setSubmitting(false);
        return;
      }

      console.log("Signup success");

      // Force insert profiles entry in case SQL trigger didn't fire
      if (signUpData.user) {
        // Insert profile
        await supabase.from("profiles").upsert({
          id: signUpData.user.id,
          full_name: data.fullName,
          email: data.email,
          role: role,
          verified: role !== "writer",
          writer_status:
            role === "writer"
              ? "pending"
              : "approved",
          college_id_key:
            collegeIdKey || null,
          phone: "",
          bio: "",
        });

        // Insert writer application
        if (role === "writer") {
          const { error: writerError } =
            await supabase
              .from("writer_applications")
              .insert([
                {
                  user_id:
                    signUpData.user.id,
                  full_name:
                    data.fullName,
                  email: data.email,
                  phone: "",
                  college: "",
                  department: "",
                  semester: "",
                  skills: "",
                  experience: "",
                  upi_id: "",
                  portfolio_url: "",
                  bio: "",
                  profile_image: "",
                  college_id_image:
                    collegeIdKey || "",
                  status: "pending",
                },
              ]);

          if (writerError) {
            console.log(writerError);
            alert(writerError.message);
            return;
          }
        }
      }

      if (role === "writer") {
        alert(
          "Application submitted successfully. Wait for admin approval."
        );

        navigate("/login");
      } else {
        navigate("/customer");
      }
    } catch (error: any) {
      console.log(error);
      alert(error?.message || "An error occurred during signup");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Create your Customer  account to manage assignments easily."
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Role Selection */}
        <div>
          <label className="mb-3 block text-sm font-medium text-white/70">
            I want to join as a
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all duration-300 text-center ${role === "customer"
                  ? "border-violet-500 bg-violet-500/10 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/[0.08]"
                }`}
            >
              <User size={24} className={role === "customer" ? "text-violet-400" : "text-white/40"} />
              <div>
                <span className="block font-bold text-sm">Customer </span>
                <span className="text-[10px] text-white/40">Need assignments written</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole("writer")}
              className={`flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all duration-300 text-center ${role === "writer"
                  ? "border-violet-500 bg-violet-500/10 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/[0.08]"
                }`}
            >
              <GraduationCap size={24} className={role === "writer" ? "text-violet-400" : "text-white/40"} />
              <div>
                <span className="block font-bold text-sm">Writer</span>
                <span className="text-[10px] text-white/40">Want to write & earn</span>
              </div>
            </button>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <AuthInput
            label="Full Name"
            type="text"
            placeholder="Enter your full name"
            {...register("fullName")}
          />

          {errors.fullName && (
            <p
              className="
                mt-2 text-sm
                text-red-400
              "
            >
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <AuthInput
            label="Email"
            type="email"
            placeholder="Enter your email"
            {...register("email")}
          />

          {errors.email && (
            <p
              className="
                mt-2 text-sm
                text-red-400
              "
            >
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <AuthInput
            label="Password"
            type="password"
            placeholder="Create password"
            {...register("password")}
          />

          {errors.password && (
            <p
              className="
                mt-2 text-sm
                text-red-400
              "
            >
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <AuthInput
            label="Confirm Password"
            type="password"
            placeholder="Confirm password"
            {...register(
              "confirmPassword"
            )}
          />

          {errors.confirmPassword && (
            <p
              className="
                mt-2 text-sm
                text-red-400
              "
            >
              {
                errors.confirmPassword
                  .message
              }
            </p>
          )}
        </div>

        {/* College ID Photo Upload (Conditional for Writer) */}
        {role === "writer" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              College ID Card Photo
            </label>
            <div className="relative">
              <label
                className={`flex flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center cursor-pointer transition-all duration-300 ${collegeIdFile
                    ? "border-violet-500 bg-violet-500/5 text-violet-400"
                    : "border-white/10 bg-[#0B1120] text-white/40 hover:border-white/20"
                  }`}
              >
                <Upload size={20} className="mb-2" />
                <span className="text-xs font-semibold">
                  {collegeIdFile ? collegeIdFile.name : "Upload college ID photo"}
                </span>
                <span className="text-[10px] mt-1 block">PDF, JPG, PNG up to 5MB</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCollegeIdFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? "Creating Account..." : "Create Account"}
        </Button>

        {/* Footer */}
        <p
          className="
            text-center text-sm
            text-white/50
          "
        >
          Already have an account?

          <Link
            to="/login"
            className="
              ml-2 text-violet-400
              hover:text-violet-300
            "
          >
            Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Signup;
