"""add user role

Revision ID: b1c2d3e4f5a6
Revises: aac9c3981adb
Create Date: 2026-03-14

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b1c2d3e4f5a6"
down_revision: str | None = "aac9c3981adb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

user_role_enum = sa.Enum("admin", "psychologist", "respondent", name="user_role")
user_role_column_enum = postgresql.ENUM(
    "admin",
    "psychologist",
    "respondent",
    name="user_role",
    create_type=False,
)


def upgrade() -> None:
    user_role_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "users",
        sa.Column(
            "role",
            user_role_column_enum,
            nullable=False,
            server_default="respondent",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "role")
    user_role_enum.drop(op.get_bind(), checkfirst=True)
