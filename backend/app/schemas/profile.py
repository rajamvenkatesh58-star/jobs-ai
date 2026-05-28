import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, HttpUrl, model_validator


class WorkExperience(BaseModel):
    company: str = Field(min_length=1, max_length=255)
    role: str = Field(min_length=1, max_length=255)
    location: str | None = None
    start_date: str  # ISO date string YYYY-MM
    end_date: str | None = None  # null = current role
    achievements: list[str] = Field(default_factory=list, max_length=20)
    technologies: list[str] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def validate_dates(self) -> "WorkExperience":
        import re

        pattern = r"^\d{4}-(0[1-9]|1[0-2])$"
        if not re.match(pattern, self.start_date):
            raise ValueError("start_date must be YYYY-MM")
        if self.end_date and not re.match(pattern, self.end_date):
            raise ValueError("end_date must be YYYY-MM")
        return self


class Education(BaseModel):
    institution: str = Field(min_length=1, max_length=255)
    degree: str = Field(min_length=1, max_length=255)
    field_of_study: str = Field(min_length=1, max_length=255)
    graduation_year: int = Field(ge=1950, le=2030)
    gpa: float | None = Field(default=None, ge=0.0, le=7.0)


class Certification(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    issuer: str = Field(min_length=1, max_length=255)
    year: int = Field(ge=1990, le=2030)
    url: str | None = None


class Language(BaseModel):
    language: str = Field(min_length=1, max_length=100)
    proficiency: str  # e.g. Native, Fluent, Conversational, Basic


class ScoringWeights(BaseModel):
    skills_match: float = Field(ge=0.0, le=1.0)
    experience_level: float = Field(ge=0.0, le=1.0)
    location: float = Field(ge=0.0, le=1.0)
    salary: float = Field(ge=0.0, le=1.0)

    @model_validator(mode="after")
    def weights_sum_to_one(self) -> "ScoringWeights":
        total = self.skills_match + self.experience_level + self.location + self.salary
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"Scoring weights must sum to 1.0, got {total:.2f}")
        return self


class ProfileUpdate(BaseModel):
    phone: str | None = Field(default=None, max_length=50)
    location_suburb: str | None = Field(default=None, max_length=100)
    location_state: str | None = Field(default=None, max_length=50)
    linkedin_url: str | None = Field(default=None, max_length=500)
    github_url: str | None = Field(default=None, max_length=500)
    portfolio_url: str | None = Field(default=None, max_length=500)
    professional_summary: str | None = Field(default=None, max_length=3000)

    work_experience: list[WorkExperience] | None = None
    education: list[Education] | None = None
    technical_skills: list[str] | None = Field(default=None, max_length=100)
    certifications: list[Certification] | None = None
    languages: list[Language] | None = None

    desired_job_titles: list[str] | None = Field(default=None, max_length=20)
    desired_locations: list[str] | None = Field(default=None, max_length=10)
    salary_min_aud: int | None = Field(default=None, ge=0)
    salary_max_aud: int | None = Field(default=None, ge=0)
    work_type: str | None = Field(
        default=None, pattern=r"^(full-time|part-time|contract|casual)$"
    )

    seek_keywords: list[str] | None = Field(default=None, max_length=20)
    seek_locations: list[str] | None = Field(default=None, max_length=10)
    seek_categories: list[str] | None = Field(default=None, max_length=10)
    min_score_threshold: int | None = Field(default=None, ge=0, le=100)
    scoring_weights: ScoringWeights | None = None


class ProfileRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    phone: str | None
    location_suburb: str | None
    location_state: str | None
    linkedin_url: str | None
    github_url: str | None
    portfolio_url: str | None
    professional_summary: str | None
    work_experience: list[Any] | None
    education: list[Any] | None
    technical_skills: list[str] | None
    certifications: list[Any] | None
    languages: list[Any] | None
    desired_job_titles: list[str] | None
    desired_locations: list[str] | None
    salary_min_aud: int | None
    salary_max_aud: int | None
    work_type: str | None
    seek_keywords: list[str] | None
    seek_locations: list[str] | None
    seek_categories: list[str] | None
    min_score_threshold: int | None
    scoring_weights: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
