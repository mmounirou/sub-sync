var fileWalker = require("file"),
  path = require("path"),
	http = require("http");

var subtitleSeekerSearchUrl = "http://api.subtitleseeker.com/search/";
var subtitleSeekerTitleSubUrl = "http://api.subtitleseeker.com/get/title_subtitles/";

//http://api.subtitleseeker.com/get/title_subtitles/?api_key=API_KEY&imdb=0468569&return_type=json
var subtitleSeekerApiKey = "XXXXXXXXXXXXXXXXXXXXX";
var inputPath = "XXXXXXXXXXXXXXXXXXXXXXXXXX";

function isVideoFile(file) {
	var ext = path.extname(file);
	var videoExt = ['.avi','.mkv','.mp4'];
	return videoExt.indexOf(ext) != -1;
}

function downloadFromSubtitleSeeker(videoPath,callback){
	var baseName = path.basename(videoPath, path.extname(videoPath));
	var searchQuery = subtitleSeekerSearchUrl + "?api_key="+subtitleSeekerApiKey+"&return_type=json"+"&q="+baseName;
	http.request(searchQuery, function(response) {
		var strSearchRes = '';
		response.on('data',function(chunk){
			strSearchRes += chunk;
		});
		response.on('end',function() {
			var res = JSON.parse(strSearchRes);
			if(res.results.got_error === 0){
				var bestRSearchResesult = res.results.items[0];
				var subQuery = subtitleSeekerTitleSubUrl + "?api_key="+subtitleSeekerApiKey+"&return_type=json"+"&imdb="+bestRSearchResesult.imdb;
				
				http.request(subQuery, function(response){
					var strSubRes = '';
					response.on('data',function(chunk) {
						strSubRes += chunk;
					});

					response.on('end',function(argument) {
						console.log(strSubRes);
						var res = JSON.parse(strSubRes);
						console.log(res);

						if(res.results.got_error === 0)
						{

						}

					});
				}).end();

			}
		});
	}).end();
}

fileWalker.walk(inputPath,function(err,dirPath,dirs,files){
	if(err) return;
	files.filter(isVideoFile).forEach(function(file){
		var extName = path.extname(file);
		var subFile = path.join(path.basename(path, extName),".srt");
		path.exists(subFile, function(exist){
			if(!exist){
				downloadFromSubtitleSeeker(file,function(err,subFileName){
					if(err)
					{

					}
				});
			}
		});
	});
});