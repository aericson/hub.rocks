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

      return {
        data: data,
        insertVote: insertVote,
        deleteVote: deleteVote,
      };
    }
  ]);

  app.controller('HubrocksCtrl', ['HubrocksAPI', '$scope', '$dragon',
    function(HubrocksAPI, $scope, $dragon) {
      $scope.data = HubrocksAPI.data;
      $scope.insertVote = HubrocksAPI.insertVote;
      $scope.deleteVote = HubrocksAPI.deleteVote;
      $scope.channel = 'tracks';


      var get_tracks = function (response) {
        $scope.data.tracks = response.data;
      };

      var get_now_playing = function (response) {
        $scope.data.now_playing = response.data;
      };

      $dragon.onReady(function() {
        $dragon.subscribe('track', $scope.channel).then(function(response) {
          $scope.tracksDataMapper = new DataMapper(response.data);
        });

        $dragon.getSingle('track', {now_playing: true}).then(get_now_playing);

        $dragon.getList('track').then(get_tracks);
      });

      $dragon.onChannelMessage(function(channels, message) {
        if (indexOf.call(channels, $scope.channel) > -1) {
          $scope.$apply(function() {
            if (message.data._type === 'track' && message.action === 'updated' &&
                message.data.now_playing) {
              // set now playing
              $dragon.getSingle('track', {now_playing: true}).then(get_now_playing);
              // update list
              $dragon.getList('track').then(get_tracks);
            }
            else if (message.data._type === 'vote' || message.action === 'updated') {
              $dragon.getList('track').then(get_tracks);
            } else {
              $scope.tracksDataMapper.mapData($scope.data.tracks, message);
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
