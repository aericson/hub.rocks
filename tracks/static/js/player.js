(function () {
  var HubrocksAPI = (function () {
    var getNext = function () {
      console.log("getNext");
      return $.ajax({
        url: API_URL + '/tracks/next/',
        type: 'GET'
      });
    };

    var getNowPlaying = function () {
      console.log("getNowPlaying");
      return $.ajax({
        url: API_URL + '/tracks/now-playing/',
        type: 'GET'
      });
    };

    var setNowPlaying = function (service_id) {
      console.log("setNowPlaying");
      return $.ajax({
        url: API_URL + '/tracks/now-playing/',
        type: 'PUT',
        data: {
          'service_id': service_id,
          'now_playing': true
        }
      });
    };

    var deleteNowPlaying = function (service_id) {
      console.log("deleteNowPlaying");
      return $.ajax({
        url: API_URL + '/tracks/now-playing/',
        type: 'DELETE'
      });
    };

    return {
      getNext: getNext,
      getNowPlaying: getNowPlaying,
      setNowPlaying: setNowPlaying,
      deleteNowPlaying: deleteNowPlaying
    };
  }());

  var popNextAndPlay = function () {
    console.log("popNextAndPlay");
    HubrocksAPI.getNext().done(function (json) {
      if (json.next) {
        HubrocksAPI.setNowPlaying(json.next.service_id);

        DZ.player.playTracks([json.next.service_id]);
      } else {
        console.log('no next, will try again...');
        fail();
      }
    }).fail(fail);

    function fail() {
      setTimeout(function () {
        popNextAndPlay();
      }, 3000);
    }
  };

  var tryToContinuePlaying = function () {
    console.log("tryToContinuePlaying");
    HubrocksAPI.getNowPlaying().done(function (now_playing) {
      DZ.player.playTracks([now_playing.service_id]);
    }).fail(function () {
      popNextAndPlay();
    });
  };

  var deleteNowPlaying = function (track_id) {
    console.log("deleteNowPlaying");
    return HubrocksAPI.deleteNowPlaying(track_id);
  };

  swampdragon.ready(function () {
    console.log("swampdragon.ready");
    swampdragon.onChannelMessage(function (channels, message) {
      if (channels.indexOf('skip') > -1) {
        if (message.action === 'updated' && message.data._type === 'track' && message.data.now_playing === false) {
          var track = DZ.player.getCurrentTrack();
          if (track.id === message.data.service_id) {
            popNextAndPlay();
          }
        }
      }
    });
  });

  swampdragon.open(function () {
    swampdragon.subscribe('track', 'skip');
    console.log("subscribing");
  });


  DZ.init({
      appId  : '8',
      channelUrl : 'http://developers.deezer.com/examples/channel.php',
      player : {
          container : 'player',
          cover : true,
          playlist : true,
          width : 650,
          height : 300,
          onload : function () {
            console.log("dzinit");
            tryToContinuePlaying();

            DZ.Event.subscribe('track_end', function (currentIndex) {
              var track = DZ.player.getCurrentTrack();
              
              deleteNowPlaying(track.id);
            });
          }
      }
  });  
}());
