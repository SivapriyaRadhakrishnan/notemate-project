import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import AuthLayout from "../components/auth/auth-layout";
import Button from "../components/ui/button";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [message, setMessage] = useState<string>(
    "Please check your email and click the verification link to continue."
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    };

    loadUser();
  }, []);

  const handleResend = async () => {
    if (!email) return;

    try {
      setLoading(true);
      const {
        data,
        error,
      } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + "/login",
        },
      });

      if (error) {
        setMessage(error.message || "Unable to resend verification email.");
        return;
      }

      if (data) {
        setMessage(
          "A verification link has been sent to your email. Check your inbox and click it to continue."
        );
      }
    } catch (err: any) {
      console.error(err);
      setMessage("Unable to resend verification email.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle="Your account is almost ready. Complete email verification to continue."
    >
      <div className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          <p className="font-semibold text-white">Verification required</p>
          <p className="mt-3 leading-relaxed">
            We sent a verification email to <span className="font-semibold text-white">{email || "your email"}</span>.
            Open that email and click the link to activate your NoteMate account.
          </p>
          <p className="mt-4 text-sm text-white/50">{message}</p>
        </div>

        <div className="grid gap-3">
          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={handleResend}
          >
            {loading ? "Sending..." : "Resend Verification Email"}
          </Button>

          <Button
            type="button"
            className="w-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleLogout}
          >
            Logout and return to login
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
