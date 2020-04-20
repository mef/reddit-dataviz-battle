const fs = require('fs')
	, {DirectedGraph} = require('graphology')
	
const  transformSteps = [listFiles, setCommentGraph, addInfections, saveGraph, saveinfectionSubgraph]

let commentFiles = []
	, infectionFiles = []
	, filePath
	, graph = new DirectedGraph() // comments and infections
	, infectionSubgraph = new DirectedGraph() // infections only
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
		console.log(infectionSubgraph.toString())

		next()
	}
	else  {

		fs.readFile(filePath + '/' + infectionFiles[currentIndex], 'utf8', function(err, content) {
			if (err)
				throw err
				
			let logFile = content.split('\n')
			
			// remove the last empty line of the file
			//~logFile.pop()
			
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
				try {
					
					// record infected node
					infectionSubgraph.mergeNode(data[1], {
						infection_ts: data[0]
					})
					
					infectionSubgraph.mergeNode(data[3])
					
					// record infectious edge
					infectionSubgraph.mergeEdge(data[1], data[3], {
						infection_ts: data[0] // infection timestamp
					})
					
				}
				catch(e) {
					// The infection log line for patient 0 does not have a parent, hence graph.mergeEdgeAttributes fails to run.
					
					console.log(e)
					
					console.log('patient 0 is: ' + data[1] + ' - infected on ' + data[0])
					
					// record infected node
					infectionSubgraph.mergeNode(data[1], {
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
			//~logFile.pop()
			
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
 * Export Infection subgraph to a JSON file
 *
 *****************************/
function saveinfectionSubgraph() {

	//~console.log(JSON.stringify(graph.toJSON(), null, '    '))
	
	console.log('Save infection graph export file...')
	
	let fileName = 'infection-subgraph.json'
	
	fs.writeFile(__dirname + '/../data/staging/' + fileName, JSON.stringify(infectionSubgraph.export()), function(err, res) {
		if (err)
			throw err
		
		console.log('...' + fileName + ' saved')
		next()
		
	})

}

/****************************
 *
 * Export graph to a JSON file
 *
 *****************************/
function saveGraph() {

	//~console.log(JSON.stringify(graph.toJSON(), null, '    '))
	
	console.log('Save graph export file...')
	
	let fileName = 'infection-graph.json'
	
	fs.writeFile(__dirname + '/../data/staging/' + fileName, JSON.stringify(graph.export()), function(err, res) {
		if (err)
			throw err
		
		console.log('...' + fileName + ' saved')
		next()
		
	})

}

/****************************
 *
 * Start processing
 *
 *****************************/
fs.readFile(__dirname + '/../data/metadata/datasourcePath', 'utf8', function(err, path) {
	if (err)
		throw err
		
	filePath = path + '/data'

	console.log(' ')	
	console.log('-----------------------------------------------------')	
	console.log('Starting data transformation...', filePath)
	
	// launch first step
	next()
})
