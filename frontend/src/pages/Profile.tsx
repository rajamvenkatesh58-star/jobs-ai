import { useState } from "react";
import { PlusIcon, XIcon, UploadCloudIcon, CheckCircleIcon, SaveIcon } from "lucide-react";

const SKILLS = [
  { name: "Python", level: "Expert" },
  { name: "Spark", level: "Expert" },
  { name: "Databricks", level: "Expert" },
  { name: "SQL", level: "Expert" },
  { name: "Azure", level: "Intermediate" },
  { name: "dbt", level: "Intermediate" },
];

const LEVEL_COLOR: Record<string, string> = {
  Expert: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Intermediate: "bg-amber-50 text-amber-700 border-amber-200",
  Beginner: "bg-slate-50 text-slate-600 border-slate-200",
};

const EXPERIENCE = [
  { role: "Senior Data Engineer", company: "NAB", period: "2021 – Present", desc: "Led migration of data pipelines to Azure Databricks, reducing processing time by 60%." },
  { role: "Data Engineer", company: "Westpac", period: "2019 – 2021", desc: "Built and maintained ELT pipelines using Python and Spark processing 500GB+ daily." },
  { role: "Junior Data Engineer", company: "REA Group", period: "2017 – 2019", desc: "Developed data models and automated reporting pipelines using SQL and Python." },
];

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
  const [skills, setSkills] = useState(SKILLS);
  const [newSkill, setNewSkill] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto animate-fade-in pb-24">
      {/* Header */}
      <div className="glass rounded-2xl shadow-glass p-6 mb-6 flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))' }}>
          AN
        </div>
        <div className="flex-1">
          <div className="text-xl font-bold text-ink-100">Alex Nguyen</div>
          <div className="text-sm text-ink-400 mt-0.5">Senior Data Engineer · Sydney NSW</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgb(var(--accent) / 0.1)', color: 'rgb(var(--accent))' }}>PRO</span>
            <span className="text-xs text-ink-500">Member since March 2024</span>
          </div>
        </div>
        <CompletenessRing pct={87} />
      </div>

      <div className="space-y-5">
        {/* Personal Info */}
        <section className="glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-4">Personal Information</div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Full Name", value: "Alex Nguyen" },
              { label: "Email", value: "alex.nguyen@email.com" },
              { label: "Location", value: "Sydney NSW 2000" },
              { label: "Phone", value: "+61 412 345 678" },
              { label: "LinkedIn", value: "linkedin.com/in/alexnguyen" },
              { label: "GitHub", value: "github.com/alexnguyen" },
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider block mb-1">{label}</label>
                <input defaultValue={value}
                  className="w-full glass rounded-lg px-3 py-2 text-xs text-ink-200 outline-none focus:shadow-glow transition-all"
                  style={{ border: '1px solid var(--glass-border)' }} />
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-4">Skills</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map(s => (
              <div key={s.name} className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${LEVEL_COLOR[s.level]}`}>
                <span>{s.name}</span>
                <span className="opacity-60">·</span>
                <span className="text-[9px]">{s.level}</span>
                <button onClick={() => setSkills(prev => prev.filter(x => x.name !== s.name))}
                  className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">
                  <XIcon size={10} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newSkill} onChange={e => setNewSkill(e.target.value)}
              placeholder="Add skill…"
              className="flex-1 glass rounded-lg px-3 py-2 text-xs text-ink-200 outline-none"
              style={{ border: '1px solid var(--glass-border)' }}
              onKeyDown={e => { if (e.key === "Enter" && newSkill.trim()) { setSkills(p => [...p, { name: newSkill.trim(), level: "Intermediate" }]); setNewSkill(""); } }} />
            <button onClick={() => { if (newSkill.trim()) { setSkills(p => [...p, { name: newSkill.trim(), level: "Intermediate" }]); setNewSkill(""); } }}
              className="px-3 py-2 rounded-lg text-white flex items-center gap-1 text-xs font-semibold"
              style={{ background: 'rgb(var(--accent))' }}>
              <PlusIcon size={13} /> Add
            </button>
          </div>
        </section>

        {/* Experience */}
        <section className="glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-4">Work Experience</div>
          <div className="space-y-4">
            {EXPERIENCE.map((exp, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0" style={{ background: 'rgb(var(--accent))' }} />
                  {i < EXPERIENCE.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: 'var(--hairline-c)' }} />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="font-semibold text-sm text-ink-100">{exp.role}</div>
                  <div className="text-xs text-ink-400 mt-0.5">{exp.company} · {exp.period}</div>
                  <div className="text-xs text-ink-500 mt-1.5 leading-relaxed">{exp.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Job Preferences */}
        <section className="glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-4">Job Preferences</div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Target Role", value: "Senior Data Engineer / Data Platform Lead" },
              { label: "Salary Target", value: "$140,000 – $175,000" },
              { label: "Preferred Location", value: "Sydney / Remote AU" },
              { label: "Work Type", value: "Full-time" },
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider block mb-1">{label}</label>
                <input defaultValue={value}
                  className="w-full glass rounded-lg px-3 py-2 text-xs text-ink-200 outline-none focus:shadow-glow transition-all"
                  style={{ border: '1px solid var(--glass-border)' }} />
              </div>
            ))}
          </div>
        </section>

        {/* Resume Upload */}
        <section className="glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-4">Resume</div>
          <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-all hover:border-accent cursor-pointer" style={{ borderColor: 'var(--glass-border)' }}>
            <UploadCloudIcon size={28} style={{ color: 'rgb(var(--accent))' }} />
            <div className="text-sm font-semibold text-ink-200">Drop your resume here</div>
            <div className="text-xs text-ink-500">PDF, DOCX up to 5MB</div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-400">
            <CheckCircleIcon size={13} className="text-mint" />
            <span>Alex_Nguyen_Resume_2024.pdf</span>
            <span className="text-ink-600">·</span>
            <span className="text-ink-500">Uploaded 15 May 2024</span>
          </div>
        </section>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-60 right-0 p-4 glass-strong border-t hairline z-30">
        <div className="max-w-[900px] mx-auto flex justify-end">
          <button onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-glow transition-all hover:opacity-90"
            style={{ background: saved ? '#059669' : 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))' }}>
            {saved ? <><CheckCircleIcon size={15} />Saved!</> : <><SaveIcon size={15} />Save Profile</>}
          </button>
        </div>
      </div>
    </div>
  );
}
