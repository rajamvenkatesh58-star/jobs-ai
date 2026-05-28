import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SaveIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { profileApi } from "../api/profile";

type FormValues = {
  phone: string;
  location_suburb: string;
  location_state: string;
  professional_summary: string;
  linkedin_url: string;
  github_url: string;
  technical_skills: string;       // comma-separated
  desired_job_titles: string;     // comma-separated
  desired_locations: string;      // comma-separated
  salary_min_aud: number | "";
  salary_max_aud: number | "";
  work_type: string;
  seek_keywords: string;          // comma-separated
  seek_locations: string;         // comma-separated
  min_score_threshold: number | "";
};

function splitCSV(val: string | null | undefined): string[] {
  return (val ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export function Profile() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: profileApi.get,
  });

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<FormValues>();

  useEffect(() => {
    if (!profile) return;
    reset({
      phone: profile.phone ?? "",
      location_suburb: profile.location_suburb ?? "",
      location_state: profile.location_state ?? "",
      professional_summary: profile.professional_summary ?? "",
      linkedin_url: profile.linkedin_url ?? "",
      github_url: profile.github_url ?? "",
      technical_skills: (profile.technical_skills ?? []).join(", "),
      desired_job_titles: (profile.desired_job_titles ?? []).join(", "),
      desired_locations: (profile.desired_locations ?? []).join(", "),
      salary_min_aud: profile.salary_min_aud ?? "",
      salary_max_aud: profile.salary_max_aud ?? "",
      work_type: profile.work_type ?? "",
      seek_keywords: (profile.seek_keywords ?? []).join(", "),
      seek_locations: (profile.seek_locations ?? []).join(", "),
      min_score_threshold: profile.min_score_threshold ?? 70,
    });
  }, [profile, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      profileApi.update({
        phone: values.phone || undefined,
        location_suburb: values.location_suburb || undefined,
        location_state: values.location_state || undefined,
        professional_summary: values.professional_summary || undefined,
        linkedin_url: values.linkedin_url || undefined,
        github_url: values.github_url || undefined,
        technical_skills: splitCSV(values.technical_skills),
        desired_job_titles: splitCSV(values.desired_job_titles),
        desired_locations: splitCSV(values.desired_locations),
        salary_min_aud: values.salary_min_aud !== "" ? Number(values.salary_min_aud) : undefined,
        salary_max_aud: values.salary_max_aud !== "" ? Number(values.salary_max_aud) : undefined,
        work_type: (values.work_type as "full-time" | "part-time" | "contract" | "casual") || undefined,
        seek_keywords: splitCSV(values.seek_keywords),
        seek_locations: splitCSV(values.seek_locations),
        min_score_threshold: values.min_score_threshold !== "" ? Number(values.min_score_threshold) : undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Candidate Profile</h1>
      <p className="mt-1 text-sm text-gray-500">
        All resume content is generated strictly from these fields.
      </p>

      <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="mt-8 space-y-8">
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4">Personal</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone" {...register("phone")} />
            <Field label="Suburb" {...register("location_suburb")} />
            <Field label="State" {...register("location_state")} />
            <Field label="LinkedIn URL" {...register("linkedin_url")} />
            <Field label="GitHub URL" {...register("github_url")} />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Professional Summary
            </label>
            <textarea
              {...register("professional_summary")}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4">Skills & Preferences</h2>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Technical Skills (comma-separated)" {...register("technical_skills")} />
            <Field label="Desired Job Titles (comma-separated)" {...register("desired_job_titles")} />
            <Field label="Desired Locations (comma-separated)" {...register("desired_locations")} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Min Salary (AUD)" type="number" {...register("salary_min_aud")} />
              <Field label="Max Salary (AUD)" type="number" {...register("salary_max_aud")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
              <select
                {...register("work_type")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Any</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="casual">Casual</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-1">Seek Feed Settings</h2>
          <p className="text-xs text-gray-500 mb-4">
            Jobs AI checks these Seek feeds hourly via the public RSS feed.
          </p>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Seek Keywords (comma-separated)" {...register("seek_keywords")} />
            <Field
              label="Seek Locations (comma-separated Seek slugs, e.g. Melbourne-VIC-3000)"
              {...register("seek_locations")}
            />
            <Field
              label="Min Score Threshold (0–100, jobs below this score are hidden)"
              type="number"
              {...register("min_score_threshold")}
            />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!isDirty || saveMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <SaveIcon size={16} />
            {saveMutation.isPending ? "Saving…" : "Save Profile"}
          </button>
          {saveMutation.isSuccess && (
            <span className="text-sm text-emerald-600">Saved!</span>
          )}
          {saveMutation.isError && (
            <span className="text-sm text-red-500">Save failed. Check inputs.</span>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  type = "text",
  ...rest
}: { label: string; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        {...rest}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  );
}
