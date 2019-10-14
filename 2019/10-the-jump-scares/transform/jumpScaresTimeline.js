const fs = require('fs')
	, saveFile = require('../../../utilities/saveFile')
	
const sourceDir = __dirname + '/../data/subtitles/'
	, searchRegex = /-->\s([0-9:,]*)\r?\n.*(minor|major)/g


let files = []
	, timeline = {}

function getFilesList(callback) {

	fs.readdir(__dirname + '/../data/subtitles', function(err, res) {
		if (err) {
			console.log('error reading subtitles directory')
			throw err
		}
		else {
			res = res.filter(function(fileName) {
				return fileName.endsWith('.srt')
			})
			callback(null, res)
		}
	})

}

// process subtitle file
function processSrt(currentIndex) {

	// testing purpose: only process two files
	//~if (currentIndex === 10) {
	if (currentIndex === files.length) {
		console.log('All srt files processed')
		//~console.log(timeline)
		saveFile('jumpScareTimeline.json', JSON.stringify(timeline), __dirname + '/../data')
	}
	else {
		if (currentIndex % 20 === 0 && currentIndex !== 0 ) {
			let progressPercentage = Math.floor(currentIndex / files.length * 100)
			console.log('. progress: ' + progressPercentage + ' %')
		}
		
		let movieTimeline = []
		
		fs.readFile(sourceDir + files[currentIndex], 'utf8', function(err, res) {
			
			if (err) {
				console.log('error reading subtitles file ' + files[currentIndex])
				throw err
			}
			else {
				// extract timestamp and minor / minor information from the subtitles file
				let dataPoints = Array.from(res.matchAll(searchRegex))

				dataPoints.forEach(function(jumpScare) {
					
					// timestamp is reformatted for usability in javascript
					movieTimeline.push({
						ts: jumpScare[1].replace(',', '.')
						, type: jumpScare[2]
					})
				})
				
				processSrt(++currentIndex)
			}
		})
		
		timeline[files[currentIndex]] = movieTimeline
		
	}
}

getFilesList(function(err, res) {
	
	if (err)
		throw err
	else {
		console.log('... found ' + res.length + ' links to srt files.')
		files  = res
		processSrt(0)
	}
})

