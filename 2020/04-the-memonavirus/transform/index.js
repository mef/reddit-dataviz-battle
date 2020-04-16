const fs = require('fs')
	, {DirectedGraph} = require('graphology')

let commentFiles = []
	, infectionFiles = []
	, filePath
	, graph = new DirectedGraph()

function listFiles(path, callback) {
	
	fs.readdir(path, function(err, files) {
		if (err)
			throw err
		else {
			//~console.log('files', files)
			
			files.forEach(function(file) {
				
				switch(true) {
					case /comment/.test(file):
						commentFiles.push(file)
						break
					case /infection/.test(file):
						infectionFiles.push(file)
						break
				}
				
			})
			console.log(commentFiles.length + ' comment files')
			console.log(infectionFiles.length + ' infection files')

		console.log('Start processing comment log files...')			
			callback()
		}
	})
	
}

function processComments(currentIndex, callback) {
	
	if (currentIndex === commentFiles.length) {
	//~if (currentIndex === 1) {
		console.log('... All comment log files processed')
		console.log('Start processing infection log files...')
		callback(0)
	}
	else  {

		fs.readFile(filePath + '/' + commentFiles[currentIndex], 'utf8', function(err, content) {
			if (err)
				throw err
				
			let logFile = content.split('\n')
			
			// remove the last empty line of the file
			logFile.pop()
			
			logFile.forEach( function(logLine) {
			
				let data = logLine.split('\t')
				
				graph.mergeNode(data[1])
				
				graph.mergeNode(data[3])
				
				graph.mergeEdge(data[1], data[3], {
					ts: data[0]
					, type: data[5] // C = commented on comment, S = commented on submission
				})
				
			})
			
			processComments(++currentIndex, callback)
			
		})

	}
	
}


function processInfections(currentIndex) {
	
	if (currentIndex === infectionFiles.length) {
	//~if (currentIndex === 2) {

		console.log('... All infection log files processed')
		console.log('Save graph export file...')

		console.log(graph.toString())
		//~console.log(JSON.stringify(graph.toJSON(), null, '    '))
		
		fs.writeFile(__dirname + '/../data/graphExport.json', JSON.stringify(graph.toJSON()), function(err, res) {
			if (err)
				throw err
			
			console.log('graphExport.json saved')
		})
	}
	else  {

		fs.readFile(filePath + '/' + infectionFiles[currentIndex], 'utf8', function(err, content) {
			if (err)
				throw err
				
			let logFile = content.split('\n')
			
			// remove the last empty line of the file
			logFile.pop()
			
			logFile.forEach( function(logLine) {
				
				let data = logLine.split('\t')
				
				try {
					graph.mergeEdgeAttributes(data[1], data[3], {
						i: true
						, i_ts: data[0] // infection timestamp
					})
				}
				catch(e) {
					graph.mergeEdge(data[1], data[3], {
						ts: data[0]
						, type: data[5] // C = commented on comment, S = commented on submission
						, i: true
						, i_ts: data[0] // infection timestamp
					})
				}
				
			})

			processInfections(++currentIndex)
			
		})
		
	}
	
}

function generateGraph() {
	
	processComments(0, processInfections)
	
}

fs.readFile(__dirname + '/../data/metadata', 'utf8', function(err, path) {
	if (err)
		throw err
		
	filePath = path + '/data'

	console.log(' ')	
	console.log('-----------------------------------------------------')	
	console.log('Starting data transformation...', filePath)
	
	listFiles(filePath, generateGraph)
})
