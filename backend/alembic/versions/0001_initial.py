"""initial

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    op.create_table(
        'job_listings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('seek_job_id', sa.String(100), nullable=False, unique=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('company', sa.String(255)),
        sa.Column('location', sa.String(255)),
        sa.Column('category', sa.String(255)),
        sa.Column('sub_category', sa.String(255)),
        sa.Column('work_type', sa.String(100)),
        sa.Column('salary_range', sa.String(255)),
        sa.Column('description', sa.Text()),
        sa.Column('listing_url', sa.String(2000), nullable=False),
        sa.Column('published_at', sa.DateTime(timezone=True)),
        sa.Column('ingested_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('score_results', postgresql.JSONB()),
    )
    op.create_index('ix_job_listings_seek_job_id', 'job_listings', ['seek_job_id'])

    op.create_table(
        'candidate_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('phone', sa.String(50)),
        sa.Column('location_suburb', sa.String(100)),
        sa.Column('location_state', sa.String(50)),
        sa.Column('linkedin_url', sa.String(500)),
        sa.Column('github_url', sa.String(500)),
        sa.Column('portfolio_url', sa.String(500)),
        sa.Column('professional_summary', sa.Text()),
        sa.Column('work_experience', postgresql.JSONB()),
        sa.Column('education', postgresql.JSONB()),
        sa.Column('technical_skills', postgresql.ARRAY(sa.String())),
        sa.Column('certifications', postgresql.JSONB()),
        sa.Column('languages', postgresql.JSONB()),
        sa.Column('desired_job_titles', postgresql.ARRAY(sa.String())),
        sa.Column('desired_locations', postgresql.ARRAY(sa.String())),
        sa.Column('salary_min_aud', sa.Integer()),
        sa.Column('salary_max_aud', sa.Integer()),
        sa.Column('work_type', sa.String(50)),
        sa.Column('seek_keywords', postgresql.ARRAY(sa.String())),
        sa.Column('seek_locations', postgresql.ARRAY(sa.String())),
        sa.Column('seek_categories', postgresql.ARRAY(sa.String())),
        sa.Column('min_score_threshold', sa.Integer()),
        sa.Column('scoring_weights', postgresql.JSONB()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        'job_applications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('job_listings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resume_pdf_path', sa.String(1000)),
        sa.Column('cover_letter_pdf_path', sa.String(1000)),
        sa.Column('resume_text', sa.Text()),
        sa.Column('cover_letter_text', sa.Text()),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending_review'),
        sa.Column('match_score', sa.Integer()),
        sa.Column('score_reasoning', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True)),
        sa.Column('submitted_at', sa.DateTime(timezone=True)),
    )
    op.create_index('ix_job_applications_user_id', 'job_applications', ['user_id'])
    op.create_index('ix_job_applications_job_id', 'job_applications', ['job_id'])

    op.create_table(
        'interview_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('job_listings.id', ondelete='SET NULL'), nullable=True),
        sa.Column('application_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('job_applications.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='question_bank_ready'),
        sa.Column('question_bank', postgresql.JSONB()),
        sa.Column('overall_score', sa.Integer()),
        sa.Column('debrief_report', sa.Text()),
        sa.Column('debrief_pdf_path', sa.String(1000)),
        sa.Column('started_at', sa.DateTime(timezone=True)),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_interview_sessions_user_id', 'interview_sessions', ['user_id'])
    op.create_index('ix_interview_sessions_job_id', 'interview_sessions', ['job_id'])

    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(100)),
        sa.Column('entity_id', sa.String(100)),
        sa.Column('llm_model', sa.String(100)),
        sa.Column('llm_prompt_tokens', sa.Integer()),
        sa.Column('llm_completion_tokens', sa.Integer()),
        sa.Column('payload', postgresql.JSONB()),
        sa.Column('status', sa.String(50), nullable=False, server_default='success'),
        sa.Column('error_message', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_event_type', 'audit_logs', ['event_type'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('interview_sessions')
    op.drop_table('job_applications')
    op.drop_table('candidate_profiles')
    op.drop_table('job_listings')
    op.drop_table('users')
