from enum import StrEnum


class EventStatus(StrEnum):
    DRAFT = "draft"
    PLANNED = "planned"
    COMPLETED = "completed"
    POSTPONED = "postponed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class ActivityType(StrEnum):
    PPV = "ppv"
    PPSP = "ppsp"
    ADAPTATION = "adaptation"
    SCREENING = "screening"
    SPD = "spd"
    AID = "aid"
    RECOVERY = "recovery"
    OTHER = "other"


class PersonnelCategory(StrEnum):
    OFFICER = "officer"
    CONTRACT = "contract"
    EMPLOYEE = "employee"
    FAMILY = "family"
