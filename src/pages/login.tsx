import { Link, useNavigate } from "react-router-dom";

import { useForm } from "react-hook-form";

import { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";

import { useState } from "react";

import AuthLayout from "../components/auth/auth-layout";

import AuthInput from "../components/auth/auth-input";

import Button from "../components/ui/button";

import { supabase } from "../supabase/client";

/* ----------------------------- */
/* VALIDATION SCHEMA */
/* ----------------------------- */

const loginSchema = z.object({
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
});

/* ----------------------------- */
/* TYPES */
/* ----------------------------- */

type LoginFormData = z.infer<
  typeof loginSchema
>;

const Login = () => {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  /* ----------------------------- */
  /* SUBMIT */
  /* ----------------------------- */

  const onSubmit = async (
    data: LoginFormData
  ) => {
    try {
      setLoading(true);

      /* LOGIN */

      const {
        data: authData,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (error) {
        alert(error.message);

        return;
      }

      const user = authData.user;

      if (!user) {
        alert("User not found");

        return;
      }

      if (!user.email_confirmed_at) {
        alert(
          "Please verify your email before logging in. Check your inbox for the verification link."
        );
        navigate("/verify-email");
        return;
      }

      /* FETCH PROFILE */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.log(profileError);

        alert(
          "Failed to fetch user profile"
        );

        return;
      }

      console.log(profile);

      /* ----------------------------- */
      /* ROLE BASED REDIRECT */
      /* ----------------------------- */

      if (profile.role === "admin") {
        navigate("/admin-dashboard");

        return;
      }

      if (profile.role === "writer") {
        /* CHECK APPROVAL */

        if (
          profile.writer_status ===
          "approved"
        ) {
          navigate("/writer-dashboard");
        } else {
          alert(
            "Writer account is pending admin approval"
          );

          navigate("/writer-dashboard");
        }

        return;
      }

      /* CUSTOMER */

      navigate("/customer");

    } catch (error) {
      console.log(error);

      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Login to continue managing assignments."
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
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
            placeholder="Enter your password"
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

        {/* Submit */}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading
            ? "Logging in..."
            : "Login"}
        </Button>

        {/* Footer */}

        <p
          className="
            text-center text-sm
            text-white/50
          "
        >
          Don’t have an account?

          <Link
            to="/signup"
            className="
              ml-2 text-violet-400
              hover:text-violet-300
            "
          >
            Sign Up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Login;
