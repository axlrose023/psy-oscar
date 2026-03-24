from collections.abc import Sequence
from uuid import UUID

from app.api.modules.events.manager import EventManager
from app.api.modules.events.models import EventHistory
from app.api.modules.users.models import User


class EventHistoryService(EventManager):

    async def get_event_history(
        self, event_id: UUID, current_user: User
    ) -> Sequence[EventHistory]:
        await self._get_event_or_404(event_id)
        return await self.uow.event_history.get_by_event_id(event_id)
