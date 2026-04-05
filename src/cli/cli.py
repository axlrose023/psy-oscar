import subprocess
from configparser import ConfigParser
from pathlib import Path
from typing import Annotated

import anyio
import bcrypt
import typer
from alembic import command
from alembic.config import Config

from app.api.modules.users.enums import UserRole
from app.api.modules.users.models import User
from app.database.uow import UnitOfWork
from app.ioc import get_async_container
from cli.demo_seed import seed_demo_data

app = typer.Typer()


alembic_ini_path = Path(__file__).parent.parent.parent / "alembic.ini"


def get_alembic_config() -> Config:
    """Get Alembic configuration."""
    if not alembic_ini_path.exists():
        raise FileNotFoundError("alembic.ini not found")
    return Config("alembic.ini")


@app.command()
def tests(
    path: Annotated[str, typer.Argument()] = "src/tests",
) -> None:
    """Run parallel tests."""

    subprocess.run(["uv", "run", "pytest", path, "-n", "auto"])


@app.command("migration")
def migration(name: Annotated[str | None, typer.Option(prompt=True)] = None) -> None:
    """Generate a new Alembic migration."""
    alembic_cfg = get_alembic_config()
    command.revision(alembic_cfg, message=name, autogenerate=True)
    typer.echo(
        typer.style(
            f"New migration '{name}' created successfully.",
            fg=typer.colors.GREEN,
        ),
    )


@app.command("migrations")
def migrations() -> None:
    """list migration files."""
    if not alembic_ini_path.exists():
        raise FileNotFoundError("alembic.ini not found")
    config = ConfigParser()
    config.read(alembic_ini_path)
    migrations_path = config.get("alembic", "script_location")
    typer.echo(f"Migration files are located in: {migrations_path}")
    migration_dir = Path(migrations_path) / "versions"
    for file in migration_dir.glob("*.py"):
        typer.echo(f"- {file}")


@app.command("upgrade")
def upgrade(revision: str = "head") -> None:
    """Upgrade the database to a specific revision."""
    alembic_cfg = get_alembic_config()
    command.upgrade(alembic_cfg, revision)
    typer.echo(
        typer.style(
            f"Database upgraded to revision '{revision}' successfully.",
            fg=typer.colors.GREEN,
        ),
    )


@app.command("downgrade")
def downgrade(revision: str = "-1") -> None:
    """Downgrade the database to a specific revision."""
    alembic_cfg = get_alembic_config()
    command.downgrade(alembic_cfg, revision)
    typer.echo(
        typer.style(
            f"Database downgraded to revision '{revision}' successfully.",
            fg=typer.colors.GREEN,
        ),
    )


@app.command("create_user")
def create_user(
    username: Annotated[str, typer.Option(prompt=True)] = None,
    password: Annotated[str, typer.Option(prompt=True, hide_input=True)] = None,
    role: Annotated[UserRole, typer.Option()] = UserRole.respondent,
) -> None:
    """Create a new user."""

    async def _create_user():
        container = get_async_container()
        async with container() as request_container:
            uow = await request_container.get(UnitOfWork)
            hashed_password = bcrypt.hashpw(
                password.encode("utf-8"), bcrypt.gensalt(rounds=12)
            ).decode("utf-8")
            user = User(
                username=username,
                password=hashed_password,
                role=role,
                is_active=True,
            )
            await uow.users.create(user)
            await uow.commit()
            typer.echo(f"User '{username}' created successfully.")

    anyio.run(_create_user)


@app.command("seed_demo")
def seed_demo(
    admins: Annotated[int, typer.Option(min=1)] = 5,
    psychologists: Annotated[int, typer.Option(min=1)] = 18,
    respondents: Annotated[int, typer.Option(min=1)] = 42,
    tasks: Annotated[int, typer.Option(min=1)] = 140,
    events: Annotated[int, typer.Option(min=1)] = 180,
    random_seed: Annotated[int, typer.Option("--seed")] = 42,
    reset: Annotated[bool, typer.Option("--reset/--no-reset")] = False,
) -> None:
    """Seed a large demo dataset for the frontend."""

    async def _seed_demo() -> None:
        container = get_async_container()
        async with container() as request_container:
            uow = await request_container.get(UnitOfWork)
            summary = await seed_demo_data(
                uow,
                admin_count=admins,
                psychologist_count=psychologists,
                respondent_count=respondents,
                task_count=tasks,
                event_count=events,
                random_seed=random_seed,
                reset=reset,
            )

            typer.echo("Demo data seeded successfully.")
            typer.echo(
                "Users: "
                f"{summary.admins} admins, "
                f"{summary.psychologists} psychologists, "
                f"{summary.respondents} respondents"
            )
            typer.echo(
                "Tasks: "
                f"{summary.tasks} root tasks, "
                f"{summary.subtasks} subtasks, "
                f"{summary.task_comments} comments, "
                f"{summary.task_history} history rows"
            )
            typer.echo(
                "Events: "
                f"{summary.events} events, "
                f"{summary.event_history} history rows"
            )
            typer.echo("Credentials: admin/admin, demo_psy_01/demo123, demo_resp_01/demo123")

    anyio.run(_seed_demo)
