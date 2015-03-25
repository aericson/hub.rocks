(function () {
  var HubrocksAPI = (function () {
    var skipTrack = function () {
      console.log("SkipTrack");
      return $.ajax({
        url: API_URL + '/tracks/now-playing/skip/',
        type: 'POST'
      });
    };

    var getNowPlaying = function () {
      console.log("getNowPlaying");
      return $.ajax({
        url: API_URL + '/tracks/now-playing/',
        type: 'GET'
      });
    };

    var deleteNowPlaying = function () {
      console.log("deleteNowPlayingInner");
      return $.ajax({
        url: API_URL + '/tracks/now-playing/',
        type: 'DELETE'
      });
    };

    return {
      skipTrack: skipTrack,
      getNowPlaying: getNowPlaying,
      deleteNowPlaying: deleteNowPlaying
    };
  }());

  var popNextAndPlay = function () {

   console.log("popNextAndPlay");
    HubrocksAPI.skipTrack().done(function () {
      tryNowPlaying();
    }).fail(getFailFunction(popNextAndPlay));


    function tryNowPlaying() {
      HubrocksAPI.getNowPlaying().done(function (now_playing) {
        DZ.player.playTracks([now_playing.service_id]);
      }).fail(function (error) {
        if (error.status === 404){
          // no track to play next try popping again
          console.log('no next, will try again...');
          getFailFunction(popNextAndPlay)();
        } else {
          // something went wrong with nowPlaying try it again
          console.log(error);
          getFailFunction(tryNowPlaying)();
        }
      });
    }

    function getFailFunction(func) {
      function fail() {
        setTimeout(function () {
          func();
        }, 3000);
      }
      return fail;
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

  var deleteNowPlaying = function () {
    console.log("deleteNowPlaying");
    return HubrocksAPI.deleteNowPlaying();
  };

  swampdragon.ready(function () {
    console.log("swampdragon.ready");
    swampdragon.onChannelMessage(function (channels, message) {
      if (channels.indexOf('skip') > -1) {
        if (message.action === 'updated' && message.data._type === 'track' && message.data.now_playing === false) {
          var track = DZ.player.getCurrentTrack();
          if (track && track.id === message.data.service_id) {
            console.log('skip request');
            // This is either already paused or a bad song, pause it!
            DZ.player.pause();
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
              deleteNowPlaying();
            });
          }
      }
  });  
}());
