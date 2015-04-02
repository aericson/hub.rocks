(function () {
  var app = angular.module('hubrocks', [
    'LocalStorageModule', 'uuid4', 'SwampDragonServices' ,'hubrocks.const']);

  app.factory('my_uuid', ['localStorageService', 'uuid4',
    function (localStorageService, uuid4) {
      var my_uuid = localStorageService.get('my_uuid');
      if (!my_uuid) {
        my_uuid = uuid4.generate();
        localStorageService.set('my_uuid', my_uuid);
      }

      return my_uuid;
    }
  ]);

  app.factory('HubrocksAPI', ['API_URL', 'my_uuid', '$http',
    function (API_URL, my_uuid, $http) {
      $http.defaults.headers.common.Authorization = 'Token ' + my_uuid;
      var data = {
        'my_uuid': my_uuid
      };

      var insertVote = function (service_id) {
        $http.post(API_URL + '/tracks/' + service_id + '/vote/');
      };

      var deleteVote = function (service_id) {
        $http.delete(API_URL + '/tracks/' + service_id + '/vote/');
      };

      var voteSkip = function() {
        $http.post(API_URL + '/tracks/now-playing/voteskip/');
      };

      return {
        data: data,
        insertVote: insertVote,
        deleteVote: deleteVote,
        voteSkip: voteSkip,
      };
    }
  ]);

  app.controller('HubrocksCtrl', ['HubrocksAPI', '$scope', '$dragon',
    function(HubrocksAPI, $scope, $dragon) {
      $scope.data = HubrocksAPI.data;
      $scope.insertVote = HubrocksAPI.insertVote;
      $scope.deleteVote = HubrocksAPI.deleteVote;
      $scope.voteSkip = HubrocksAPI.voteSkip;
      $scope.channel = 'tracks';

      var getSingleNowPlaying = function () {
        $dragon.getSingle('track', {now_playing: true}).then(function (response) {
          $scope.data.now_playing = response.data;
        });
      };

      var getListTracks = function () {
        $dragon.getList('track').then(function (response) {
          $scope.data.tracks = response.data;
        });
      };

      $dragon.onReady(function() {
        $dragon.subscribe('track', $scope.channel).then(function(response) {
          $scope.tracksDataMapper = new DataMapper(response.data);
        });

        $dragon.subscribe('track', 'playing-now', {now_playing: true}).then(function(response) {
          $scope.nowPlayingDataMapper = new DataMapper(response.data);
        });

        getSingleNowPlaying();

        getListTracks();
      });

      $dragon.onChannelMessage(function(channels, message) {
        if (indexOf.call(channels, $scope.channel) > -1) {
          $scope.$apply(function() {
            if (message.data._type === 'vote' || message.action === 'updated' ) {
              // a vote changes the whole list (order, deletion)
              getListTracks();
            } else {
              $scope.tracksDataMapper.mapData($scope.data.tracks, message);
            }
          });
        } else if (indexOf.call(channels, 'playing-now') > -1) {
          $scope.$apply(function() {
            if (message.data._type === 'vote' && message.action === 'updated') {
              // Need to populate fields of track again
              getSingleNowPlaying();
            }
            else if($scope.data.now_playing) {
              // update now playing with the new song playing
              // can't use mapData because it's another Track.
              $scope.data.now_playing = $scope.nowPlayingDataMapper.mapUpdated($scope.data.now_playing,
                                                                               message.data);
            } else {
              $scope.data.now_playing = message.data;
            }
          });
        }
      });

      $scope.insertTrack = function () {
        if ($scope.newTrack) {
          HubrocksAPI.insertVote($scope.newTrack);
        }
      };
    }
  ]);
}());
