
from model_mommy import mommy
from model_mommy.recipe import Recipe, seq
from rest_framework.test import APITestCase

from tracks.models import Track


track_recipe = Recipe(
    Track, service_id=seq('1'),
)


class TrackTestCase(APITestCase):

    def setUp(self):
        self.track = track_recipe.make(now_playing=True)
        self.establishment = self.track.establishment
        self.track_not_playing = track_recipe.make(
            establishment=self.track.establishment)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + 'foo')
        mommy.make('Vote', track=self.track_not_playing)
        # other establishment
        self.track_other_establishment = track_recipe.make()