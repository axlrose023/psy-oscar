"""add event assignees

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-04-30

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f7a8b9c0d1e2"
down_revision: str | None = "e6f7a8b9c0d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "event_assignees",
        sa.Column("event_id", sa.UUID(), sa.ForeignKey("events.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp(), nullable=False),
    )
    op.create_index("event_assignees_user_id_idx", "event_assignees", ["user_id"])
    op.execute(
        """
        insert into event_assignees (event_id, user_id)
        select id, psychologist_id
        from events
        on conflict do nothing
        """
    )


def downgrade() -> None:
    op.drop_index("event_assignees_user_id_idx", table_name="event_assignees")
    op.drop_table("event_assignees")
