const cheerio = require('cheerio')
	, downloadFile = require('../../../utilities/downloadFile')
	, saveFile = require('../../../utilities/saveFile')

let hyperLinks

// crawl the page listing all hyperlink files
function getHyperlinks(sourceURL, callback) {

	console.log ('looking up srt files...')
	
	downloadFile(sourceURL, function(err, res) {
		
		if (err)
			throw err
		
		const $ = cheerio.load(res)
		
		let links = $('p a', '.entry-content')

		let result = links.filter(function() {
						return $(this).attr('href').endsWith('.srt')
					})
					.map(function() {
							//~console.log($(link).attr('href'))
							return $(this).attr('href')
					})
					.toArray()
		
		callback(null, result)

	})
}

// download subtitle files
function downloadSrt(currentIndex) {

	// testing purpose: only extract two files
	//~if (currentIndex === 2) {
	if (currentIndex === hyperLinks.length) {
		console.log('All srt files downloaded')
	}
	else {
		if (currentIndex % 10 === 0 && currentIndex !== 0 ) {
			let progressPercentage = Math.floor(currentIndex / hyperLinks.length * 100)
			process.stdout.write('. progress: ' + progressPercentage + ' %\033[0G');
		}
			
		downloadFile(hyperLinks[currentIndex], function(err, res) {
			
			if (err) {
				console.log('error downloading subtitle ' + hyperLinks[currentIndex])
				throw err
			}
			else {				
				saveFile(hyperLinks[currentIndex].substr(36), res, __dirname + '/../data/subtitles')
				setTimeout(function() {
					downloadSrt(++currentIndex)
				}, 1000) // Let's be patient and gentle on the remote server: no more than one request per second.
			}
		})
		
	}
}



getHyperlinks('https://wheresthejump.com/jump-scare-subtitle-files/', function(err, res) {
	
	if (err)
		throw err
	else {
		console.log('... found ' + res.length + ' links to srt files.')
		hyperLinks = res
		downloadSrt(0)
	}
		
})




