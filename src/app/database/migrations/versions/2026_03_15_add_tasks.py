"""add tasks

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-03-15

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: str | None = "b1c2d3e4f5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

task_status_enum = sa.Enum(
    "created", "assigned", "in_progress", "under_review",
    "revision_requested", "completed",
    name="task_status",
)


def upgrade() -> None:
    task_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "tasks",
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", task_status_enum, nullable=False, server_default="created"),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("tasks_pkey")),
    )
    op.create_index(op.f("tasks_created_by_id_idx"), "tasks", ["created_by_id"])
    op.create_index(op.f("tasks_status_idx"), "tasks", ["status"])

    op.create_table(
        "task_assignees",
        sa.Column(
            "task_id", sa.UUID(),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column(
            "user_id", sa.UUID(),
            sa.ForeignKey("users.id"), nullable=False,
        ),
        sa.Column(
            "assigned_at", sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False,
        ),
        sa.PrimaryKeyConstraint("task_id", "user_id", name=op.f("task_assignees_pkey")),
    )

    op.create_table(
        "task_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "task_id", sa.UUID(),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column(
            "changed_by_id", sa.UUID(),
            sa.ForeignKey("users.id"), nullable=False,
        ),
        sa.Column("event", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("task_history_pkey")),
    )
    op.create_index(op.f("task_history_task_id_idx"), "task_history", ["task_id"])

    op.create_table(
        "task_comments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "task_id", sa.UUID(),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column(
            "author_id", sa.UUID(),
            sa.ForeignKey("users.id"), nullable=False,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("task_comments_pkey")),
    )
    op.create_index(op.f("task_comments_task_id_idx"), "task_comments", ["task_id"])


def downgrade() -> None:
    op.drop_table("task_comments")
    op.drop_table("task_history")
    op.drop_table("task_assignees")
    op.drop_table("tasks")
    task_status_enum.drop(op.get_bind(), checkfirst=True)
