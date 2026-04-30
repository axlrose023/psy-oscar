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


class EventAssignee(Base):
    __tablename__ = "event_assignees"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    assigned_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp()
    )

    user: Mapped["User"] = relationship("User", lazy="joined")  # noqa: F821


class Event(Base, UUID7IDMixin, DateTimeMixin):
    __tablename__ = "events"

    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    start_time: Mapped[datetime.time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[datetime.time | None] = mapped_column(Time, nullable=True)
    activity_type: Mapped[ActivityType] = mapped_column(
        Enum(
            ActivityType,
            name="activity_type",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
    )
    content: Mapped[str | None] = mapped_column(Text, nullable=True)

    target_unit: Mapped[str | None] = mapped_column(String(200), nullable=True)
    respondent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    respondent_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    personnel_category: Mapped[PersonnelCategory | None] = mapped_column(
        Enum(
            PersonnelCategory,
            name="personnel_category",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=True,
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
        Enum(
            EventStatus,
            name="event_status",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
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
    assignees: Mapped[list["EventAssignee"]] = relationship(
        cascade="all, delete-orphan", lazy="joined"
    )
    history: Mapped[list["EventHistory"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )

    def is_assigned_to(self, user_id: uuid.UUID) -> bool:
        return any(a.user_id == user_id for a in self.assignees)


class EventHistory(Base):
    __tablename__ = "event_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp()
    )

    event: Mapped["Event"] = relationship(back_populates="history")
    changed_by: Mapped["User"] = relationship("User", foreign_keys=[changed_by_id])  # noqa: F821
