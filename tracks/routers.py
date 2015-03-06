
from django.db.models import Q

from swampdragon import route_handler
from swampdragon.route_handler import ModelRouter

from tracks.models import Track
from tracks.swamp_serializers import TrackSwampSerializer, VoteSwampSerializer


class TrackRouter(ModelRouter):
    route_name = 'track'
    serializer_class = TrackSwampSerializer
    model = Track
    include_related = [VoteSwampSerializer]

    def get_object(self, **kwargs):
        allowed = ['now_playing']
        for k in kwargs.keys():
            if k not in allowed:
                kwargs.pop(k)
        try:
            return self.model.objects.get(**kwargs)
        except self.model.DoesNotExist:
            return None

    def get_query_set(self, **kwargs):
        return self.model.ordered_qs()


route_handler.register(TrackRouter)
