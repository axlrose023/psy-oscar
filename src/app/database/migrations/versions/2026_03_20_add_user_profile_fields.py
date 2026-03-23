"""add user profile fields

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-03-20

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e4f5a6b7c8d9"
down_revision: str | None = "d3e4f5a6b7c8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("tax_number", sa.String(10), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(30), nullable=True))
    op.add_column("users", sa.Column("first_name", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("patronymic", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("photo", sa.String(), nullable=True))
    op.add_column("users", sa.Column("birth_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(30), nullable=True))
    op.add_column("users", sa.Column("email", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("military_rank", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("position", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("address", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("marital_status", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("social_accounts", sa.String(200), nullable=True))
    op.add_column("users", sa.Column("combat_participation", sa.Boolean(), nullable=True))
    op.add_column("users", sa.Column("reserve_status", sa.Boolean(), nullable=True))
    op.add_column("users", sa.Column("housing", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("rating", sa.String(5), nullable=True))
    op.add_column("users", sa.Column("contract_end_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("pz_direction", sa.String(50), nullable=True))

    op.create_unique_constraint("users_tax_number_ukey", "users", ["tax_number"])


def downgrade() -> None:
    op.drop_constraint("users_tax_number_ukey", "users", type_="unique")

    op.drop_column("users", "pz_direction")
    op.drop_column("users", "contract_end_date")
    op.drop_column("users", "rating")
    op.drop_column("users", "housing")
    op.drop_column("users", "reserve_status")
    op.drop_column("users", "combat_participation")
    op.drop_column("users", "social_accounts")
    op.drop_column("users", "marital_status")
    op.drop_column("users", "address")
    op.drop_column("users", "position")
    op.drop_column("users", "military_rank")
    op.drop_column("users", "email")
    op.drop_column("users", "phone")
    op.drop_column("users", "birth_date")
    op.drop_column("users", "photo")
    op.drop_column("users", "patronymic")
    op.drop_column("users", "first_name")
    op.drop_column("users", "last_name")
    op.drop_column("users", "tax_number")
