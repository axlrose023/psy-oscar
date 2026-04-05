"""add priority and subtasks

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-03-15

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d3e4f5a6b7c8"
down_revision: str | None = "c2d3e4f5a6b7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

task_priority_enum = sa.Enum(
    "low", "medium", "high", "critical",
    name="task_priority",
)
task_priority_column_enum = postgresql.ENUM(
    "low", "medium", "high", "critical",
    name="task_priority",
    create_type=False,
)


def upgrade() -> None:
    task_priority_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "tasks",
        sa.Column(
            "priority", task_priority_column_enum,
            nullable=False, server_default="medium",
        ),
    )
    op.add_column(
        "tasks",
        sa.Column(
            "parent_task_id", sa.UUID(),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.create_index(op.f("tasks_priority_idx"), "tasks", ["priority"])
    op.create_index(op.f("tasks_parent_task_id_idx"), "tasks", ["parent_task_id"])


def downgrade() -> None:
    op.drop_index(op.f("tasks_parent_task_id_idx"), table_name="tasks")
    op.drop_index(op.f("tasks_priority_idx"), table_name="tasks")
    op.drop_column("tasks", "parent_task_id")
    op.drop_column("tasks", "priority")
    task_priority_enum.drop(op.get_bind(), checkfirst=True)
