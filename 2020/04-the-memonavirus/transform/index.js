const fs = require('fs')
	, {DirectedGraph} = require('graphology')

let commentFiles = []
	, infectionFiles = []
	, filePath
	, graph = new DirectedGraph()
	, transformSteps
	, currentTransformStep = 0
	, res = {}


/****************************
 *
 * Add infection track to the graph based on logFile contents
 *
 * pre-requisite: comment graph is populated
 *
 *****************************/
function addInfections(currentIndex) {
	
	if (!currentIndex)
		currentIndex = 0
	
	if (currentIndex === infectionFiles.length) {
	//~if (currentIndex === 2) {

		console.log('... All infection log files processed')
		console.log(graph.toString())


		//~console.log(JSON.stringify(graph.toJSON(), null, '    '))
		
		//~console.log('Save graph export file...')
		//~fs.writeFile(__dirname + '/../data/graphExport.json', JSON.stringify(graph.toJSON()), function(err, res) {
			//~if (err)
				//~throw err
			
			//~console.log('graphExport.json saved')
		//~})

		next()
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
					
					// record infected node
					graph.mergeNodeAttributes(data[1], {
						infection_ts: data[0]
					})
					
					// record infectious edge
					graph.mergeEdgeAttributes(data[1], data[3], {
						infection_ts: data[0] // infection timestamp
					})
					
				}
				catch(e) {
					// The infection log line for patient 0 does not have a parent, hence graph.mergeEdgeAttributes fails to run.
					
					console.log('patient 0 is: ' + data[1] + ' - infected on ' + data[0])
					
					// record infected node
					graph.mergeNodeAttributes(data[1], {
						infection_ts: data[0]
					})
				}
				
			})

			addInfections(++currentIndex)
			
		})
		
	}
	
}


/****************************
 *
 * Build the infections curve
 * 
 * In order to measure the activity (number of comments) per hour, it is necessary to iterate through the edges.
 * 
 * Should it be needed only to get the infections, iterating though the graph's nodes would be more efficient.
 * 
 *****************************/
function setCurve() {

	let figuresPerHour = {}
	
	graph.forEachEdge(function(edge, attributes) {
		
		let commentHour = getHourTs(attributes.ts)
		
		if (!figuresPerHour[commentHour])
			figuresPerHour[commentHour] = {
				comments: 0
				, infections: 0
			}
		
		figuresPerHour[commentHour].comments++
		
		if (attributes.infection_ts) {
			let infectionHour = getHourTs(attributes.infection_ts)
			
			if (!figuresPerHour[infectionHour])
				figuresPerHour[infectionHour] = {
					comments: 0
					, infections: 0
				}
				
			figuresPerHour[infectionHour].infections++
		}
		
	})
	
	// temp output
	
	let sortedTimestamps = Object.keys(figuresPerHour).map(ts => parseInt(ts)).sort((a, b) => a - b)
	
	sortedTimestamps.forEach(ts => console.log(new Date(ts), figuresPerHour[ts].comments, figuresPerHour[ts].infections))
	
	
	
}

/****************************
 *
 * Lookup data source location 
 *
 *****************************/
function listFiles() {
	
	fs.readdir(filePath, function(err, files) {
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
			next()
		}
	})
	
}


/****************************
 *
 * Build comment graph based on logFile contents
 *
 * pre-requisite: comment graph is populated
 *
 *****************************/
function setCommentGraph(currentIndex) {
	
	if (!currentIndex)
		currentIndex = 0
	
	if (currentIndex === commentFiles.length) {
	//~if (currentIndex === 1) {
		console.log('... All comment log files processed')
		console.log('Start processing infection log files...')
		next()
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
			
			setCommentGraph(++currentIndex)
			
		})

	}
	
}



/****************************
 *
 * Launch next transformation step
 *
 *****************************/
function next() {
	
	if (currentTransformStep === transformSteps.length) {
		console.log('all transformations performed')
	}
	else
		transformSteps[currentTransformStep++]()
		
}

/****************************
 *
 * Utility function to convert a timestamp string to a date, truncated to the hour.
 * 
 * @param ts {string} timestamp string as formatted in reddit logs
 *
 *****************************/
function getHourTs(ts) {
	
	// temp
	//~return ts.substr(0,13)
	
	ts = new Date(ts)
	
	return new Date(ts.setMinutes(0, 0, 0)).valueOf()
}

/****************************
 *
 * Start processing
 *
 *****************************/
fs.readFile(__dirname + '/../data/metadata', 'utf8', function(err, path) {
	if (err)
		throw err
		
	filePath = path + '/data'

	console.log(' ')	
	console.log('-----------------------------------------------------')	
	console.log('Starting data transformation...', filePath)
	
	transformSteps = [listFiles, setCommentGraph, addInfections, setCurve]
	
	// launch first step
	next()
})
