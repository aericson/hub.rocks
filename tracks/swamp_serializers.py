from swampdragon.serializers.model_serializer import ModelSerializer


class VoteSwampSerializer(ModelSerializer):
    track = 'tracks.TrackSwampSerializer'

    class Meta:
        model = 'tracks.Vote'
        fields = ('track', 'token',)
        publish_fields = ('track', 'token')


class TrackSwampSerializer(ModelSerializer):
    votes = VoteSwampSerializer

    class Meta:
        model = 'tracks.Track'
        publish_fields = ('service_id', 'now_playing', 'title', 'artist',
                          'votes', 'voters')
        update_fields = ('now_playing', )

    def serialize_voters(self, obj):
        return list(obj.votes.values_list('token', flat=True))

    def serialize(self, fields=None, ignore_serializers=None):
        # when a track gets updated to now_playing we want all the fields
        # of the serializer so we can replace the last now_playing.
        return super(TrackSwampSerializer, self).serialize()
