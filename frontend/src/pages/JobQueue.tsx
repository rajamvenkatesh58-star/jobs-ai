import { useState } from "react";
import clsx from "clsx";
import {
  ExternalLinkIcon, ClipboardCopyIcon, CheckCircleIcon,
  MapPinIcon, DollarSignIcon, ClockIcon, XIcon, BadgeCheckIcon,
  AlertCircleIcon, ChevronRightIcon, BuildingIcon,
} from "lucide-react";

type State = "TAILORED" | "READY" | "SENT";

interface Job {
  id: number; title: string; company: string; location: string;
  type: string; salary: string; score: number; state: State;
  skills: string[]; posted: string; description: string;
  missingKeywords: string[]; atsKeywords: string[];
}

const JOBS: Job[] = [
  { id: 1, title: "Senior Data Engineer", company: "Telstra", location: "Sydney CBD", type: "Full-time", salary: "$140k–$160k", score: 94, state: "TAILORED", skills: ["Python", "Spark", "Databricks", "SQL"], posted: "2 hours ago", description: "Lead the design and implementation of data pipelines at scale across Telstra's enterprise data platform. You'll work with petabyte-scale datasets using Apache Spark and Databricks, mentoring junior engineers and collaborating with product teams.", missingKeywords: ["Kafka", "Airflow"], atsKeywords: ["Python", "Spark", "Databricks", "SQL", "Azure", "Data Engineering"] },
  { id: 2, title: "Data Platform Lead", company: "ANZ Bank", location: "Melbourne", type: "Full-time", salary: "$155k–$175k", score: 91, state: "READY", skills: ["Databricks", "Azure", "Python", "dbt"], posted: "5 hours ago", description: "Own ANZ's enterprise data platform strategy and execution. Drive migration to cloud-native architecture using Azure and Databricks. Partner with engineering leads across the business to deliver high-quality data products.", missingKeywords: ["Terraform", "DataOps"], atsKeywords: ["Azure", "Databricks", "dbt", "Python", "Data Platform", "Leadership"] },
  { id: 3, title: "ML Engineer", company: "Atlassian", location: "Remote AU", type: "Full-time", salary: "$130k–$150k", score: 88, state: "SENT", skills: ["Python", "PyTorch", "Spark", "SQL"], posted: "1 day ago", description: "Build and deploy ML models powering Atlassian's intelligent product features. Work across the full ML lifecycle from experimentation to production with deep collaboration across product and data science teams.", missingKeywords: ["MLflow", "Kubeflow"], atsKeywords: ["Python", "PyTorch", "Machine Learning", "Spark", "Production ML"] },
  { id: 4, title: "Data Engineer", company: "Canva", location: "Sydney", type: "Full-time", salary: "$125k–$145k", score: 85, state: "TAILORED", skills: ["Python", "dbt", "BigQuery", "Airflow"], posted: "3 hours ago", description: "Join Canva's data engineering team to build robust, scalable data infrastructure supporting 135M+ users. Design ELT pipelines, maintain data models, and ensure data quality across our analytics stack.", missingKeywords: ["Go", "Kafka"], atsKeywords: ["Python", "dbt", "BigQuery", "Airflow", "Data Quality", "ELT"] },
  { id: 5, title: "Senior Analytics Engineer", company: "Afterpay", location: "Melbourne", type: "Full-time", salary: "$135k–$155k", score: 82, state: "READY", skills: ["dbt", "SQL", "Snowflake", "Python"], posted: "6 hours ago", description: "Shape the analytics engineering practice at Afterpay. Build and maintain dbt models, define data contracts, and partner with business stakeholders to deliver trusted datasets for decision-making.", missingKeywords: ["LookML", "Tableau"], atsKeywords: ["dbt", "SQL", "Snowflake", "Analytics Engineering", "Data Modeling"] },
  { id: 6, title: "Data Infrastructure Lead", company: "Commonwealth Bank", location: "Sydney", type: "Full-time", salary: "$150k–$170k", score: 79, state: "TAILORED", skills: ["Kubernetes", "Terraform", "Python", "Azure"], posted: "12 hours ago", description: "Lead infrastructure engineering for CBA's data platform. Define standards for cloud infrastructure, manage Kubernetes clusters, and drive DevOps practices across the data engineering organisation.", missingKeywords: ["Pulumi", "DataHub"], atsKeywords: ["Kubernetes", "Terraform", "Azure", "Python", "Infrastructure", "DevOps"] },
];

const STATE_CFG = {
  TAILORED: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", btn: "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100" },
  READY:    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", btn: "" },
  SENT:     { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", btn: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" },
};

function scoreColor(s: number) { return s >= 80 ? "#059669" : s >= 65 ? "#D97706" : "#E11D48"; }

function ScoreRing({ score }: { score: number }) {
  const r = 22, circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg width="56" height="56" className="ring-score">
        <circle cx="28" cy="28" r={r} strokeWidth="4" stroke="rgba(15,23,42,0.08)" fill="none" />
        <circle cx="28" cy="28" r={r} strokeWidth="4" stroke={color} fill="none"
          strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="num text-xs font-bold" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
}

function Drawer({ job, onClose }: { job: Job; onClose: () => void }) {
  const cfg = STATE_CFG[job.state];
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[480px] glass-strong h-full overflow-y-auto scrollbar-thin shadow-glass flex flex-col" style={{ animation: 'slideUp .3s ease' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b hairline sticky top-0 glass-strong z-10">
          <div>
            <div className="font-bold text-ink-100 text-sm">{job.title}</div>
            <div className="text-xs text-ink-400">{job.company} · {job.location}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-800/30 text-ink-400 hover:text-ink-200 transition-colors">
            <XIcon size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5 flex-1">
          <div className="flex items-center gap-4">
            <ScoreRing score={job.score} />
            <div>
              <span className={clsx("text-[10px] font-bold px-2 py-1 rounded border tracking-wider", cfg.bg, cfg.text, cfg.border)}>{job.state}</span>
              <div className="text-xs text-ink-400 mt-1">{job.salary} · {job.type}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-ink-300 mb-2">Job Description</div>
            <p className="text-xs text-ink-400 leading-relaxed">{job.description}</p>
          </div>

          <div>
            <div className="text-xs font-semibold text-ink-300 mb-2">ATS Keywords Detected</div>
            <div className="flex flex-wrap gap-1.5">
              {job.atsKeywords.map(k => (
                <span key={k} className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <BadgeCheckIcon size={10} />{k}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-ink-300 mb-2">Missing Keywords</div>
            <div className="flex flex-wrap gap-1.5">
              {job.missingKeywords.map(k => (
                <span key={k} className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                  <AlertCircleIcon size={10} />{k}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-ink-300 mb-2">Tailored Resume Preview</div>
            <div className="glass rounded-xl p-4 text-[11px] text-ink-400 leading-relaxed space-y-1">
              <div className="font-bold text-ink-200 text-xs">Alex Nguyen — Senior Data Engineer</div>
              <div className="text-ink-500">Sydney NSW · alex@example.com</div>
              <div className="pt-2 font-semibold text-ink-300">Summary</div>
              <div>Senior Data Engineer with 6+ years building enterprise-scale data platforms using Python, Spark, and Databricks. Proven track record delivering cloud-native solutions on Azure.</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-ink-300 mb-2">Cover Letter Preview</div>
            <div className="glass rounded-xl p-4 text-[11px] text-ink-400 leading-relaxed">
              Dear Hiring Manager, I am excited to apply for the {job.title} role at {job.company}. With extensive experience in {job.skills.slice(0, 2).join(" and ")}, I am confident I can make an immediate impact to your team...
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t hairline sticky bottom-0 glass-strong">
          {job.state === "TAILORED" && (
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 border border-amber-300 flex items-center justify-center gap-2 hover:bg-amber-200 transition-colors">
              <CheckCircleIcon size={15} /> Approve & Mark Ready
            </button>
          )}
          {job.state === "READY" && (
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ background: 'rgb(var(--accent))' }}>
                <ExternalLinkIcon size={14} /> Open on Seek
              </button>
              <button className="px-4 py-2.5 rounded-xl text-sm glass text-ink-300 flex items-center gap-2">
                <ClipboardCopyIcon size={14} />
              </button>
            </div>
          )}
          {job.state === "SENT" && (
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors">
              <ChevronRightIcon size={15} /> Track Application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function JobQueue() {
  const [stateFilter, setStateFilter] = useState<"All" | State>("All");
  const [scoreFilter, setScoreFilter] = useState("All");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const filtered = JOBS.filter(j => {
    if (stateFilter !== "All" && j.state !== stateFilter) return false;
    if (scoreFilter === "80%" && j.score < 80) return false;
    if (scoreFilter === "70%" && j.score < 70) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="glass rounded-2xl shadow-glass p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {(["All", "TAILORED", "READY", "SENT"] as const).map(s => (
            <button key={s} onClick={() => setStateFilter(s)}
              className={clsx("text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all",
                stateFilter === s ? "text-white shadow-glow" : "text-ink-400 hover:text-ink-200")}
              style={stateFilter === s ? { background: 'rgb(var(--accent))' } : {}}>{s}</button>
          ))}
        </div>
        <div className="w-px h-5" style={{ background: 'var(--hairline-c)' }} />
        <div className="flex items-center gap-1">
          {[{ l: "80%+", v: "80%" }, { l: "70%+", v: "70%" }, { l: "All scores", v: "All" }].map(({ l, v }) => (
            <button key={v} onClick={() => setScoreFilter(v)}
              className={clsx("text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all",
                scoreFilter === v ? "text-white" : "text-ink-400 hover:text-ink-200")}
              style={scoreFilter === v ? { background: 'rgb(var(--accent2))' } : {}}>{l}</button>
          ))}
        </div>
        <div className="ml-auto text-[11px] text-ink-400 num">{filtered.length} jobs</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map(job => {
          const cfg = STATE_CFG[job.state];
          return (
            <div key={job.id} onClick={() => setSelectedJob(job)}
              className="glass rounded-2xl shadow-glass p-5 cursor-pointer hover:shadow-glow transition-all group flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))' }}>
                  {job.company.slice(0, 2).toUpperCase()}
                </div>
                <span className={clsx("text-[9px] font-bold px-2 py-1 rounded border tracking-wider", cfg.bg, cfg.text, cfg.border)}>{job.state}</span>
              </div>

              <div>
                <div className="font-bold text-sm text-ink-100 leading-tight">{job.title}</div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-ink-400">
                  <BuildingIcon size={11} />{job.company}
                  <span className="text-ink-600 mx-0.5">·</span>
                  <MapPinIcon size={11} />{job.location}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <ScoreRing score={job.score} />
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs font-semibold text-ink-200 justify-end">
                    <DollarSignIcon size={11} className="text-mint" />{job.salary}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-ink-500 mt-0.5 justify-end">
                    <ClockIcon size={10} />{job.posted}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {job.skills.slice(0, 4).map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgb(var(--accent) / 0.08)', color: 'rgb(var(--accent))' }}>{s}</span>
                ))}
              </div>

              <div className="pt-2 border-t hairline">
                {job.state === "TAILORED" && (
                  <button className="w-full py-2 rounded-lg text-xs font-semibold transition-colors bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">
                    Review & Approve
                  </button>
                )}
                {job.state === "READY" && (
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1"
                      style={{ background: 'rgb(var(--accent))' }}>
                      <ExternalLinkIcon size={11} />Open on Seek
                    </button>
                    <button className="px-3 py-2 rounded-lg text-xs glass text-ink-400 hover:text-ink-200">
                      <ClipboardCopyIcon size={11} />
                    </button>
                  </div>
                )}
                {job.state === "SENT" && (
                  <button className="w-full py-2 rounded-lg text-xs font-semibold transition-colors bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center gap-1">
                    <CheckCircleIcon size={11} />Track Application
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedJob && <Drawer job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}
