import datetime
import uuid

from sqlalchemy import (
    UUID,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.api.modules.events.enums import ActivityType, EventStatus, PersonnelCategory
from app.database.base import Base, DateTimeMixin, UUID7IDMixin


class Event(Base, UUID7IDMixin, DateTimeMixin):
    __tablename__ = "events"

    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    start_time: Mapped[datetime.time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[datetime.time | None] = mapped_column(Time, nullable=True)
    activity_type: Mapped[ActivityType] = mapped_column(
        Enum(ActivityType, name="activity_type"), nullable=False
    )
    content: Mapped[str | None] = mapped_column(Text, nullable=True)

    target_unit: Mapped[str | None] = mapped_column(String(200), nullable=True)
    target_person_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    target_person_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    personnel_category: Mapped[PersonnelCategory | None] = mapped_column(
        Enum(PersonnelCategory, name="personnel_category"), nullable=True
    )

    planned_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    is_controlled: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), default=False
    )
    control_source: Mapped[str | None] = mapped_column(String(200), nullable=True)
    execution_deadline: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="event_status"),
        server_default="draft",
        default=EventStatus.DRAFT,
    )
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    psychologist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )

    is_archived: Mapped[bool] = mapped_column(
        Boolean, server_default=text("false"), default=False
    )
    archived_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # --- Relationships ---
    psychologist: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[psychologist_id], lazy="joined"
    )
    created_by: Mapped["User"] = relationship(  # noqa: F821
        "User", foreign_keys=[created_by_id], lazy="joined"
    )
    task: Mapped["Task | None"] = relationship(  # noqa: F821
        "Task", foreign_keys=[task_id]
    )
    history: Mapped[list["EventHistory"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )


class EventHistory(Base):
    __tablename__ = "event_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    changed_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp()
    )

    event: Mapped["Event"] = relationship(back_populates="history")
    changed_by: Mapped["User"] = relationship("User", foreign_keys=[changed_by_id])  # noqa: F821
