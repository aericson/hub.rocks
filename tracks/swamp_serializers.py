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
                          'votes')
        update_fields = ('now_playing', )
