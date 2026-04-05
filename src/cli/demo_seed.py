from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from functools import cache

import bcrypt
from sqlalchemy import select, text

from app.api.modules.events.enums import ActivityType, EventStatus, PersonnelCategory
from app.api.modules.events.models import Event, EventHistory
from app.api.modules.tasks.enums import TaskPriority, TaskStatus
from app.api.modules.tasks.models import Task, TaskAssignee, TaskComment, TaskHistory
from app.api.modules.users.enums import UserRole
from app.api.modules.users.models import (
    User,
    UserCourse,
    UserDiscipline,
    UserDocument,
    UserEducation,
    UserFamilyMember,
)
from app.database.uow import UnitOfWork

TASK_STATUSES = list(TaskStatus)
TASK_PRIORITIES = list(TaskPriority)
EVENT_STATUSES = list(EventStatus)
ACTIVITY_TYPES = list(ActivityType)
PERSONNEL_CATEGORIES = list(PersonnelCategory)

FIRST_NAMES = [
    "Andrii",
    "Iryna",
    "Maksym",
    "Olena",
    "Taras",
    "Sofiia",
    "Dmytro",
    "Nataliia",
    "Roman",
    "Tetiana",
    "Bohdan",
    "Kateryna",
]
LAST_NAMES = [
    "Kovalenko",
    "Shevchenko",
    "Bondarenko",
    "Tkachenko",
    "Melnyk",
    "Kravchenko",
    "Polishchuk",
    "Lysenko",
    "Hrytsenko",
    "Marchenko",
]
PATRONYMICS = [
    "Oleksiiovych",
    "Mykhailivna",
    "Petrovych",
    "Ivanivna",
    "Serhiiovych",
    "Volodymyrivna",
]
POSITIONS = [
    "Chief psychologist",
    "Senior psychologist",
    "Staff psychologist",
    "Unit coordinator",
    "Case manager",
]
RANKS = [
    "captain",
    "major",
    "lieutenant",
    "sergeant",
    "civilian specialist",
]
UNITS = [
    "1st Brigade",
    "2nd Brigade",
    "Training Center",
    "Support Battalion",
    "Medical Unit",
    "HQ Staff",
]
TASK_TOPICS = [
    "psychological screening",
    "adaptation interview",
    "risk follow-up",
    "group support session",
    "family counseling preparation",
    "incident response analysis",
    "training material update",
    "documentation review",
]
TASK_VERBS = [
    "Prepare",
    "Review",
    "Coordinate",
    "Conduct",
    "Update",
    "Approve",
    "Schedule",
    "Verify",
]
COMMENT_SNIPPETS = [
    "Need final confirmation from the unit.",
    "Materials are ready for review.",
    "Added findings from the latest conversation.",
    "Waiting for one more attachment.",
    "Timing adjusted after the weekly sync.",
    "This needs a follow-up next week.",
]
EVENT_CONTENT = [
    "Unit resilience session",
    "Initial screening",
    "Family support briefing",
    "Critical incident follow-up",
    "Reintegration workshop",
    "Psychoeducation meeting",
    "Stress management class",
    "One-on-one consultation",
]
COURSE_TOPICS = [
    "trauma support",
    "group facilitation",
    "military adaptation",
    "peer counseling",
    "documentation standards",
]
DOCUMENT_TITLES = [
    "service_note.pdf",
    "profile_summary.pdf",
    "assessment_sheet.pdf",
    "rehab_plan.pdf",
]


@dataclass
class SeedSummary:
    admins: int
    psychologists: int
    respondents: int
    tasks: int
    subtasks: int
    task_comments: int
    task_history: int
    events: int
    event_history: int


@cache
def _hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt(rounds=12)
    ).decode("utf-8")


def _pick_name(index: int) -> tuple[str, str, str]:
    return (
        FIRST_NAMES[index % len(FIRST_NAMES)],
        LAST_NAMES[(index * 3) % len(LAST_NAMES)],
        PATRONYMICS[(index * 5) % len(PATRONYMICS)],
    )


def _user_payload(username: str, role: UserRole, index: int) -> dict:
    first_name, last_name, patronymic = _pick_name(index)
    payload: dict = {
        "username": username,
        "role": role,
        "is_active": True,
        "first_name": first_name,
        "last_name": last_name,
        "patronymic": patronymic,
        "email": f"{username}@demo.local",
        "phone": f"+38067{1000000 + index:07d}",
        "address": f"{12 + index % 70} Demo Street, Kyiv",
        "birth_date": date(1982 + index % 18, (index % 12) + 1, (index % 27) + 1),
        "marital_status": "married" if index % 2 == 0 else "single",
        "social_accounts": f"@{username}",
        "position": POSITIONS[index % len(POSITIONS)],
        "military_rank": RANKS[index % len(RANKS)],
        "combat_participation": index % 3 == 0,
        "reserve_status": index % 4 == 0,
        "housing": "service housing" if index % 2 == 0 else "rent",
        "rating": str(3 + index % 3),
        "pz_direction": ["support", "screening", "rehab"][index % 3],
        "tax_number": f"{9000000000 + index}",
        "contract_end_date": date(2026 + index % 3, (index % 12) + 1, (index % 27) + 1),
    }
    if role == UserRole.respondent:
        payload["position"] = "service member"
        payload["military_rank"] = ["private", "corporal", "sergeant"][index % 3]
        payload["pz_direction"] = "respondent-track"
    return payload


async def _upsert_user(
    uow: UnitOfWork,
    username: str,
    password: str,
    role: UserRole,
    index: int,
) -> User:
    result = await uow.session.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    payload = _user_payload(username, role, index)
    payload["password"] = _hash_password(password)

    if user is None:
        user = User(**payload)
        uow.session.add(user)
        await uow.flush()
        return user

    for key, value in payload.items():
        setattr(user, key, value)
    await uow.flush()
    return user


async def _reset_app_data(uow: UnitOfWork) -> None:
    await uow.session.execute(
        text(
            """
            TRUNCATE TABLE
                event_history,
                events,
                task_comments,
                task_history,
                task_assignees,
                tasks,
                user_documents,
                user_disciplines,
                user_courses,
                user_education,
                user_family_members,
                users
            RESTART IDENTITY CASCADE
            """
        )
    )
    await uow.flush()


async def _seed_related_profiles(
    uow: UnitOfWork,
    users: list[User],
) -> None:
    for index, user in enumerate(users, start=1):
        uow.session.add(
            UserEducation(
                user_id=user.id,
                institution=f"National Academy #{index % 9 + 1}",
                graduation_date=date(2005 + index % 15, (index % 12) + 1, 1),
                education_level="master",
                speciality="psychology" if user.role != UserRole.respondent else "service training",
            )
        )
        uow.session.add(
            UserCourse(
                user_id=user.id,
                institution=f"Training Center #{index % 5 + 1}",
                completion_date=date(2024 + index % 2, (index % 12) + 1, 10),
                topic=COURSE_TOPICS[index % len(COURSE_TOPICS)],
                ect_hours=12 + (index % 4) * 6,
            )
        )

        if index % 2 == 0:
            uow.session.add(
                UserFamilyMember(
                    user_id=user.id,
                    relation_type="spouse",
                    last_name=user.last_name or "Demo",
                    first_name=FIRST_NAMES[(index + 3) % len(FIRST_NAMES)],
                    patronymic=PATRONYMICS[(index + 2) % len(PATRONYMICS)],
                    birth_date=date(1985 + index % 10, ((index + 2) % 12) + 1, 15),
                    address=user.address,
                )
            )

        if index % 3 == 0:
            uow.session.add(
                UserDiscipline(
                    user_id=user.id,
                    type="reward" if index % 2 == 0 else "warning",
                    date=date(2025, ((index + 5) % 12) + 1, ((index + 3) % 27) + 1),
                    authority=UNITS[index % len(UNITS)],
                )
            )

        if index % 4 == 0:
            uow.session.add(
                UserDocument(
                    user_id=user.id,
                    title=DOCUMENT_TITLES[index % len(DOCUMENT_TITLES)],
                    file_path=f"/demo/docs/{user.username}/{DOCUMENT_TITLES[index % len(DOCUMENT_TITLES)]}",
                    description="Demo attachment for frontend preview",
                )
            )

    await uow.flush()


def _task_status_flow(status: TaskStatus) -> list[str]:
    flow = ["created"]
    if status in {
        TaskStatus.ASSIGNED,
        TaskStatus.IN_PROGRESS,
        TaskStatus.UNDER_REVIEW,
        TaskStatus.REVISION_REQUESTED,
        TaskStatus.COMPLETED,
    }:
        flow.append("assigned")
    if status in {
        TaskStatus.IN_PROGRESS,
        TaskStatus.UNDER_REVIEW,
        TaskStatus.REVISION_REQUESTED,
        TaskStatus.COMPLETED,
    }:
        flow.append("in_progress")
    if status in {
        TaskStatus.UNDER_REVIEW,
        TaskStatus.REVISION_REQUESTED,
        TaskStatus.COMPLETED,
    }:
        flow.append("under_review")
    if status is TaskStatus.REVISION_REQUESTED:
        flow.append("revision_requested")
    if status is TaskStatus.COMPLETED:
        flow.append("completed")
    return flow


async def _seed_tasks(
    uow: UnitOfWork,
    rng: random.Random,
    admins: list[User],
    psychologists: list[User],
    task_count: int,
) -> tuple[list[Task], int, int, int]:
    assignable_users = admins + psychologists
    root_tasks: list[Task] = []
    subtasks_count = 0
    comments_count = 0
    history_count = 0
    now = datetime.now(UTC)

    for index in range(task_count):
        status = TASK_STATUSES[index % len(TASK_STATUSES)]
        priority = TASK_PRIORITIES[index % len(TASK_PRIORITIES)]
        created_by = admins[index % len(admins)]
        created_at = now - timedelta(days=task_count - index, hours=index % 12)
        deadline = created_at + timedelta(days=3 + index % 16)
        assignees: list[TaskAssignee] = []
        assigned_users: list[User] = []

        if status is not TaskStatus.CREATED:
            candidates = psychologists if psychologists else assignable_users
            assigned_users = rng.sample(
                candidates, k=min(len(candidates), 1 + index % 3)
            )
            assignees = [
                TaskAssignee(
                    user_id=user.id,
                    assigned_at=created_at + timedelta(hours=1 + pos),
                )
                for pos, user in enumerate(assigned_users)
            ]

        task = Task(
            title=f"{TASK_VERBS[index % len(TASK_VERBS)]} {TASK_TOPICS[index % len(TASK_TOPICS)]} #{index + 1}",
            description=(
                f"Demo task #{index + 1}. Coordinate with {UNITS[index % len(UNITS)]} "
                f"and keep the case notes updated."
            ),
            status=status,
            priority=priority,
            deadline=deadline,
            completed_at=(deadline - timedelta(hours=4)) if status is TaskStatus.COMPLETED else None,
            created_by_id=created_by.id,
            assignees=assignees,
            created_at=created_at,
            updated_at=created_at + timedelta(hours=2),
        )
        uow.session.add(task)
        await uow.flush()
        root_tasks.append(task)

        flow = _task_status_flow(status)
        actors = [created_by] + assigned_users
        fallback_actor = actors[0]
        for step_index, step in enumerate(flow):
            actor = actors[min(step_index, len(actors) - 1)] if actors else fallback_actor
            description = {
                "created": "Task created",
                "assigned": "Task assigned to executors",
                "in_progress": "Work has started",
                "under_review": "Submitted for review",
                "revision_requested": "Revision requested by reviewer",
                "completed": "Task approved and completed",
            }[step]
            uow.session.add(
                TaskHistory(
                    task_id=task.id,
                    changed_by_id=actor.id,
                    event=step,
                    description=description,
                    created_at=created_at + timedelta(hours=step_index),
                )
            )
            history_count += 1

        for comment_index in range(index % 4):
            author = (
                assigned_users[comment_index % len(assigned_users)]
                if assigned_users
                else created_by
            )
            uow.session.add(
                TaskComment(
                    task_id=task.id,
                    author_id=author.id,
                    text=COMMENT_SNIPPETS[(index + comment_index) % len(COMMENT_SNIPPETS)],
                    created_at=created_at + timedelta(hours=comment_index + 2),
                )
            )
            comments_count += 1

        if index % 3 == 0:
            subtask_total = 1 + index % 3
            for subtask_index in range(subtask_total):
                sub_status = TASK_STATUSES[(index + subtask_index + 1) % len(TASK_STATUSES)]
                sub_assignees = assignees[:1] if assignees else []
                subtask = Task(
                    title=f"Subtask {index + 1}.{subtask_index + 1}",
                    description="Demo subtask linked to the parent task.",
                    status=sub_status,
                    priority=TASK_PRIORITIES[(index + subtask_index) % len(TASK_PRIORITIES)],
                    deadline=deadline + timedelta(days=subtask_index + 1),
                    completed_at=(
                        deadline + timedelta(days=subtask_index)
                        if sub_status is TaskStatus.COMPLETED
                        else None
                    ),
                    created_by_id=created_by.id,
                    parent_task_id=task.id,
                    assignees=[
                        TaskAssignee(
                            user_id=assignee.user_id,
                            assigned_at=created_at + timedelta(hours=3 + subtask_index),
                        )
                        for assignee in sub_assignees
                    ],
                    created_at=created_at + timedelta(minutes=15 * (subtask_index + 1)),
                    updated_at=created_at + timedelta(hours=3 + subtask_index),
                )
                uow.session.add(subtask)
                subtasks_count += 1

    await uow.flush()
    return root_tasks, subtasks_count, comments_count, history_count


async def _seed_events(
    uow: UnitOfWork,
    rng: random.Random,
    admins: list[User],
    psychologists: list[User],
    respondents: list[User],
    tasks: list[Task],
    event_count: int,
) -> tuple[int, int]:
    event_history_count = 0
    now = datetime.now(UTC)

    for index in range(event_count):
        psychologist = psychologists[index % len(psychologists)]
        created_by = admins[index % len(admins)]
        respondent = respondents[index % len(respondents)] if respondents else None
        base_date = now.date() + timedelta(days=(index % 90) - 45)
        start_hour = 8 + (index % 8)
        start_time = time(start_hour, 0)
        end_time = time(min(start_hour + 1, 23), 30)
        status = EVENT_STATUSES[index % len(EVENT_STATUSES)]
        is_archived = status in {
            EventStatus.COMPLETED,
            EventStatus.CANCELLED,
            EventStatus.POSTPONED,
        } and index % 11 == 0

        execution_deadline = None
        if status in {EventStatus.DRAFT, EventStatus.PLANNED, EventStatus.OVERDUE}:
            execution_deadline = datetime.combine(
                base_date, time(18, 0), tzinfo=UTC
            )
            if status is EventStatus.OVERDUE:
                execution_deadline = now - timedelta(days=1 + index % 5)

        event = Event(
            date=base_date,
            start_time=start_time if index % 5 != 0 else None,
            end_time=end_time if index % 5 != 0 else None,
            activity_type=ACTIVITY_TYPES[index % len(ACTIVITY_TYPES)],
            content=f"{EVENT_CONTENT[index % len(EVENT_CONTENT)]} #{index + 1}",
            target_unit=UNITS[index % len(UNITS)],
            respondent_id=respondent.id if respondent and index % 4 != 0 else None,
            respondent_name=(
                f"{respondent.last_name} {respondent.first_name}"
                if respondent and respondent.first_name and respondent.last_name and index % 4 != 0
                else f"Visitor #{index + 1}"
            ),
            personnel_category=PERSONNEL_CATEGORIES[index % len(PERSONNEL_CATEGORIES)],
            planned_count=5 + index % 18,
            actual_count=(4 + index % 15) if status is EventStatus.COMPLETED else None,
            is_controlled=index % 4 == 0,
            control_source="HQ order" if index % 4 == 0 else None,
            execution_deadline=execution_deadline,
            status=status,
            result=(
                "Session completed, follow-up recommended."
                if status is EventStatus.COMPLETED
                else None
            ),
            status_reason=(
                "Moved because of operational changes."
                if status is EventStatus.POSTPONED
                else "Cancelled due to schedule conflict."
                if status is EventStatus.CANCELLED
                else "Past execution deadline."
                if status is EventStatus.OVERDUE
                else None
            ),
            psychologist_id=psychologist.id,
            created_by_id=created_by.id,
            task_id=tasks[index % len(tasks)].id if tasks and index % 3 == 0 else None,
            is_archived=is_archived,
            archived_at=(now - timedelta(days=index % 9)) if is_archived else None,
            created_at=datetime.combine(base_date, time(7, 30), tzinfo=UTC),
            updated_at=datetime.combine(base_date, time(9, 0), tzinfo=UTC),
        )
        uow.session.add(event)
        await uow.flush()

        history_entries = [("created", "Event created")]
        if status is EventStatus.COMPLETED:
            history_entries.append(("completed", "Event completed"))
        elif status is EventStatus.POSTPONED:
            history_entries.append(("postponed", "Postponed after planning sync"))
        elif status is EventStatus.CANCELLED:
            history_entries.append(("cancelled", "Cancelled due to operational changes"))
        elif status is EventStatus.OVERDUE:
            history_entries.append(("overdue", "Marked overdue after missed deadline"))

        if is_archived:
            history_entries.append(("archived", "Moved to archive"))

        for event_index, (event_type, description) in enumerate(history_entries):
            actor = psychologist if event_type != "created" and rng.random() > 0.35 else created_by
            uow.session.add(
                EventHistory(
                    event_id=event.id,
                    changed_by_id=actor.id,
                    event_type=event_type,
                    description=description,
                    created_at=event.created_at + timedelta(hours=event_index),
                )
            )
            event_history_count += 1

    await uow.flush()
    return event_count, event_history_count


async def seed_demo_data(
    uow: UnitOfWork,
    *,
    admin_count: int,
    psychologist_count: int,
    respondent_count: int,
    task_count: int,
    event_count: int,
    random_seed: int,
    reset: bool,
) -> SeedSummary:
    rng = random.Random(random_seed)

    if reset:
        await _reset_app_data(uow)

    admins: list[User] = []
    psychologists: list[User] = []
    respondents: list[User] = []

    admins.append(
        await _upsert_user(uow, "admin", "admin", UserRole.admin, 1)
    )

    for index in range(1, admin_count):
        admins.append(
            await _upsert_user(
                uow,
                f"demo_admin_{index:02d}",
                "demo123",
                UserRole.admin,
                10 + index,
            )
        )

    for index in range(psychologist_count):
        psychologists.append(
            await _upsert_user(
                uow,
                f"demo_psy_{index + 1:02d}",
                "demo123",
                UserRole.psychologist,
                100 + index,
            )
        )

    for index in range(respondent_count):
        respondents.append(
            await _upsert_user(
                uow,
                f"demo_resp_{index + 1:02d}",
                "demo123",
                UserRole.respondent,
                300 + index,
            )
        )

    await _seed_related_profiles(uow, admins + psychologists + respondents)
    tasks, subtasks, task_comments, task_history = await _seed_tasks(
        uow, rng, admins, psychologists, task_count
    )
    events, event_history = await _seed_events(
        uow, rng, admins, psychologists, respondents, tasks, event_count
    )
    await uow.commit()

    return SeedSummary(
        admins=len(admins),
        psychologists=len(psychologists),
        respondents=len(respondents),
        tasks=len(tasks),
        subtasks=subtasks,
        task_comments=task_comments,
        task_history=task_history,
        events=events,
        event_history=event_history,
    )
