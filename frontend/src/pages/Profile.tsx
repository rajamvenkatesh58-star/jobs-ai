import { useEffect, useState } from "react";
import { PlusIcon, XIcon, UploadCloudIcon, CheckCircleIcon, SaveIcon, AlertCircleIcon } from "lucide-react";
import { useProfile, useUpdateProfile, profileCompleteness } from "../hooks/useProfile";
import { useToast } from "../components/Toast";
import type { Profile as ProfileType, WorkExperience } from "../types";

const LEVEL_COLOR: Record<string, string> = {
  Expert: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Intermediate: "bg-amber-50 text-amber-700 border-amber-200",
  Beginner: "bg-slate-50 text-slate-600 border-slate-200",
};

function CompletenessRing({ pct }: { pct: number }) {
  const r = 36, circ = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24">
      <svg width="96" height="96" className="ring-score">
        <circle cx="48" cy="48" r={r} strokeWidth="5" stroke="rgba(15,23,42,0.08)" fill="none" />
        <circle cx="48" cy="48" r={r} strokeWidth="5" stroke="rgb(var(--accent))" fill="none"
          strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset .8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-xl font-bold text-ink-100">{pct}%</span>
        <span className="text-[9px] text-ink-400">complete</span>
      </div>
    </div>
  );
}

export function Profile() {
  const { data: profile, isLoading, error } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [phone, setPhone] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [summary, setSummary] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [locations, setLocations] = useState("");
  const [workType, setWorkType] = useState("");
  const [seekKeywords, setSeekKeywords] = useState("");
  const [experience, setExperience] = useState<WorkExperience[]>([]);

  // Hydrate form when profile loads
  useEffect(() => {
    if (!profile) return;
    setSkills(profile.technical_skills ?? []);
    setPhone(profile.phone ?? "");
    setSuburb(profile.location_suburb ?? "");
    setState(profile.location_state ?? "");
    setLinkedin(profile.linkedin_url ?? "");
    setGithub(profile.github_url ?? "");
    setSummary(profile.professional_summary ?? "");
    setSalaryMin(profile.salary_min_aud?.toString() ?? "");
    setSalaryMax(profile.salary_max_aud?.toString() ?? "");
    setTargetRoles((profile.desired_job_titles ?? []).join(", "));
    setLocations((profile.desired_locations ?? []).join(", "));
    setWorkType(profile.work_type ?? "");
    setSeekKeywords((profile.seek_keywords ?? []).join(", "));
    setExperience(profile.work_experience ?? []);
  }, [profile]);

  const completeness = profileCompleteness({
    ...(profile ?? {}),
    technical_skills: skills,
    phone,
    location_suburb: suburb,
    professional_summary: summary,
    work_experience: experience,
  } as ProfileType);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        phone: phone || null,
        location_suburb: suburb || null,
        location_state: state || null,
        linkedin_url: linkedin || null,
        github_url: github || null,
        professional_summary: summary || null,
        technical_skills: skills.length > 0 ? skills : null,
        salary_min_aud: salaryMin ? parseInt(salaryMin, 10) : null,
        salary_max_aud: salaryMax ? parseInt(salaryMax, 10) : null,
        desired_job_titles: targetRoles ? targetRoles.split(",").map((s) => s.trim()).filter(Boolean) : null,
        desired_locations: locations ? locations.split(",").map((s) => s.trim()).filter(Boolean) : null,
        work_type: workType || null,
        seek_keywords: seekKeywords ? seekKeywords.split(",").map((s) => s.trim()).filter(Boolean) : null,
        work_experience: experience,
      });
      toast("Profile saved successfully", "success");
    } catch {
      toast("Failed to save profile — check all fields are valid");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full w-8 h-8 border-2 border-t-transparent" style={{ borderColor: "rgb(var(--accent))", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircleIcon size={32} className="text-coral mx-auto mb-2" />
          <p className="text-sm text-ink-300">Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto animate-fade-in pb-24">
      {/* Header */}
      <div className="glass rounded-2xl shadow-glass p-6 mb-6 flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
          style={{ background: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))" }}>
          {(profile?.user_id ?? "U").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="text-xl font-bold text-ink-100">{targetRoles.split(",")[0]?.trim() || "Your Profile"}</div>
          <div className="text-sm text-ink-400 mt-0.5">{suburb}{state ? `, ${state}` : ""}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgb(var(--accent) / 0.1)", color: "rgb(var(--accent))" }}>PRO</span>
            {profile?.created_at && <span className="text-xs text-ink-500">Member since {new Date(profile.created_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}</span>}
          </div>
        </div>
        <CompletenessRing pct={completeness} />
      </div>

      <div className="space-y-5">
        {/* Personal Info */}
        <section className="glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-4">Personal Information</div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Phone", value: phone, setter: setPhone, placeholder: "+61 412 345 678" },
              { label: "Suburb", value: suburb, setter: setSuburb, placeholder: "Sydney" },
              { label: "State", value: state, setter: setState, placeholder: "NSW" },
              { label: "LinkedIn", value: linkedin, setter: setLinkedin, placeholder: "linkedin.com/in/..." },
              { label: "GitHub", value: github, setter: setGithub, placeholder: "github.com/..." },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-wider mb-1">{label}</label>
                <input value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
                  className="w-full glass rounded-xl px-3.5 py-2.5 text-xs text-ink-200 outline-none transition-all placeholder:text-ink-600"
                  style={{ border: "1px solid var(--glass-border)" }} />
              </div>
            ))}
          </div>
        </section>

        {/* Professional Summary */}
        <section className="glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-4">Professional Summary</div>
          <textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)}
            placeholder="Briefly describe your professional background and key strengths..."
            className="w-full glass rounded-xl px-3.5 py-2.5 text-xs text-ink-200 outline-none resize-none placeholder:text-ink-600"
            style={{ border: "1px solid var(--glass-border)" }} />
        </section>

        {/* Skills */}
        <section className="glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-4">Technical Skills</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((s) => (
              <div key={s} className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${LEVEL_COLOR["Intermediate"]}`}>
                <span>{s}</span>
                <button onClick={() => setSkills((prev) => prev.filter((x) => x !== s))} className="opacity-60 hover:opacity-100 transition-opacity">
                  <XIcon size={10} />
                </button>
              </div>
            ))}
            {skills.length === 0 && <span className="text-xs text-ink-500">No skills added yet</span>}
          </div>
          <div className="flex gap-2">
            <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add skill…"
              className="flex-1 glass rounded-xl px-3 py-2 text-xs text-ink-200 outline-none placeholder:text-ink-600"
              style={{ border: "1px solid var(--glass-border)" }}
              onKeyDown={(e) => { if (e.key === "Enter" && newSkill.trim()) { setSkills((p) => [...p, newSkill.trim()]); setNewSkill(""); } }} />
            <button onClick={() => { if (newSkill.trim()) { setSkills((p) => [...p, newSkill.trim()]); setNewSkill(""); } }}
              className="px-3 py-2 rounded-xl text-white flex items-center gap-1 text-xs font-semibold"
              style={{ background: "rgb(var(--accent))" }}>
              <PlusIcon size={13} />Add
            </button>
          </div>
        </section>

        {/* Work Experience */}
        <section className="glass rounded-2xl shadow-glass p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-ink-300 uppercase tracking-wider">Work Experience</div>
            <button
              onClick={() => setExperience((prev) => [...prev, { company: "", role: "", start_date: "", achievements: [], technologies: [] }])}
              className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg text-white flex items-center gap-1"
              style={{ background: "rgb(var(--accent))" }}>
              <PlusIcon size={10} />Add
            </button>
          </div>
          {experience.length === 0 ? (
            <div className="text-xs text-ink-500 text-center py-4">No experience added yet</div>
          ) : (
            <div className="space-y-4">
              {experience.map((exp, i) => (
                <div key={i} className="glass rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "rgb(var(--accent))" }} />
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <input value={exp.role} onChange={(e) => setExperience((prev) => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                        placeholder="Role" className="glass rounded-lg px-2.5 py-1.5 text-xs text-ink-200 outline-none" style={{ border: "1px solid var(--glass-border)" }} />
                      <input value={exp.company} onChange={(e) => setExperience((prev) => prev.map((x, j) => j === i ? { ...x, company: e.target.value } : x))}
                        placeholder="Company" className="glass rounded-lg px-2.5 py-1.5 text-xs text-ink-200 outline-none" style={{ border: "1px solid var(--glass-border)" }} />
                      <input value={exp.start_date} onChange={(e) => setExperience((prev) => prev.map((x, j) => j === i ? { ...x, start_date: e.target.value } : x))}
                        placeholder="Start (YYYY-MM)" className="glass rounded-lg px-2.5 py-1.5 text-xs text-ink-200 outline-none" style={{ border: "1px solid var(--glass-border)" }} />
                      <input value={exp.end_date ?? ""} onChange={(e) => setExperience((prev) => prev.map((x, j) => j === i ? { ...x, end_date: e.target.value || undefined } : x))}
                        placeholder="End (YYYY-MM or blank)" className="glass rounded-lg px-2.5 py-1.5 text-xs text-ink-200 outline-none" style={{ border: "1px solid var(--glass-border)" }} />
                    </div>
                    <button onClick={() => setExperience((prev) => prev.filter((_, j) => j !== i))} className="text-ink-500 hover:text-coral ml-1">
                      <XIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Job Preferences */}
        <section className="glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-4">Job Preferences</div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Target Roles (comma-separated)", value: targetRoles, setter: setTargetRoles, placeholder: "Senior Data Engineer, Data Lead" },
              { label: "Preferred Locations (comma-separated)", value: locations, setter: setLocations, placeholder: "Sydney, Remote AU" },
              { label: "Salary Min (AUD)", value: salaryMin, setter: setSalaryMin, placeholder: "140000" },
              { label: "Salary Max (AUD)", value: salaryMax, setter: setSalaryMax, placeholder: "175000" },
              { label: "Work Type", value: workType, setter: setWorkType, placeholder: "full-time" },
              { label: "Seek Keywords (comma-separated)", value: seekKeywords, setter: setSeekKeywords, placeholder: "data engineer, spark, python" },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-wider mb-1">{label}</label>
                <input value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
                  className="w-full glass rounded-xl px-3.5 py-2.5 text-xs text-ink-200 outline-none transition-all placeholder:text-ink-600"
                  style={{ border: "1px solid var(--glass-border)" }} />
              </div>
            ))}
          </div>
        </section>

        {/* Resume Upload (UI only — no file upload endpoint exists yet) */}
        <section className="glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-4">Resume</div>
          <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-all hover:border-accent cursor-pointer" style={{ borderColor: "var(--glass-border)" }}>
            <UploadCloudIcon size={28} style={{ color: "rgb(var(--accent))" }} />
            <div className="text-sm font-semibold text-ink-200">Drop your resume here</div>
            <div className="text-xs text-ink-500">PDF, DOCX up to 5MB — coming soon</div>
          </div>
        </section>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-60 right-0 p-4 glass-strong border-t hairline z-30">
        <div className="max-w-[900px] mx-auto flex justify-end">
          <button onClick={handleSave} disabled={updateProfile.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-glow transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: updateProfile.isSuccess ? "#059669" : "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))" }}>
            {updateProfile.isSuccess ? <><CheckCircleIcon size={15} />Saved!</> : updateProfile.isPending ? "Saving…" : <><SaveIcon size={15} />Save Profile</>}
          </button>
        </div>
      </div>
    </div>
  );
}
