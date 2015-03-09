
from random import randint

from django.shortcuts import get_object_or_404

from rest_framework import generics, mixins, status
from rest_framework.response import Response
from requests.exceptions import RequestException

from tracks.serializers import (
    TrackSerializer, VoteSerializer,
    TrackUpdateSerializer)
from tracks.models import Track, Vote
from tracks.mixins import GetTokenMixin, StopPlayingMixin


class SkipNowPlaying(StopPlayingMixin, GetTokenMixin,
                     generics.GenericAPIView):

    def post(self, request, *args, **kwargs):
        track = get_object_or_404(Track, now_playing=True)
        token = self.get_token()

        if token and not Track.objects.filter(id=track.id,
                                              votes__skip_request_by=token,
                                              now_playing=True
                                              ).exists():
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


class NowPlayingAPIView(StopPlayingMixin,
                        generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TrackUpdateSerializer

    def get_object(self, *args, **kwargs):
        if self.request.method == 'PUT':
            if ('service_id' in self.request.DATA and
                not Track.objects.filter(now_playing=True).exists()):
                return get_object_or_404(Track,
                    service_id=self.request.DATA['service_id'])
            else:
                return Response(
                    status=status.HTTP_400_BAD_REQUEST)
        else:
            return get_object_or_404(Track, now_playing=True)

    def perform_destroy(self, instance):
        self.stop_track(instance)


class NextTrackAPIView(generics.RetrieveAPIView):

    def retrieve(self, request, *args, **kwargs):
        track = Track.ordered_qs().first()

        if not track:
            # select a track at random
            last = Track.objects.filter(now_playing=False).count() - 1
            if last >= 0:
                index = randint(0, last)
                try:
                    track = Track.objects.filter(now_playing=False)[index]
                except IndexError:
                    # on the very unlikely event of selecting an index that
                    # disappeared between the two queries we try selecting the
                    # first one.
                    track = Track.objects.filter(now_playing=False).first()

        if track:
            data = TrackSerializer(track).data
        else:
            data = None

        return Response({'next': data})
