var http = require("http"),
	path = require('path'),
	fs = require('fs'),
	url = require('url'),
    htmlparser = require("htmlparser"),
    select  = require("soupselect").select,
    request = require("request"),
    fileWalker = require("file");

var tvsubtitles = "http://www.tvsubtitles.net/";
var searchUrl = tvsubtitles+"search.php";
var lang = "fr";
var basePath = "/Volumes/Data/Videos/Tv Shows";


function downloadZipFile(link,tvShowDir){
	var file_name = decodeURI(url.parse(link).pathname.split('/').pop());
	var file = path.join(tvShowDir,file_name);

	path.exists(file,function(exist) {
		if(!exist){
			http.get(link, function (res) {
			if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
				downloadZipFile(tvsubtitles+res.headers.location,tvShowDir);
			}
			else {
				console.log(file_name + " download start ...");
				var stream = fs.createWriteStream(file);

				var data = '';
				res.on('data', function (chunk) {
					stream.write(chunk);
				}).on('end', function () {
					stream.end();
					console.log(file_name+"download done");
				});
			}
			});
		}
	});
}

function downloadSeasonSubs(link,tvShowDir) {
	var body = '';
	http.request(link,function(response){
		response.on('data',function(chunk){
			body+=chunk;
		});

		response.on('end',function(chunk){
			var handler = new htmlparser.DefaultHandler(function(err,dom){
				if (err) return;
				select(dom,'table td a')
				.filter(function(show){
					var test1 = show.attribs.href.search("[1-9]-"+lang+".html") != -1;
					var test2 = show.attribs.href.search("subtitle") != -1	;
					return test1 && test2;
				})
				.forEach(function(show,index){
					if(index === 0){
						var downloadLink = show.attribs.href.replace("subtitle","download");
						downloadZipFile(tvsubtitles+downloadLink,tvShowDir);
					}

				});
			});

			var parser = new htmlparser.Parser(handler);
			parser.parseComplete(body);
		});
	}).end();
}


function downloadTvShowSubs(link,tvShowDir){
	var body = '';
	http.request(link,function(response){
		response.on('data',function(chunk){
			body+=chunk;
		});

		response.on('end',function(chunk){
			var handler = new htmlparser.DefaultHandler(function(err,dom){
				if (err) return;
			
				select(dom,'.left_articles a')
				.filter(function(show) {
					if(show.children[0].children){
						return show.children[0].children[0].raw.search("Season")!= -1;
					}
					return false;
				})
				.forEach(function(show){
					downloadSeasonSubs(tvsubtitles + show.attribs.href,tvShowDir);
				});
			});

			downloadSeasonSubs(link,tvShowDir);
			var parser = new htmlparser.Parser(handler);
			parser.parseComplete(body);
		});
	}).end();
}

function findTvShowSub (tvShowName,tvShowDir) {
	var query = searchUrl+"?q="+tvShowName;
	http.request(query, function (response){
		var strRes = '';
		response.on('data',function(chunk) {
			strRes+=chunk;
		});

		response.on('end',function() {
			var handler = new htmlparser.DefaultHandler(function(err,dom){
				if (err) return;
				var result = select(dom,'.left_articles li a')
				.filter(function(show) {
					return show.children[0].raw.toUpperCase().search(tvShowName.toUpperCase()) != -1;
				});

				if(result.length === 0){
					console.log("Not tv show find for " + tvShowName);
				}else{
					result.forEach(function(show){
						downloadTvShowSubs(tvsubtitles+show.attribs.href,tvShowDir);
					});
				}
			});

			var parser = new htmlparser.Parser(handler);
			parser.parseComplete(strRes);
		});
	}).end();
}


console.log("retreive all "+lang+" subtitles zip");
fs.readdir(basePath,function(err,files){
	if(err) return;
	files.forEach(function (file) {
		var rawTvshowName = file.replace(/ *\([^)]*\) */g,'');
		console.log("trigger download subs for "+ rawTvshowName +" ...");
		findTvShowSub(rawTvshowName,path.join(basePath,file));
	});
});

