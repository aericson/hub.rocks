(function () {
  var app = angular.module('hubrocks', [
    'LocalStorageModule', 'uuid4', 'pusher-angular', 'SwampDragonServices' ,'hubrocks.const']);

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

  app.factory('HubrocksAPI', ['API_URL', 'PUSHER_API_KEY', 'my_uuid', '$http', '$pusher',
    function (API_URL, PUSHER_API_KEY, my_uuid, $http, $pusher) {
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


      var get_voters = function(votes) {
        var voters = [];
        for (var i=0; i< votes.length; i++) {
          voters.push(votes[i].token);
        }
        return voters;
      };

      $dragon.onReady(function() {
        $dragon.subscribe('track', $scope.channel, {}).then(function(response) {
            $scope.dataMapper = new DataMapper(response.data);
        });

        $dragon.getSingle('track', {now_playing: true}).then(function(response) {
            $scope.data.now_playing = response.data;
            if ($scope.data.now_playing)
              $scope.data.now_playing.voters = get_voters($scope.data.now_playing.votes);
        });

        $dragon.getList('track', {}).then(function(response) {
            $scope.data.tracks = response.data;
            for (var i=0; i < $scope.data.tracks.length; i++)
              $scope.data.tracks[i].voters = get_voters($scope.data.tracks[i].votes);
        });
      });

      $dragon.onChannelMessage(function(channels, message) {
          if (indexOf.call(channels, $scope.channel) > -1) {
              $scope.$apply(function() {
                  debugger;
                  $scope.dataMapper.mapData($scope.data.tracks, message);
                  // get now playing
                  $scope.data.now_playing = null;
                  for (var i=0; i < $scope.data.tracks.length; i++) {
                    $scope.data.tracks[i].voters = get_voters($scope.data.tracks[i].votes);
                    if ($scope.data.tracks[i].now_playing) {
                      $scope.data.now_playing = $scope.data.tracks[i];
                    }
                  }
              });
          }
      });

      $scope.itemDone = function(item) {
            debuggr;
          item.done = true != item.done;
          $dragon.update('track', item);
      };

      $scope.insertTrack = function () {
        if ($scope.newTrack) {
          HubrocksAPI.insertVote($scope.newTrack);
        }
      };
    }
  ]);
}());
