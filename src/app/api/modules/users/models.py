import datetime
import uuid

from sqlalchemy import UUID, Boolean, Date, Enum, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.api.modules.users.enums import UserRole
from app.database.base import Base, DateTimeMixin, UUID7IDMixin


class User(Base, UUID7IDMixin, DateTimeMixin):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String, index=True, unique=True)
    password: Mapped[str] = mapped_column(String)
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        default=UserRole.respondent,
    )
    is_active: Mapped[bool] = mapped_column(default=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), default=False)

    # --- Profile fields ---
    tax_number: Mapped[str | None] = mapped_column(String(10), unique=True, nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(30), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(20), nullable=True)
    patronymic: Mapped[str | None] = mapped_column(String(20), nullable=True)
    photo: Mapped[str | None] = mapped_column(String, nullable=True)
    birth_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # --- Psychologist-specific fields ---
    military_rank: Mapped[str | None] = mapped_column(String(50), nullable=True)
    position: Mapped[str | None] = mapped_column(String(200), nullable=True)
    address: Mapped[str | None] = mapped_column(String(200), nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(100), nullable=True)
    social_accounts: Mapped[str | None] = mapped_column(String(200), nullable=True)
    combat_participation: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    reserve_status: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    housing: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rating: Mapped[str | None] = mapped_column(String(5), nullable=True)
    contract_end_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    pz_direction: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # --- Related entities ---
    family_members: Mapped[list["UserFamilyMember"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    education: Mapped[list["UserEducation"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    courses: Mapped[list["UserCourse"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    disciplines: Mapped[list["UserDiscipline"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    documents: Mapped[list["UserDocument"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserFamilyMember(Base, UUID7IDMixin, DateTimeMixin):
    __tablename__ = "user_family_members"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    relation_type: Mapped[str] = mapped_column(String(20))
    last_name: Mapped[str] = mapped_column(String(30))
    first_name: Mapped[str] = mapped_column(String(20))
    patronymic: Mapped[str | None] = mapped_column(String(20), nullable=True)
    birth_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    address: Mapped[str | None] = mapped_column(String(200), nullable=True)

    user: Mapped["User"] = relationship(back_populates="family_members")


class UserEducation(Base, UUID7IDMixin, DateTimeMixin):
    __tablename__ = "user_education"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    institution: Mapped[str] = mapped_column(String(100))
    graduation_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    education_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    speciality: Mapped[str | None] = mapped_column(String(100), nullable=True)

    user: Mapped["User"] = relationship(back_populates="education")


class UserCourse(Base, UUID7IDMixin, DateTimeMixin):
    __tablename__ = "user_courses"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    institution: Mapped[str] = mapped_column(String(100))
    completion_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    topic: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ect_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)

    user: Mapped["User"] = relationship(back_populates="courses")


class UserDiscipline(Base, UUID7IDMixin, DateTimeMixin):
    __tablename__ = "user_disciplines"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(String(50))
    date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    authority: Mapped[str | None] = mapped_column(String(50), nullable=True)

    user: Mapped["User"] = relationship(back_populates="disciplines")


class UserDocument(Base, UUID7IDMixin, DateTimeMixin):
    __tablename__ = "user_documents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(50))
    file_path: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="documents")
