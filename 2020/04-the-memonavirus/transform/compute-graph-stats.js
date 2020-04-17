const fs = require('fs')
	, {DirectedGraph} = require('graphology')
	, forceAtlas2 = require('graphology-layout-forceatlas2')
	, louvain = require('graphology-communities-louvain')
	, randomLayout = require('graphology-layout/random')

//~const  transformSteps = [importGraph, setGraphLayout, setModularity, saveGraph, saveGraphImage]
const  transformSteps = [importGraph, setGraphLayout, saveGraph]

let graphFile
	, graph = new DirectedGraph()
	, currentTransformStep = 0

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
 * Export graph to a JSON file
 *
 *****************************/
function saveGraphImage() {

	//~console.log(JSON.stringify(graph.toJSON(), null, '    '))
	
	console.log('Save graph image...')
	
	let fileName = 'infection-graph.png'
	
	canvas(graph, __dirname + '/../data/dist/' + fileName, function(err, res) {
		if (err)
			throw err
		
		console.log('...' + fileName + ' saved')
		
		next()
		
	})
}

/****************************
 *
 * compute Force-Atlas2 graph layout
 *
 *****************************/
function setGraphLayout() {
	
	console.log('Compute layout...')
	
	// initialize `x` and `y` with random values
	
	randomLayout.assign(graph)
	
	const saneSettings = forceAtlas2.inferSettings(graph)
	
	console.log('FA2 settings', JSON.stringify(saneSettings, null, ''))
	
	console.time('FA2')
	
	forceAtlas2.assign(graph, {iterations: 1000, settings: saneSettings})
	
	console.timeEnd('FA2')
	
	console.log('... layout computation done')
	
	next()
}

/****************************
 *
 * compute Louvain modularity
 *
 *****************************/
function setModularity() {
	
	console.log('Compute modularity...')
	
	console.time('modularity')
	
	louvain.assign(graph)
	
	console.timeEnd('modularity')
	
	console.log('... modularity computation done')
	
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
