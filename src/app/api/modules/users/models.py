from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.api.modules.users.enums import UserRole
from app.database.base import Base, DateTimeMixin, UUID7IDMixin


class User(Base, UUID7IDMixin, DateTimeMixin):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String, index=True)
    password: Mapped[str] = mapped_column(String)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        default=UserRole.respondent,
    )
    is_active: Mapped[bool] = mapped_column(default=True)
