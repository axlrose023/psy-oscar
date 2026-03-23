"""add user related tables

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-03-20

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f5a6b7c8d9e0"
down_revision: str | None = "e4f5a6b7c8d9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_family_members",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("relation_type", sa.String(20), nullable=False),
        sa.Column("last_name", sa.String(30), nullable=False),
        sa.Column("first_name", sa.String(20), nullable=False),
        sa.Column("patronymic", sa.String(20), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("address", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
    )
    op.create_index("user_family_members_user_id_idx", "user_family_members", ["user_id"])

    op.create_table(
        "user_education",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("institution", sa.String(100), nullable=False),
        sa.Column("graduation_date", sa.Date(), nullable=True),
        sa.Column("education_level", sa.String(50), nullable=True),
        sa.Column("speciality", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
    )
    op.create_index("user_education_user_id_idx", "user_education", ["user_id"])

    op.create_table(
        "user_courses",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("institution", sa.String(100), nullable=False),
        sa.Column("completion_date", sa.Date(), nullable=True),
        sa.Column("topic", sa.String(100), nullable=True),
        sa.Column("ect_hours", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
    )
    op.create_index("user_courses_user_id_idx", "user_courses", ["user_id"])

    op.create_table(
        "user_disciplines",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("date", sa.Date(), nullable=True),
        sa.Column("authority", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
    )
    op.create_index("user_disciplines_user_id_idx", "user_disciplines", ["user_id"])

    op.create_table(
        "user_documents",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(50), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.current_timestamp()),
    )
    op.create_index("user_documents_user_id_idx", "user_documents", ["user_id"])


def downgrade() -> None:
    op.drop_index("user_documents_user_id_idx", table_name="user_documents")
    op.drop_table("user_documents")

    op.drop_index("user_disciplines_user_id_idx", table_name="user_disciplines")
    op.drop_table("user_disciplines")

    op.drop_index("user_courses_user_id_idx", table_name="user_courses")
    op.drop_table("user_courses")

    op.drop_index("user_education_user_id_idx", table_name="user_education")
    op.drop_table("user_education")

    op.drop_index("user_family_members_user_id_idx", table_name="user_family_members")
    op.drop_table("user_family_members")
