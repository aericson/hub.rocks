
from django.shortcuts import get_object_or_404

from rest_framework import generics, mixins, status
from rest_framework.response import Response
from requests.exceptions import RequestException

from tracks.serializers import (
    TrackSerializer, VoteSerializer,
    TrackUpdateSerializer)
from tracks.models import Track, Vote
from tracks.mixins import GetTokenMixin, SkipTrackMixin


class VoteSkipNowPlaying(GetTokenMixin, SkipTrackMixin,
                         generics.GenericAPIView):

    def post(self, request, *args, **kwargs):
        token = self.get_token()
        track = get_object_or_404(Track, now_playing=True)

        if token and not track.votes.filter(skip_request_by=token).exists():
            # cancel a vote
            vote = Vote.objects.filter(track=track, skip_request_by='').first()
            if vote:
                vote.skip_request_by = token
                vote.save()
            else:
                # no vote left to cancel, that must be a bad song, skip it!
                self.stop_track(track)
            return Response(status=status.HTTP_200_OK)
        return Response(status=status.HTTP_403_FORBIDDEN)


class TrackListAPIView(generics.ListAPIView):
    serializer_class = TrackSerializer

    def get_queryset(self):
        return Track.ordered_qs()

    def get(self, request, *args, **kwargs):
        response = super(TrackListAPIView,
            self).get(request, *args, **kwargs)

        response_data = response.data
        response.data = {}
        response.data['tracks'] = response_data
        try:
            response.data['now_playing'] = TrackSerializer(
                Track.objects.get(now_playing=True)).data
        except Track.DoesNotExist:
            response.data['now_playing'] = None

        return response


class VoteAPIView(GetTokenMixin, mixins.DestroyModelMixin,
                  generics.CreateAPIView):
    serializer_class = VoteSerializer

    def get_serializer(self, *args, **kwargs):
        kwargs['data'] = {}
        kwargs['data']['token'] = self.get_token()
        # when it gets here track was already created if needed
        kwargs['data']['track'] = Track.objects.get(
                                    service_id=self.kwargs['service_id']).pk

        return super(VoteAPIView,
            self).get_serializer(*args, **kwargs)

    def create(self, request, *args, **kwargs):
        service_id = self.kwargs['service_id']

        if not Track.objects.filter(service_id=service_id).exists():
            try:
                Track.fetch_and_save_track(service_id)
            except RequestException:
                return Response(
                    status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except ValueError:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST)

        return super(VoteAPIView,
            self).create(request, *args, **kwargs)

    def get_object(self, *args, **kwargs):
        return get_object_or_404(Vote,
            track__service_id=self.kwargs['service_id'],
            token=self.get_token())

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class NowPlayingAPIView(SkipTrackMixin, generics.RetrieveDestroyAPIView):
    serializer_class = TrackSerializer

    def get_object(self, *args, **kwargs):
        return get_object_or_404(Track, now_playing=True)

    def perform_destroy(self, instance):
        self.stop_track(instance)


class SkipTrackAPIView(SkipTrackMixin,
                       generics.RetrieveAPIView):
    serializer_class = TrackSerializer

    def post(self, request, *args, **kwargs):
        self.skip()
        return Response(status=status.HTTP_200_OK)
