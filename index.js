#!/usr/bin/env node
//Written by Jordan Rejaud
var request = require("request");
var cheerio = require("cheerio");
var prompt = require("prompt-sync")();
var open = require("open");
var Q = require("Q");

var shownQuarterWayMessage = false;
var shownHalfWayMessage = false;
var shownThreeQuarterWayMessage = false;

var getTorrentURLS = function(query, callback) {
    var URL = convertQueryToURL(query);
    //Get the main demonoid web page
    var links = [];
    request(URL, function(err, response, html) {
        if (err) {
            callback(err, null);
        }
        var $ = cheerio.load(html);
        //Check each link
        $("td.tone_1_pad").each(function(i, element) {
                var torrentLink = $(this).children("a").first().attr("href");
                //Make sure the links are torrent links
                if (torrentLink.indexOf("/files/details/")==-1) {
                    return;
                }
                if (links.length<10) {
                    links.push("http://www.demonoid.pw" + torrentLink);
                }
            });
        return callback(null, links);
        });
};

var getTorrentURLNameAndMagnetLink = function (link, callback) {
    request(link, function (err, response, html) {
        if (err) {
            return callback(err, null);
        }
        var $ = cheerio.load(html);
        //Get the name
        var torrentName = $("td.ctable_header").first().text();
        //Get the magnet link
        $("a").each(function(i, element) {
           var linkURL = $(this).attr("href");
            //If this is the magnet link
           if (linkURL&&linkURL.indexOf("magnet:")!=-1) {
               var result = {name:torrentName, link:linkURL};
               return callback(null, result);
           }
        });
    })
};

var convertQueryToURL = function(query) {
    return "http://www.demonoid.pw/files/?query=" +query;
};

var showUserResultsAndHaveThemPickOne = function(results) {
    console.log("Found:");
    for (var i=0;i<results.length;i++) {
        console.log(i+": "+results[i].name);
    }
    var userSelectedIndex = prompt("Open which torrent? ");
    if (userSelectedIndex>=0&&userSelectedIndex<results.length) {
        open(results[userSelectedIndex].link);
    } else {
        console.error("Invalid input");
    }
};


var torrentCallbacks = function (links, results, callback) {
    //Once you have all the results
    if (links.length == results.length) {
      return callback(null,results);
    }
    else if (results.length>=links.length*.25&&!shownQuarterWayMessage) {
        console.log("Search 25% completed");
        shownQuarterWayMessage = true;
    }
    else if (results.length>=links.length*.5&&!shownHalfWayMessage) {
        console.log("Search 50% completed");
        shownHalfWayMessage = true;
    }
    else if (results.length>=links.length*.75&&!shownThreeQuarterWayMessage) {
        console.log("Search 75% completed");
        shownThreeQuarterWayMessage = true;
    }
    //If not, get the next result
    var link = links[results.length];
    getTorrentURLNameAndMagnetLink(link, function (err, result) {
        if (err) {
            return callback(err,null);
        }

        //Add the result
        results.push(result);

        //Again!
        torrentCallbacks(links,results, callback);
    });
};

var getUserQueryFromCommandLine = function () {
  var userQuery = "";
    process.argv.forEach(function (val, index, array) {
        if (index==2) {
            userQuery=val;
        }
        else if (index>2) {
            userQuery=userQuery+"+"+val;
        }
    });
    return userQuery;
};

//Start here
var userQuery = getUserQueryFromCommandLine();

getTorrentURLS(userQuery, function (err, links) {
    var results = [];
    console.log("Searching for torrents");
    torrentCallbacks(links,results,function(err, results) {
        if (err) {
            return console.error(err);
        }
        showUserResultsAndHaveThemPickOne(results);
    });
});


