from swampdragon.serializers.model_serializer import ModelSerializer


class VoteSwampSerializer(ModelSerializer):
    track = 'tracks.TrackSwampSerializer'

    class Meta:
        model = 'tracks.Vote'
        publish_fields = ('track', 'token')


class TrackSwampSerializer(ModelSerializer):
    votes = VoteSwampSerializer

    class Meta:
        model = 'tracks.Track'
        publish_fields = ('service_id', 'now_playing', 'title', 'artist',
                          'votes', 'voters', 'skippers', 'left_to_skip')

    def serialize_voters(self, obj):
        return list(obj.votes.values_list('token', flat=True))

    def serialize(self, fields=None, ignore_serializers=None):
        # when a track gets updated to now_playing we want all the fields
        # of the serializer so we can replace the last now_playing.
        serialize = super(TrackSwampSerializer, self).serialize()
        if serialize:
            serialize['left_to_skip'] = (len(serialize['votes']) + 1 -
                                         len(serialize['skippers']))
        return serialize

    def serialize_skippers(self, obj):
        return [vote.skip_request_by for vote in
                obj.votes.exclude(skip_request_by='')]
