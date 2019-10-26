const cheerio = require('cheerio')
	, downloadFile = require('../../../utilities/downloadFile')
	, saveFile = require('../../../utilities/saveFile')

let rottenTomatoesRegex = /([0-9]*)%/
	, pages
	, extendedMetadata = {}

function getMoviePages(sourceURL, callback) {
	
	console.log ('looking up movie pages...')

	downloadFile(sourceURL, function(err, res) {
		
		if (err)
			throw err
		
		const $ = cheerio.load(res)
		
		let movies = $('a', '#tablepress-1 tbody')

		let result = movies.map(function() {

			let node = $(this)

			return {
				title: node.text()
				, link: node.attr('href')
			}
				
		}).toArray()

		callback(null, result)

	})
}


// download subtitle files
function getMetadata(currentIndex) {

	// testing purpose: only extract two files
	//~if (currentIndex === 2) {
	if (currentIndex === pages.length) {
		
		saveFile('movieListExtended.json', JSON.stringify(extendedMetadata), __dirname + '/../data')
		console.log('All extended metadata downloaded')
		
	}
	else {
		
		if (currentIndex % 10 === 0 && currentIndex !== 0 ) {
			let progressPercentage = Math.floor(currentIndex / pages.length * 100)
			process.stdout.write('. progress: ' + progressPercentage + ' %\033[0G');
		}
			
		downloadFile(pages[currentIndex].link, function(err, res) {
			
			if (err) {
				console.log('error retrieving page ' + pages[currentIndex])
				throw err
			}
			else {				
				
				const $ = cheerio.load(res)
				
				let metadata = $('p', '#content')

				// remove different markup in movie page "the boy" (2015)
				//~if (metadata.first().text().startsWith('Note:') {
					//~//TODO: remove first child
				//~}
				
				// remove headings
				metadata.find('strong').remove()

				// some movies do not have a rating on rottentomatoes. We store an empty string for them.
				let rottenTomatoesRating = metadata.eq(4).text().match(rottenTomatoesRegex)
				
				let result = {
					title: pages[currentIndex].title
					, link: pages[currentIndex].link
					, synopsis: metadata.first().text()
					, runtime: +metadata.eq(2).text().replace(/ ?min.*/, '')
					, mpaaRating: metadata.eq(3).text()
					, rottenTomatoesRating: rottenTomatoesRating !== null ? rottenTomatoesRating[1] : ''
					, tags: metadata.eq(6).text().split(',')
					, srt: metadata.last().find('a').attr('href')
				}
				//~console.log(result)


				
				let slug = result.link.substring(26, result.link.length-1)
				
				extendedMetadata[slug] = result
				
				setTimeout(function() {
					getMetadata(++currentIndex)
				}, 750) // Let's be patient and gentle on the remote server
			}
			
		})
		
	}
}


getMoviePages('https://wheresthejump.com/full-movie-list/', function(err, res) {
	
	if (err)
		throw err
	else {
		console.log('... found ' + res.length + ' movie pages.')
		
		pages = res
		
		getMetadata(0)
		
		
	}
})
