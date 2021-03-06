import moment from 'moment';
import axios from 'axios';
import Song from '../entities/Song.js';
import SongRank from '../entities/SongRank.js';
import MediaItem from '../entities/MediaItem.js';
import ChartPosition from '../entities/ChartPosition.js';

const BASE_URL = "http://localhost:8888/api";

export default class MusicAPI {

  constructor() { }

  /**
   * Handles errors in request
   */
  static handleError = (error) => {
    var message = "Unreachable server error";
    if (error.response.data.errors[0] != undefined) {
      message = error.response.data.errors[0].details;
    }

    throw new Error(message);
  };

  /**
   * Get songs in the billboard chart in a given date
   * encodeURIComponent(sparqlQuery)
   */
  static getChart = (date) => {

    let BILLBOARD_URL = "http://localhost:9006/billboard/charts/" + date + "?filter=song";
    
    return axios.get(BILLBOARD_URL)
      .then(function (res) {

        let result = res.data;
        let chart = [];

        result.forEach((chartItem) => {
          chart.push(new ChartPosition(chartItem['rank'], chartItem['song_id'], chartItem['song_name'], chartItem['display_artist']));
        });

        return chart;
      })
      .catch(function (error) {
        MusicAPI.handleError(error);
      });
  };

  static getChart1 = (date) => {

    let query = `SELECT DISTINCT ?position ?name ?id ?name1 
    WHERE {
      ?Chart a schema:MusicPlaylist;
        schema:datePublished "${date}";
        schema:track ?ListItem0.
      ?ListItem0 a schema:ListItem;
        schema:item ?Song;
        schema:position ?position.
      ?Song a schema:MusicRecording;
        schema:name ?name;
        schema:byArtist ?Artist;
        billboard:id ?id.
      ?Artist a schema:MusicGroup;
        schema:name ?name1
    }`;
    let LRA_URL = "http://localhost:9000/api/lra/query?q=" + encodeURIComponent(query);
    
    return axios.get(LRA_URL)
      .then(function (res) {

        let result = res.data.table.rows;
        let chart = [];

        result.forEach((chartItem) => {
          chart.push(new ChartPosition(chartItem['?position'], chartItem['?id'], chartItem['?name'], chartItem['?name1']));
        });

        return chart;
      })
      .catch(function (error) {
        MusicAPI.handleError(error);
      });
  };

  /**
   * Get song information given an id
   */
  static getSongInfo = (id) => {
    let requestUrl = "http://localhost:9006/billboard/music" + "/song/" + id;

    return axios.get(requestUrl)

      .then(function (response) {

        let result = response.data.song;
        let spotifyId = result.spotify_id;
        let spotifyURL = 'http://localhost:9007/spotify/v1/tracks/' + spotifyId;
        
        return axios.get(spotifyURL)
          .then(function (spotifyresponse){
            let spotify_result = spotifyresponse.data;
            let albumId = spotify_result.album.id;

            return axios.get("http://localhost:9007/spotify/v1/albums/" + albumId)
              .then(function (albumresponse){
                let album_result = albumresponse.data;
    
                let song = new Song(id, spotify_result.name, result.display_artist,
                  spotify_result.album.name, album_result.release_date, spotify_result.duration_ms,
                  spotify_result.external_urls.spotify, spotify_result.album.images[0].url);
                  return song;
              })
              .catch(function (erroralbum){
                MusicAPI.handleError(erroralbum);
              });
          })
          .catch(function (errorspotify){
            MusicAPI.handleError(errorspotify);
          });

      })
      .catch(function (error) {
        MusicAPI.handleError(error);
      });
  }

  /**
   * Get historical ranks of a song given an id
   */
  static getSongRankings = (id) => {
    let requestUrl = "http://localhost:9006/billboard/music" + "/song/" + id ;

    return axios.get(requestUrl)
      .then(function (res) {
        let result = res.data.rankings;
        console.log(result)

        let rankings = [];

        result.forEach((ranking) => {
          rankings.push(new SongRank(ranking.date, ranking.rank));
        });
        console.log(rankings)

        return rankings;
      })
      .catch(function (error) {
        MusicAPI.handleError(error);
      });
  }

  /**
   * Get related media of a song given an id.
   */
  static getSongMedia = (id) => {
    let requestUrl = BASE_URL + "/songs/" + id + "/media?n=4";

    return axios.get(requestUrl)
      .then(function (response) {
        let result = response.data.data;
        let media = [];

        result.forEach((mediaObj) => {
          media.push(new MediaItem(mediaObj.url, mediaObj.caption,
            mediaObj.thumbnail));
        });

        return media;
      })
      .catch(function (error) {
        MusicAPI.handleError(error);
      });
  }
}