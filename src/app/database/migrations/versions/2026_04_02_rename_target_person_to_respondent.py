"""rename target_person to respondent in events

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-02

"""

from collections.abc import Sequence

from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("events", "target_person_id", new_column_name="respondent_id")
    op.alter_column("events", "target_person_name", new_column_name="respondent_name")


def downgrade() -> None:
    op.alter_column("events", "respondent_id", new_column_name="target_person_id")
    op.alter_column("events", "respondent_name", new_column_name="target_person_name")
