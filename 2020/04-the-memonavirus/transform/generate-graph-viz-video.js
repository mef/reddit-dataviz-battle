const exec = require('child_process').exec
	, fs = require('fs')
	, d3 = require('d3')
	, D3Node = require('d3-node')
	, {DirectedGraph} = require('graphology')
	, forceAtlas2 = require('graphology-layout-forceatlas2')
	
const  transformSteps = [listFiles, updateGraph]

let files // array of log files from data source
	, repoPath // file path for data source repository
	, graph = new DirectedGraph() // comments and infections Graphology instance
	, d3Graph // graph data structure for consumption by d3
	, currentTransformStep = 0
	, fileIndex = 0
	, outFileIndex = 0
	, edgeIndexMap = {}

let width = 1080 + 250
	, height = 1080
	, nodeMargin = 1
	, x = d3.scaleLinear()
		.range([nodeMargin, width - nodeMargin])
	, y = d3.scaleLinear()
		.range([nodeMargin, height - nodeMargin])
	, radius = d3.scaleLinear()
		.range([3, 30])
	, minDegree = +Infinity
	, maxDegree = 0

const color = d3.scaleLinear()
	  .interpolate(d3.interpolateHsl)
	  //~.range([d3.rgb("#B429FD"), d3.rgb('#FD29EA')])
	  .range([d3.rgb("#4F29FD"), d3.rgb('#FD29EA')])
	, defaultColor = 'white'

let  d3n = new D3Node({styles:'.link {fill:none; stroke-width: 3; stroke-opacity: .5; mix-blend-mode: multiply;} .node {stroke-width: .5px; stroke: black;}'})
	, chart = d3n.createSVG(width, height).append('g')

// initialize chart 
chart.append('rect')
	.attr('width', '100%')
	.attr('height', '100%')
	.attr('fill', 'black')
	
let link = chart.append('g')
	.attr('id', 'links')
	.style('opacity', .7)

let node = chart.append('g')
	.attr('id', 'nodes')





// mp4 generation
// ffmpeg -r 25 -f image2 -s 1920x1080 -i out-%04d.svg -vcodec libx264 -crf 25  -pix_fmt yuv420p test.mp4




/****************************
 *
 * Add comment file contents to the graph
 *
 *****************************/
function addComments(file, callback) {

	fs.readFile(repoPath + '/' + file, 'utf8', function(err, content) {
		if (err ) {
			if (err.errno === -2)
				callback(err)
			else
				throw err
		}
		else {
			let logFile = content.split('\n')
			
			// remove the last empty line of the file
			//~logFile.pop()
			
			logFile.forEach( function(logLine) {
			
				let data = logLine.split('\t')
				
				if (data.length > 1) {
					
					//~// add comment node
					//~graph.mergeNode(data[2], {
						//~from: data[1]
						//~, x: Math.random()
						//~, y: Math.random()
						//~//, ts: data[0]
					//~})
					
					// add user node
					graph.mergeNode(data[1], {
						x: Math.random() * 10
						, y: Math.random() * 10
						//, ts: data[0]
					})
					
					// TODO mark infected if from patient 0 on day 1
					
					//~// parent comment node
					//~graph.mergeNode(data[4], {
						//~from: data[3]
						//~, x: Math.random()
						//~, y: Math.random()
					//~})
					
					// parent user node
					graph.mergeNode(data[3], {
						x: Math.random() * 10
						, y: Math.random() * 10
					})
					
					//~// edge direction: child comment to parent.
					//~graph.mergeEdge(data[2], data[4]
					//~//, {
						//~//, type: data[5] // C = commented on comment, S = commented on submission
					//~//}
					//~)
					
					// edge direction: commenting user to parent.
					graph.mergeEdge(data[1], data[3]
					//, {
						//, type: data[5] // C = commented on comment, S = commented on submission
					//}
					)
					
				}
				
			})
			callback()

		}
		
	})
	
}

/****************************
 *
 * Add infection track to the graph based on logFile contents
 *
 *****************************/
function addInfections(file, hourQuarter, callback) {
	
	//~console.log(fileIndex, file)

	fs.readFile(repoPath + '/' + file, 'utf8', function(err, content) {
		if (err) {
			if (err.errno === -2)
				callback(err)
			else
				throw err
		}
		else {
			let logFile = content.split('\n')
			
			// remove the last empty line of the file
			//~logFile.pop()
			
			logFile.forEach( function(logLine) {
				let data = logLine.split('\t')
				
				if (data.length > 1) {
					// skip empty lines
					
					if (hourQuarter === Math.floor(new Date(data[0]).getMinutes() / 60 * 100 / 25)) {
						
						//~// record infected comment node
						//~graph.mergeNodeAttributes(data[2], {
							//~infectionAge: fileIndex
						//~})
						
						// record infected user node
						graph.mergeNode(data[1], {
							infectionAge: fileIndex
							, x: Math.random() * 10
							, y: Math.random() * 10
						})
						
						if (data[3]) { // skip edge for patient0: infector is empty
							
							if ( !graph.hasNode(data[3]) ) {
								// add infecting user node - missing from source - data quality issue
								graph.mergeNode(data[3], {
									infectionAge: fileIndex
									, x: Math.random() * 10
									, y: Math.random() * 10
								})
							}
							
							// record infectious edge
							graph.mergeEdge(data[1], data[3])
						}
					}
					
				}
				
			})

			callback()
		}
	})
}

/****************************
 *
 * Generate and export SVG image
 *
 *****************************/
function exportImage(callback) {
	
	formatData(function(err, res) {

		updateSVG(function(err, res) {
			
			saveSVG(function(err, res) {
						
				callback()
						
			})
			
		})
			
	})
	
}

/****************************
 *
 * convert data to a format suitable for consumption by d3
 *
 *****************************/
function formatData(callback) {
	
	//~console.log('Format data...')
	console.log('graph characteristics', graph.order, graph.size)
	//~console.log('graph', JSON.stringify(graph.export(), null, '   '))
	
	let res = {
			nodes: []
			, edges: []
		}
	
	
	graph.forEachNode((node, attributes) => {

// temp data quality check
if (!attributes.x)
	console.log(fileIndex, node, attributes)

		res.nodes.push({
			key: node
			, x: attributes.x
			, y: attributes.y
			, inDegree: graph.inDegree(node)
			, infectionAge: attributes.infectionAge
		})
	})
	
	graph.forEachEdge(function(edge, attributes, source, target) {
		
		let sourceIndex
			, targetIndex
		
		if ( typeof edgeIndexMap[source] === 'undefined') {
			edgeIndexMap[source] = res.nodes.findIndex(function(node, index){
				return node.key === source
			})
		}
		
		sourceIndex = edgeIndexMap[source]
		
		if ( typeof edgeIndexMap[target] === 'undefined') {
			edgeIndexMap[target] = res.nodes.findIndex(function(node, index){
				return node.key === target
			})
		}
		
		targetIndex = edgeIndexMap[target]
		
		if (sourceIndex !== -1 && targetIndex !== -1 ) {
			res.edges.push({
				key: source + '-' + target
				, source: sourceIndex
				, target: targetIndex
			})
		}
	})
	
	d3Graph = res

	//~console.log('... done')
	
	callback()
}

/****************************
 *
 * Generate SVG
 *
 *****************************/
function updateSVG(callback) {

	//~console.log(JSON.stringify(graph.toJSON(), null, '    '))
	
	//~console.log('Update graph image...')
		
	const minX = d3.min(d3Graph.nodes, function(d) { return d.x})
		, minY = d3.min(d3Graph.nodes, function(d) { return d.y})
		, maxX = d3.max(d3Graph.nodes, function(d) { return d.x})
		, maxY = d3.max(d3Graph.nodes, function(d) { return d.y})

//~console.log( 'min max X', minX, maxX)
//~console.log( 'min max Y', minY, maxY)

	x.domain([Math.min(minX, minY), Math.max(maxX, maxY)])
	y.domain([Math.min(minX, minY), Math.max(maxX, maxY)])
	radius.domain(d3.extent(d3Graph.nodes, d => d.inDegree))
	
	color.domain([10, fileIndex])

	let selection = node.selectAll('.node')
		  .data(d3Graph.nodes, d => d.key)
		  //~.data(d3Graph.nodes.slice(0, 100000), d => d.key)
		  
	selection.enter()
	  .append('circle')
		.attr('class', 'node')

	// update selection
	selection.attr('r', (d, i) =>  { return radius(d.inDegree)})
		    .attr('cx', d => x(d.x))
		    .attr('cy', d => y(d.y))
		    .attr('fill', d => d.infectionAge? d.infectionAge === 10 ? 'red' : color(d.infectionAge) : defaultColor)

	selection = link.selectAll('.link')
		.data(d3Graph.edges, d => d.key)
	
	selection.enter()
	  .append('path')
		.attr('class', 'link')

	// update selection
	selection.attr('d', (d, i) => {
		  let dx = x(d3Graph.nodes[d.target].x) - y(d3Graph.nodes[d.source].x)
			  , dy = y(d3Graph.nodes[d.target].y) - y(d3Graph.nodes[d.source].y)
			  , dr = Math.sqrt(dx * dx + dy * dy)
		  return 'M' + x(d3Graph.nodes[d.source].x) + ',' + y(d3Graph.nodes[d.source].y) + 'A' + dr + ',' + dr + ' 0 0,1 ' + x(d3Graph.nodes[d.target].x) + ',' + y(d3Graph.nodes[d.target].y)
	    })
	    .style('stroke',  d => d3Graph.nodes[d.source].infectionAge? color(d3Graph.nodes[d.source].infectionAge) : defaultColor)
			  
	//~console.log('... done')
	
	callback()

}

/****************************
 *
 * Lookup data source location 
 *
 *****************************/
function listFiles() {
	
	// git log --grep=hourly --name-only --pretty="format:" --reverse --oneline  | grep log
	exec('cd ' + repoPath + ' && git log --grep=hourly --name-only --pretty="format:" --reverse --oneline  | grep log', function(err, stdout, stderr) {
		if (err || stderr)
			throw err
		else {
			
			files = stdout.split('\n')
			
			//~console.log('files', files)
			
			console.log('...all files identified')			

			next()
		}
	})
	
}

/****************************
 *
 * Export graph to a SVG file
 *
 *****************************/
function saveSVG(callback) {

	//~console.log('Save graph image file...')
	outFileIndex++
	
	let outputFileName = 'out-' + ('' + outFileIndex).padStart(4, '0') + '.svg'
	
	fs.writeFile(__dirname + '/../data/staging/svg/' + outputFileName, d3n.svgString(), function(err, res) {
		if (err)
			throw err
		
		console.log('...' + outputFileName + ' saved')
		
		callback()
		
	})

}

/****************************
 *
 * Build Generate one graph image per hour
 *
 *****************************/
function updateGraph() {
	
	if (fileIndex === files.length) {
	//~if (fileIndex === 64) {
		console.log('... All log files processed')
		next()
	}
	else  {
		if (fileIndex % 134 === 0) {
			console.log('..')
			console.log('.. progress:', Math.floor(fileIndex / files.length * 100) + '%')
		}
		
		//~addComments(files[fileIndex], function(err, res) {
			//~if(err) {
				//~// invalid file, skip
	
				//~fileIndex += 2
				
				//~// process next hour slot
				//~updateGraph()
			//~}
			//~else {
			
			// TODO transform to recursive function.
			// Iterate 16 times per log file at processing start (slowdown animation)
			// Then switch to 4 times per log file
			// values to be confirmed.
			
				addInfections(files[fileIndex+1], 0, function(err, res) {
					if(err) {
						// invalid file, skip
			
						fileIndex += 2
						
						// process next hour slot
						updateGraph()
					}
					else {
						
						updateMetrics(function(err, res) {
							
							exportImage(function(err, res) {
								
								// second half hour
								addInfections(files[fileIndex+1], 1, function(err, res) {
									
									updateMetrics(function(err, res) {
										
										exportImage(function(err, res) {
								
											// second half hour
											addInfections(files[fileIndex+1], 2, function(err, res) {
												
												updateMetrics(function(err, res) {
													
													exportImage(function(err, res) {
								
														// second half hour
														addInfections(files[fileIndex+1], 3, function(err, res) {
															
															updateMetrics(function(err, res) {
																
																exportImage(function(err, res) {
																	
																	fileIndex += 2
																	
																	// process next hour slot
																	updateGraph()
																	
																})
															})
														})
														
													})
												})
											})
										})
									})
								})
							})
						})
					}
				})
			//~}
		//~})
	}
}

/****************************
 *
 * compute graph statistics
 *
 *****************************/
function updateMetrics(callback) {
	
	//~console.log('Compute layout...')
	
	const FA2Settings = forceAtlas2.inferSettings(graph)
	
	//~FA2Settings.adjustSizes = true
	
	//~console.log('FA2 settings', JSON.stringify(FA2Settings, null, ''))
	
	//~console.time('FA2')
	
	forceAtlas2.assign(graph, {iterations: 50, settings: FA2Settings})
	
	//~console.timeEnd('FA2')
	
	//~console.log('... layout computation done')
	
	callback()
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
 * Start processing
 *
 *****************************/
fs.readFile(__dirname + '/../data/metadata/datasourcePath', 'utf8', function(err, path) {
	if (err)
		throw err
		
	repoPath = path
	//~repoPath = path + '/data'

	console.log(' ')	
	console.log('-----------------------------------------------------')	
	console.log('Starting data transformation...')
	console.log('reading data from', repoPath)
	
	// launch first step
	next()
})
