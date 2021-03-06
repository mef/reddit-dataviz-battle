const cheerio = require('cheerio')
	, downloadFile = require('../../../utilities/downloadFile')
	, saveFile = require('../../../utilities/saveFile')


function getMovieList(sourceURL, callback) {
	downloadFile(sourceURL, function(err, res) {
		
		if (err)
			throw err
		
		const $ = cheerio.load(res)
		
		let movies = $('tr', '#tablepress-1 tbody')

		let result = movies.map(function() {

			// get the set of td
			let row = $(this).children()
				, moviePageLink = row.first().find('a').attr('href')
			
			return {
				title: row.first().text()
				, director: row.eq(1).text()
				, year: +row.eq(2).text()
				, jumpCount: +row.eq(3).text()
				, jumpScareRating: +row.eq(4).text()
				, netflixUS: row.eq(5).text() === 'Yes'? true : false
				, imdbRating: +row.eq(6).text()
				, slug: moviePageLink.substring(26, moviePageLink.length-1)
			}
			
		}).toArray()

		callback(null, result)

	})
}


getMovieList('https://wheresthejump.com/full-movie-list/', function(err, res) {
	
	if (err)
		throw err
	else {
		
		let movieList = {
			data: res
			, columns: ['title', 'director', 'year', 'jumpCount', 'jumpScareRating', 'netflixUS', 'imdbRating' ]
		}
		
		saveFile('movieList.json', JSON.stringify(movieList), __dirname + '/../data')
	}
})




