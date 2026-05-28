import { BuildingIcon, MapPinIcon, BriefcaseIcon, DollarSignIcon, ExternalLinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { JobListing } from "../api/jobs";
import { ScoreBadge } from "./ScoreBadge";

interface Props {
  job: JobListing;
  onGenerateDocs?: (jobId: string) => void;
  onStartInterview?: (jobId: string) => void;
}

export function JobCard({ job, onGenerateDocs, onStartInterview }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {job.company && (
              <span className="flex items-center gap-1">
                <BuildingIcon size={13} />
                {job.company}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon size={13} />
                {job.location}
              </span>
            )}
            {job.work_type && (
              <span className="flex items-center gap-1">
                <BriefcaseIcon size={13} />
                {job.work_type}
              </span>
            )}
            {job.salary_range && (
              <span className="flex items-center gap-1">
                <DollarSignIcon size={13} />
                {job.salary_range}
              </span>
            )}
          </div>
        </div>
        <ScoreBadge score={job.my_score} size="lg" />
      </div>

      {job.my_score_reasoning && (
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{job.my_score_reasoning}</p>
      )}

      {job.description && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-3">{job.description}</p>
      )}

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <a
          href={job.listing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          View on Seek <ExternalLinkIcon size={12} />
        </a>
        {onGenerateDocs && (
          <button
            onClick={() => onGenerateDocs(job.id)}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            Generate Resume + Cover Letter
          </button>
        )}
        {onStartInterview && (
          <button
            onClick={() => onStartInterview(job.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Practice Interview
          </button>
        )}
      </div>
    </div>
  );
}
