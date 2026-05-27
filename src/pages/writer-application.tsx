import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { supabase } from "../supabase/client";
import { useAuth } from "../context/auth-context";
import { Upload, ImagePlus, FileText, CheckCircle2 } from "lucide-react";

const WriterApplication = () => {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [upiId, setUpiId] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [collegeIdImage, setCollegeIdImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
    }

    const loadSessionEmail = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    };

    loadSessionEmail();
  }, [profile]);

  const handleFile =
    (fileSetter: (file: File | null) => void) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 12 * 1024 * 1024) {
        alert("Upload files under 12MB.");
        return;
      }
      fileSetter(file);
    };

  const uploadFile = async (bucket: string, file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted) return;

    if (!fullName.trim() || !email.trim() || !phone.trim() || !college.trim() || !department.trim() || !semester.trim() || !skills.trim() || !experience.trim() || !upiId.trim() || !bio.trim() || !collegeIdImage) {
      alert("Please complete all required fields and upload your college ID.");
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Session expired. Please login again.");
        return;
      }

      const profileImageUrl = profileImage ? await uploadFile("avatars", profileImage) : null;
      const collegeIdUrl = await uploadFile("writer-documents", collegeIdImage);

      const { error } = await supabase.from("writer_applications").insert([
        {
          user_id: user.id,
          full_name: fullName,
          email,
          phone,
          college,
          department,
          semester,
          skills,
          experience,
          upi_id: upiId,
          portfolio_url: portfolioUrl || null,
          bio,
          profile_image: profileImageUrl,
          college_id_image: collegeIdUrl,
          status: "pending",
        },
      ]);

      if (error) throw error;
      setSubmitted(true);
      alert("Writer application submitted successfully. We will review your request.");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-violet-400">Writer Application</p>
              <h1 className="text-4xl font-black text-white">Join NoteMate as a Writer</h1>
              <p className="mt-3 max-w-2xl text-white/60">
                Submit your application to start accepting assignments, earning, and building your portfolio with NoteMate.
              </p>
            </div>
            <div className="rounded-3xl bg-[#0B1120] p-4 text-white/60">
              <p className="text-sm font-semibold text-white">Application Status</p>
              <p className="mt-2 text-3xl font-black text-emerald-400">{submitted ? "Submitted" : "Pending"}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm text-white/70">
                Full Name*
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-3 text-white outline-none focus:border-violet-500"
                />
              </label>
              <label className="space-y-2 text-sm text-white/70">
                Email*
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-3 text-white outline-none focus:border-violet-500"
                />
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm text-white/70">
                Phone Number*
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-3 text-white outline-none focus:border-violet-500"
                />
              </label>
              <label className="space-y-2 text-sm text-white/70">
                UPI ID*
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-3 text-white outline-none focus:border-violet-500"
                />
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm text-white/70">
                College Name*
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-3 text-white outline-none focus:border-violet-500"
                />
              </label>
              <label className="space-y-2 text-sm text-white/70">
                Course / Department*
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-3 text-white outline-none focus:border-violet-500"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm text-white/70">
              Year / Semester*
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="Example: 3rd Year / Semester 6"
                className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-3 text-white outline-none focus:border-violet-500"
              />
            </label>

            <label className="space-y-2 text-sm text-white/70">
              Skills / Subjects*
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Example: Economics, Engineering, Research"
                className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-3 text-white outline-none focus:border-violet-500"
              />
            </label>

            <label className="space-y-2 text-sm text-white/70">
              Experience*
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                rows={4}
                className="w-full rounded-3xl border border-white/10 bg-[#0B1120] px-4 py-3 text-white outline-none focus:border-violet-500"
              />
            </label>

            <label className="space-y-2 text-sm text-white/70">
              Portfolio Link
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://portfolio.example.com"
                className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-3 text-white outline-none focus:border-violet-500"
              />
            </label>

            <label className="space-y-2 text-sm text-white/70">
              About You*
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                className="w-full rounded-3xl border border-white/10 bg-[#0B1120] px-4 py-3 text-white outline-none focus:border-violet-500"
              />
            </label>
          </div>

          <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8">
            <div className="rounded-3xl border border-white/10 bg-[#020617] p-6">
              <p className="text-sm text-white/50">Upload</p>
              <p className="mt-3 text-white">Profile picture and college ID document are required to review your application.</p>
            </div>

            <label className="flex cursor-pointer flex-col rounded-3xl border border-dashed border-white/10 bg-[#0B1120] p-6 text-white/70 transition hover:border-violet-400 hover:text-white">
              <div className="flex items-center gap-3">
                <ImagePlus size={20} />
                <div>
                  <p className="font-semibold text-white">Profile Image</p>
                  <p className="text-xs text-white/50">PNG, JPG, JPEG up to 12MB</p>
                </div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile(setProfileImage)} />
              {profileImage && <p className="mt-4 text-sm text-white/70">Selected: {profileImage.name}</p>}
            </label>

            <label className="flex cursor-pointer flex-col rounded-3xl border border-dashed border-white/10 bg-[#0B1120] p-6 text-white/70 transition hover:border-violet-400 hover:text-white">
              <div className="flex items-center gap-3">
                <FileText size={20} />
                <div>
                  <p className="font-semibold text-white">College ID Upload*</p>
                  <p className="text-xs text-white/50">PNG, JPG, JPEG, or PDF up to 12MB</p>
                </div>
              </div>
              <input type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={handleFile(setCollegeIdImage)} />
              {collegeIdImage && <p className="mt-4 text-sm text-white/70">Selected: {collegeIdImage.name}</p>}
            </label>

            <div className="rounded-3xl border border-white/10 bg-[#020617] p-6">
              <p className="text-sm text-white/50">Quick Tips</p>
              <ul className="mt-4 space-y-3 text-sm text-white/60">
                <li>Use a clear photo of your college ID card.</li>
                <li>Explain your most relevant subjects and academic strengths.</li>
                <li>Keep your portfolio link professional and accurate.</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading || submitted}
              className="flex w-full items-center justify-center gap-2 rounded-3xl bg-violet-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitted ? <CheckCircle2 size={18} /> : <Upload size={18} />}
              {submitted ? "Submitted" : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default WriterApplication;
