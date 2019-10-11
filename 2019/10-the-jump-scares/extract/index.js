const cheerio = require('cheerio')
	, downloadFile = require('./downloadFile')
	, saveFile = require('./saveFile')


let hyperLinks = []

function getHyperlinks(sourceURL, callback) {
	downloadFile(sourceURL, function(err, res) {
		
		if (err)
			throw err
		
		const $ = cheerio.load(res)
		
		//~let links = $('a', '#primary')
		let links = $('p a', '.entry-content')
		


		let out = links.filter(function() {
						return $(this).attr('href').endsWith('.srt')
					})
					.map(function() {
							//~console.log($(link).attr('href'))
							return $(this).attr('href')
					})
					.toArray()
		
		callback(null, out)

	})
}


function downloadSrt(currentIndex) {

	//~if (currentIndex === links.length) {
	if (currentIndex === 2) {
		console.log('All srt files downloaded')
	}
	else {
		downloadFile(hyperLinks[currentIndex], function(err, res) {
			
			if (err) {
				console.log('error downloading subtitle ' + hyperLinks[currentIndex])
				throw err
			}
			else {				
				saveFile(hyperLinks[currentIndex].substr(36), res, '../data')
				setTimeout(function() {
					downloadSrt(++currentIndex)
				}, 500)
			}
		})
		
	}
}



getHyperlinks('https://wheresthejump.com/jump-scare-subtitle-files/', function(err, res) {
	
		if (err)
			throw err
		else {
			hyperLinks = res
			downloadSrt(0)
		}
})




