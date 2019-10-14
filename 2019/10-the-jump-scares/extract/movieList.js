const cheerio = require('cheerio')
console.log(__dirname)
	 downloadFile = require('../../../utilities/downloadFile')
	, saveFile = require('../../../utilities/saveFile')


function getMovieList(sourceURL, callback) {
	downloadFile(sourceURL, function(err, res) {
		
		if (err)
			throw err
		
		const $ = cheerio.load(res)
		
		let movies = $('tr', '#tablepress-1 tbody')

		let out = movies.map(function() {

			// get the set of td
			let row = $(this).children()

			return {
				title: row.first().text()
				, director: row.eq(1).text()
				, year: +row.eq(2).text()
				, jumpCount: +row.eq(3).text()
				, jumpScareRating: +row.eq(4).text()
				, netflixUS: row.eq(5).text() === 'Yes'? true : false
				, imdbRating: +row.eq(6).text()
			}
				
		}).toArray()

		callback(null, out)

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




