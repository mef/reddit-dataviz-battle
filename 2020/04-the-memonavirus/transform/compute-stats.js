const fs = require('fs')
	, {DirectedGraph} = require('graphology')

const  transformSteps = [importGraph, setCurve, saveCurve]

let graphFile
	, graph = new DirectedGraph()
	, currentTransformStep = 0
	, infectionCurve = []


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
 * import graph export file in Graphology
 *
 *****************************/
function importGraph() {
	
	console.log('Start graph import...')
	
	console.time('import')
	
	graph.import(graphFile)
	
	console.timeEnd('import')
	
	console.log('... import done')
	
	next()
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
 * Export infection curve to a JSON file
 *
 *****************************/
function saveCurve() {

	//~console.log(JSON.stringify(graph.toJSON(), null, '    '))
	
	console.log('Save infection curve file...')
	
	let fileName = 'infection-curve.json'
	
	fs.writeFile(__dirname + '/../data/dist/' + fileName, JSON.stringify(infectionCurve), function(err, res) {
		if (err)
			throw err
		
		console.log('...' + fileName + ' saved')
		
		next()
	})
		
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

	console.log(' ')
	console.log('-----------------------------------------------------')	
	console.log('Compute infection curve...')

	let figuresPerHour = {}
	
	// compute the number of comments and infections per hour
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
	
	// Store the results inside infectionCurve array.
	let sortedTimestamps = Object.keys(figuresPerHour).map(ts => parseInt(ts)).sort((a, b) => a - b)
	
	sortedTimestamps.forEach(function(ts) {
		//~console.log(new Date(ts), figuresPerHour[ts].comments, figuresPerHour[ts].infections)
		
		infectionCurve.push({
			ts: ts
			, commentCount: figuresPerHour[ts].comments
			, infectionCount: figuresPerHour[ts].infections
		})
	})
	
	console.log('... done')
	
	next()
	
	
	
}


/****************************
 *
 * Start processing
 *
 *****************************/
fs.readFile(__dirname + '/../data/staging/infection-graph.json', 'utf8', function(err, file) {
	if (err)
		throw err
		
	graphFile = JSON.parse(file)

	console.log(' ')
	console.log('-----------------------------------------------------')
	
	// launch first step
	next()
})
