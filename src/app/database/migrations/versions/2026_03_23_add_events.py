"""add events and event_history tables

Revision ID: a1b2c3d4e5f6
Revises: f5a6b7c8d9e0
Create Date: 2026-03-23

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "f5a6b7c8d9e0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    activity_type = sa.Enum(
        "ppv", "ppsp", "adaptation", "screening", "spd", "aid", "recovery", "other",
        name="activity_type",
    )
    personnel_category = sa.Enum(
        "officer", "contract", "employee", "family",
        name="personnel_category",
    )
    event_status = sa.Enum(
        "draft", "planned", "completed", "postponed", "overdue", "cancelled",
        name="event_status",
    )

    op.create_table(
        "events",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("activity_type", activity_type, nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("target_unit", sa.String(200), nullable=True),
        sa.Column("target_person_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("target_person_name", sa.String(100), nullable=True),
        sa.Column("personnel_category", personnel_category, nullable=True),
        sa.Column("planned_count", sa.Integer(), nullable=True),
        sa.Column("actual_count", sa.Integer(), nullable=True),
        sa.Column("is_controlled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("control_source", sa.String(200), nullable=True),
        sa.Column("execution_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", event_status, server_default="draft", nullable=False),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("status_reason", sa.Text(), nullable=True),
        sa.Column("psychologist_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", sa.UUID(), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_archived", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
    )
    op.create_index("events_psychologist_id_idx", "events", ["psychologist_id"])
    op.create_index("events_date_idx", "events", ["date"])
    op.create_index("events_status_idx", "events", ["status"])
    op.create_index("events_task_id_idx", "events", ["task_id"])

    op.create_table(
        "event_history",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("event_id", sa.UUID(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("changed_by_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
    )
    op.create_index("event_history_event_id_idx", "event_history", ["event_id"])


def downgrade() -> None:
    op.drop_index("event_history_event_id_idx", table_name="event_history")
    op.drop_table("event_history")

    op.drop_index("events_task_id_idx", table_name="events")
    op.drop_index("events_status_idx", table_name="events")
    op.drop_index("events_date_idx", table_name="events")
    op.drop_index("events_psychologist_id_idx", table_name="events")
    op.drop_table("events")

    sa.Enum(name="event_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="personnel_category").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="activity_type").drop(op.get_bind(), checkfirst=True)
