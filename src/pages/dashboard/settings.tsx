import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../supabase/client";

const Settings = () => {
  const { profile, session, refreshProfile, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const email = useMemo(
    () => session?.user?.email || "Not available",
    [session]
  );

  const availableBalance = Number(profile?.available_balance || 0);
  const rating = Number(profile?.rating || 0);
  const ratingCount = Number(profile?.rating_count || 0);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
        })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      const updateParams: Record<string, any> = {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
        },
      };

      if (password.trim()) {
        updateParams.password = password.trim();
      }

      const { error: authError } = await supabase.auth.updateUser(updateParams);
      if (authError) throw authError;

      await refreshProfile();
      setPassword("");
      setMessage("Settings saved successfully.");
    } catch (error: any) {
      setMessage(error.message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6">

        <div>
          <h1
            className="
              text-4xl font-black
              text-white
            "
          >
            Settings
          </h1>

          <p className="mt-2 text-white/50">
            Customize your dashboard settings.
          </p>
        </div>

        <div
          className="
            rounded-3xl
            border border-white/10
            bg-white/5
            p-8
          "
        >
          {loading ? (
            <p className="text-white/60">Loading settings...</p>
          ) : !profile ? (
            <p className="text-white/60">User settings not available.</p>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-3xl bg-[#0B1120] p-6 border border-white/10">
                  <p className="text-sm text-white/50">Email</p>
                  <p className="mt-2 text-lg font-bold text-white">{email}</p>
                </div>

                <div className="rounded-3xl bg-[#0B1120] p-6 border border-white/10">
                  <p className="text-sm text-white/50">Role</p>
                  <p className="mt-2 text-lg font-bold text-white capitalize">{profile.role}</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="space-y-2 rounded-3xl bg-[#0B1120] p-6 border border-white/10">
                  <span className="text-sm text-white/50">Display Name</span>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-3 text-white outline-none focus:border-violet-500"
                    placeholder="Enter display name"
                  />
                </label>

                <label className="space-y-2 rounded-3xl bg-[#0B1120] p-6 border border-white/10">
                  <span className="text-sm text-white/50">Change Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-3 text-white outline-none focus:border-violet-500"
                    placeholder="New password (leave blank to keep current)"
                  />
                </label>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="space-y-2 rounded-3xl bg-[#0B1120] p-6 border border-white/10">
                  <span className="text-sm text-white/50">Phone Number</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#020617] px-4 py-3 text-white outline-none focus:border-violet-500"
                    placeholder="Enter phone number"
                  />
                </label>

                <label className="space-y-2 rounded-3xl bg-[#0B1120] p-6 border border-white/10">
                  <span className="text-sm text-white/50">Bio</span>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#020617] px-4 py-3 text-white outline-none focus:border-violet-500"
                    placeholder="Tell customers about your writing experience"
                  />
                </label>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-3xl bg-[#0B1120] p-6 border border-white/10">
                  <p className="text-sm text-white/50">Available Balance</p>
                  <p className="mt-2 text-lg font-bold text-emerald-400">₹{availableBalance.toLocaleString()}</p>
                </div>
                <div className="rounded-3xl bg-[#0B1120] p-6 border border-white/10">
                  <p className="text-sm text-white/50">Rating</p>
                  <p className="mt-2 text-lg font-bold text-white">{rating.toFixed(1)} ({ratingCount} reviews)</p>
                </div>
                <div className="rounded-3xl bg-[#0B1120] p-6 border border-white/10">
                  <p className="text-sm text-white/50">Verified</p>
                  <p className="mt-2 text-lg font-bold text-white">{profile.verified ? "Yes" : "No"}</p>
                </div>
              </div>

              {message && (
                <div className="rounded-2xl border border-white/10 bg-[#0B1120] p-4 text-sm text-white/80">{message}</div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-400 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save settings"}
                </button>
               
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Settings;
