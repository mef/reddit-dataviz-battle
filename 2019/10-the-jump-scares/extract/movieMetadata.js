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

let struct = {}

// download subtitle files
function getMetadata(currentIndex) {

	// testing purpose: only extract two files
	//~if (currentIndex === 2) {
	if (currentIndex === pages.length) {
		
		saveFile('movieListExtended.json', JSON.stringify(extendedMetadata), __dirname + '/../data')
		console.log('All extended metadata downloaded')
		
		console.log('Availability of metadata values (count)')
		
		Object.keys(struct).forEach(function(key) {
			console	.log(key, struct[key])
		})
		
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

				let result = {
					title: pages[currentIndex].title
					, link: pages[currentIndex].link
				}
				
				if (metadata.last().find('a').attr('href') && metadata.last().find('a').attr('href').endsWith('.srt') )
					result.srt = metadata.last().find('a').attr('href')
				
				let sections = metadata.find('strong')
				
				sections.each(function(i) {
					if ( i < 10) {
						let key = $(this).text().trim()
							, parent = $(this).parent()
							
						parent.find('strong').remove()
						
						let val = parent.text().trim()
						
						if (isNaN(key[0])) {
							
							if ( typeof struct[key] === 'undefined')
								 struct[key] = 1
							else 
								struct[key]++
						}
							
						switch(key) {
							case 'Synopsis:':
								result['synopsis'] = val
							break
							case 'Runtime:':
								result['runtime'] = +val.replace(/ ?min.*/, '')
							break
							case 'MPAA Rating:':
								result['mpaaRating'] = val
							break
							case 'Rotten Tomatoes:':
								// some movies do not have a rating on rottentomatoes.
								let rottenTomatoesRating = val.match(rottenTomatoesRegex)
								if (rottenTomatoesRating !== null)
									result['rottenTomatoesRating'] = +rottenTomatoesRating[1]
							break
							case 'Tags:':
								result['tags'] = val.split(',')
							break
						}
						
					}
					
				})

				//~console.log(result)
				
				let slug = result.link.substring(26, result.link.length-1)
				
				extendedMetadata[slug] = result
				
				setTimeout(function() {
					getMetadata(++currentIndex)
				}, 250) // Let's be patient and gentle on the remote server
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
