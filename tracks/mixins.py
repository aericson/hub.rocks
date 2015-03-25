from random import randint

from django.db import transaction

from tracks.models import Track


class GetTokenMixin(object):
    def get_token(self):
        auth_header = self.request.META.get('HTTP_AUTHORIZATION', '')
        splitted_auth_header = auth_header.split(' ')

        if len(splitted_auth_header):
            __, token = splitted_auth_header
        else:
            token = None
        return token


class SkipTrackMixin(object):

    def stop_track(self, track):
        track.votes.all().delete()
        track.now_playing = False
        track.save()

    def skip(self):
        try:
            current = Track.objects.get(now_playing=True)
            self.stop_track(current)
        except Track.DoesNotExist:
            pass

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
            with transaction.atomic():
                # make sure we don't have a racing condition and end up with
                # two tracks now_playing
                track.now_playing = True
                track.save()
                assert Track.objects.filter(now_playing=True).count() == 1
