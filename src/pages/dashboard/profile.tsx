import { useEffect, useState } from "react";
import { useAuth } from "../../context/auth-context";
import { supabase } from "../../supabase/client";

import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Save,
  Wallet,
  Star,
  ShieldCheck,
  Loader2,
} from "lucide-react";

const Profile = () => {
  const { profile, session, loading, refreshProfile } =
    useAuth();

  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [collegeIdFile, setCollegeIdFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
      });

      setPreviewUrl(
        profile.college_id_key || ""
      );
    }
  }, [profile]);

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setCollegeIdFile(file);

    setPreviewUrl(
      URL.createObjectURL(file)
    );
  };

  const uploadCollegeId = async () => {
    if (!collegeIdFile || !profile?.id)
      return null;

    try {
      setUploading(true);

      const fileExt =
        collegeIdFile.name.split(".").pop();

      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

      const filePath = `college-ids/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("college-ids")
          .upload(
            filePath,
            collegeIdFile,
            {
              upsert: true,
            }
          );

      if (uploadError)
        throw uploadError;

      const { data } = supabase.storage
        .from("college-ids")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error(err);

      alert(
        "Failed to upload college ID"
      );

      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      let uploadedCollegeId =
        profile?.college_id_key || "";

      if (collegeIdFile) {
        const uploadedUrl =
          await uploadCollegeId();

        if (uploadedUrl) {
          uploadedCollegeId =
            uploadedUrl;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name:
            formData.full_name,
          phone: formData.phone,
          bio: formData.bio,
          college_id_key:
            uploadedCollegeId,
        })
        .eq("id", profile?.id);

      if (error) throw error;

      await refreshProfile();

      alert(
        "Profile updated successfully"
      );
    } catch (err: any) {
      console.error(err);

      alert(
        err.message ||
          "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-white/60">
        User profile not found.
      </div>
    );
  }

  const availableBalance = Number(
    profile.available_balance || 0
  );

  const rating = Number(
    profile.rating || 0
  );

  const ratingCount = Number(
    profile.rating_count || 0
  );

  return (
    <div className="space-y-8">
      {/* Header */}

      <div>
        <h1 className="text-4xl font-black text-white">
          My Profile
        </h1>

        <p className="mt-2 text-white/50">
          Manage your profile
          information and account
          settings.
        </p>
      </div>

      {/* Main Card */}

      <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        {/* Top */}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 text-3xl font-black text-white shadow-2xl">
              {profile.full_name?.charAt(
                0
              ) || "U"}
            </div>

            <div>
              <h2 className="text-3xl font-black text-white">
                {profile.full_name}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-violet-300">
                  {profile.role}
                </span>

                <span
                  className={`rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider ${
                    profile.verified
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      : "border border-red-500/20 bg-red-500/10 text-red-300"
                  }`}
                >
                  {profile.verified
                    ? "Verified"
                    : "Unverified"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#0B1120] p-5">
              <div className="flex items-center gap-2 text-white/50">
                <Wallet size={15} />
                <span className="text-sm">
                  Wallet
                </span>
              </div>

              <p className="mt-3 text-2xl font-black text-emerald-400">
                ₹
                {availableBalance.toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0B1120] p-5">
              <div className="flex items-center gap-2 text-white/50">
                <Star size={15} />
                <span className="text-sm">
                  Rating
                </span>
              </div>

              <p className="mt-3 text-2xl font-black text-white">
                {rating.toFixed(1)}
              </p>

              <p className="text-xs text-white/40">
                {ratingCount} reviews
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0B1120] p-5">
              <div className="flex items-center gap-2 text-white/50">
                <ShieldCheck size={15} />
                <span className="text-sm">
                  Status
                </span>
              </div>

              <p className="mt-3 text-lg font-bold capitalize text-white">
                {profile.writer_status ||
                  "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* Full Name */}

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm text-white/60">
              <User size={14} />
              Full Name
            </label>

            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Enter full name"
              className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-5 py-4 text-white outline-none transition focus:border-violet-500"
            />
          </div>

          {/* Email */}

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm text-white/60">
              <Mail size={14} />
              Email Address
            </label>

            <input
              type="email"
              value={
                session?.user?.email || ""
              }
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-[#0B1120] px-5 py-4 text-white/50"
            />
          </div>

          {/* Phone */}

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm text-white/60">
              <Phone size={14} />
              Phone Number
            </label>

            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-5 py-4 text-white outline-none transition focus:border-violet-500"
            />
          </div>

          {/* College ID Upload */}

          {profile.role ===
            "writer" && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm text-white/60">
                <GraduationCap size={14} />
                Update College ID
              </label>

              <input
                type="file"
                accept="image/*,.pdf"
                onChange={
                  handleFileChange
                }
                className="w-full rounded-2xl border border-dashed border-white/10 bg-[#0B1120] px-5 py-4 text-white file:mr-4 file:rounded-xl file:border-0 file:bg-violet-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-violet-400"
              />
            </div>
          )}
        </div>

        {/* Bio */}

        <div className="mt-6">
          <label className="mb-2 block text-sm text-white/60">
            About / Bio
          </label>

          <textarea
            rows={5}
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell something about yourself..."
            className="w-full resize-none rounded-2xl border border-white/10 bg-[#0B1120] px-5 py-4 text-white outline-none transition focus:border-violet-500"
          />
        </div>

        {/* Uploaded College ID */}

        {(previewUrl ||
          profile.college_id_key) && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0B1120] p-6">
            <p className="text-sm text-white/50">
              Uploaded College ID
            </p>

            <a
              href={
                previewUrl ||
                profile.college_id_key
              }
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-violet-400 hover:text-violet-300"
            >
              View Uploaded ID
            </a>
          </div>
        )}

        {/* Save Button */}

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={
              saving || uploading
            }
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-violet-400 disabled:opacity-50"
          >
            {saving ||
            uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;