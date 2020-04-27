const exec = require('child_process').exec
	, fs = require('fs')
	, d3 = require('d3')
	, D3Node = require('d3-node')
	, {DirectedGraph} = require('graphology')
	, forceAtlas2 = require('graphology-layout-forceatlas2')
	
const  transformSteps = [listFiles, processLogFile]

let files // array of log files from data source
	, repoPath // file path for data source repository
	, graph = new DirectedGraph() // comments and infections Graphology instance
	, d3Graph // graph data structure for consumption by d3
	, currentTransformStep = 0
	, fileIndex = 0
	, outFileIndex = 0
	, edgeIndexMap = {}
	, layoutIterationCount = d3.scaleLog()
		.range([150, 15])
	, sliceCounter = d3.scaleQuantize() // number of times an hourly log file should be split to generate one frame, depending on how extraction progresses. This allows to slow down the animation at startup.
		.range([8, 6, 6, 6, 6, 6, 6, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
	, metadata = {
		commentCount: 0
		, infectionCount: 0
		, timestamp: null
	}

let width = 1920
	, height = 1080
	, margin = 30
	, x = d3.scaleLinear()
		.range([margin, height - margin]) // square graph, use height
	, y = d3.scaleLinear()
		.range([margin, height - margin])
	, radius = d3.scaleSqrt()
		.range([3, 30])
	, minDegree = +Infinity
	, maxDegree = 0
	, color = d3.scaleLinear()
	  .interpolate(d3.interpolateHsl)
	  //.range([d3.rgb("#B429FD"), d3.rgb('#FD29EA')])
	  .range([d3.rgb('#5229fd'),d3.rgb('#cf29fd')])
	  //~const color = d3.scaleSequential(d3.interpolateViridis)
	, saneColor = '#83D34A'
	, patient0Color = '#1018ef'

let  d3n = new D3Node({styles:' \
		.link {fill:none; stroke-width: 3; stroke-opacity: .5; mix-blend-mode: multiply;} \
		.node {stroke-width: .5px; stroke: black;} \
		text {fill: white; font-size: 20px; font-family: Raleway;} \
		.metric {text-anchor: end;} \
		.metric-large {font-size: 32px;} \
		#infectionRate {fill: red;} \
		#infectionCount {fill: #cf29fd;} \
		#commentCount {fill: ' + saneColor + ';} \
	'})
	, svg = d3n.createSVG(width, height)


/****************************
 *
 * Initialize chart layout
 *
 *****************************/
 
// Background
svg.append('rect')
	 .attr('width', '100%')
	 .attr('height', '100%')
	 .attr('fill', '#222')
	 .attr('stroke', 'red')
	 .attr('stroke-width', '2px')

// Metrics panel
let $metricsPanel = svg.append('g')
	  .attr('transform', 'translate(' + margin + ', ' + margin + ')')

// Metrics panel background
$metricsPanel.append('rect')
	 .attr('width', () => (width  - height) / 2  - 2 * margin)
	 .attr('height', () => height  - 2 * margin)
	 .attr('fill', '#333')

// Playback timestamp
let $timestamp = $metricsPanel.append('text')
      .attr('id', 'timestamp')
      .attr('x', '20px')
      .attr('y', '20px')
  
let $infectionRate = $metricsPanel.append('text')
      .attr('id', 'infectionRate')
      .attr('class', 'metric metric-large')
      .attr('x', '60px')
      .attr('y', '120px')
  
let $commentCount = $metricsPanel.append('text')
      .attr('id', 'commentCount')
      .attr('class', 'metric')
      .attr('x', '60px')
      .attr('y', '180px')
  
let $infectionCount = $metricsPanel.append('text')
      .attr('id', 'infectionCount')
      .attr('class', 'metric')
      .attr('x', '60px')
      .attr('y', '240px')


let $chart = svg.append('g')
	  .attr('transform', 'translate(' + (width  - height) / 2 + ', 0)')
	
let $link = $chart.append('g')
	.attr('id', 'links')
	.style('opacity', .7)

let $node = $chart.append('g')
	.attr('id', 'nodes')

// mp4 generation
// ffmpeg -r 25 -f image2 -s 1920x1080 -i out-%04d.svg -vcodec libx264 -crf 25  -pix_fmt yuv420p test.mp4

// music: Rimsky-Korsakov: "Flight of the Bumble-Bee"
// soundrack alternate Grieg – In the Hall of the Mountain King


// See comment using reddit API using https://www.reddit.com/r/memes/api/info?id=t1_commentID
// for posts, change Id to : t3_postID

/****************************
 *
 * Add comment file contents to the graph
 * 
 * @param {object} logFile array of log entries
 * @param {function} callback
 *
 *****************************/
function addComments(logFile, callback) {

	// increment comments counter
	metadata.commentCount += logFile.length
	
	if (fileIndex < 62) {
	// first 24 hours, also represent uninfectious comments in the graph

		logFile.forEach( function(logLine) {
			let data = logLine.split('\t')
			
			if (data.length > 1 && graph.hasNode(data[3]) &&  graph.hasNodeAttribute(data[3], 'infectionAge')) {
			// line is not empty, edge is complete (not patient 0 line) and the comment's parent is infected.
				
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
	}

	callback()
	
}

/****************************
 *
 * Add infection track to the graph based on logFile contents
 * 
 * @param {object} logFile array of log entries
 * @param {function} callback
 *
 *****************************/
function addInfections(logFile, callback) {
	
	//~console.log(fileIndex, file)
	
	// remove the last empty line of the file
	//~logFile.pop()
	
	logFile.forEach( function(logLine) {
		let data = logLine.split('\t')
		
		if (data.length > 1) {
			// skip empty lines
		
			metadata.infectionCount++
		
			//~// record infected comment node
			//~graph.mergeNodeAttributes(data[2], {
				//~infectionAge: fileIndex
			//~})
			
			// record infected user node
			graph.mergeNode(data[1], {
				infectionAge: fileIndex
				, x: Math.random() * 100
				, y: Math.random() * 100
			})
			
			if (data[3]) { // skip edge for patient0: infector is empty
				
				if ( !graph.hasNode(data[3]) ) {
					// add infecting user node - missing from source - data quality issue
					graph.mergeNode(data[3], {
						infectionAge: fileIndex
						, x: Math.random() * 100
						, y: Math.random() * 100
					})
				}
				
				// record infectious edge
				graph.mergeEdge(data[1], data[3])
			}
			
		}
		
	})
	
	if (logFile[0].split('\t').length > 1)
		metadata.timestamp = logFile[0].split('\t')[0]

	callback()
}

/****************************
 *
 * Generate and export SVG image
 *
 *****************************/
function exportImage(callback) {
	
	formatData(function(err, res) {

		updateSVG(function(err, res) {
			
			if(fileIndex === 10) {
				$node.selectAll('.node')
					.style('stroke', 'white')
					.style('stroke-width', '1.5px')
			}
			
			
			saveSVG(function(err, res) {
						
				callback()
						
			})
			
		})
			
	})
	
}

/****************************
 *
 * Filter comments out of the graph
 *
 *****************************/
function filterComments() {
	
	graph.forEachNode((node, attributes) => {
		
		if (typeof attributes.infectionAge === 'undefined') {
			//~console.log('dropNode', node)
			graph.dropNode(node)
		}
	})
	
	// reset edgeIndexMap
	edgeIndexMap = {}

	console.log('done filtering comments')
}

/****************************
 *
 * convert data to a format suitable for consumption by d3
 *
 *****************************/
function formatData(callback) {
	
	//~console.log('Format data...')
	//~console.log('graph characteristics', graph.order, graph.size)
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
 * format timestamp
 * 
 * @param {string} timestamp
 * 
 * @return {string} formatted datetime
 *
 *****************************/
function formatTimestamp(input) {
	
	let d = new Date(input)
	
	return d.toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})
}

/****************************
 *
 * Chunk data file to generate one image frame
 * 
 * Recursive function, splices input array and runs callback when no data is remaining.
 * 
 * @param {object} data array
 * @param {number} recordCount - number of records to process inside a chunk
 * @param {function} callback
 *
 *****************************/
function generateFrames(data, recordCount, callback) {
	
	let dataSlice = data.splice(0, recordCount)
	
	if (!dataSlice.length)
		callback()
	else {
	
		addInfections(dataSlice, function(err, res) {
			
			updateMetrics(function(err, res) {
				
				exportImage(function(err, res) {

					generateFrames(data, recordCount, callback)
				})
			})
		})
	}
	
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
			
			files = stdout.split('\n').map(path => path.replace('data', 'data/raw'))
			
			//~console.log('files', files)
			
			layoutIterationCount.domain([1, files.length])
			
			sliceCounter.domain([0, files.length-1])
			
			console.log('...all files identified')			

			next()
		}
	})
	
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
 * Generate one graph image per hour
 *
 *****************************/
function processLogFile() {
	
	//~if (fileIndex === files.length) {
	if (fileIndex === 100) {
		console.log('... All log files processed')
		next()
	}
	else  {
		if (fileIndex % 134 === 0) {
			console.log('..')
			console.log('.. progress:', Math.floor(fileIndex / files.length * 100) + '%')
		}
		
console.log('processing file', fileIndex, 'into outFile', outFileIndex)
		// Cleanup comments out of graph when processing first file after 24h
		if (fileIndex === 62)
			filterComments()
		
		readFile(files[fileIndex], function(err, file) {
			
			if(err) {
				// invalid file, skip
	
				fileIndex += 2
				
				// process next hour slot
				processLogFile()
			}
			else {
				
				let logContent = file.split('\n')
				
				addComments(logContent, function(err, res) {
					
					if (fileIndex < 62) {
					// Within day 1
					// Generate a frame with the new uninfected nodes
						updateMetrics(function(err, res) {
							
							exportImage(function(err, res) {
								processInfectionFile()

							})
						})
					}
					else
						processInfectionFile()
				})
			}
		})
		
	}
}

/****************************
 *
 * Process infection log files and generate relevant frames
 *
 *****************************/
function processInfectionFile() {
	readFile(files[fileIndex+1], function(err, file) {
		if(err) {
			// invalid file, skip

			fileIndex += 2
			
			// process next hour slot
			processLogFile()
		}
		else {
			
			let logContent = file.split('\n')
				, sliceCount = sliceCounter(fileIndex)

			if (outFileIndex % 100 === 0)
				console.log('sliceCount', sliceCount)
			
			generateFrames(logContent, Math.ceil(logContent.length / sliceCount), function(err, res) {

				fileIndex += 2
				
				// process next hour slot
				processLogFile()
				
			})
		}
	})
}

/****************************
 *
 * Read input log file
 *
 *****************************/
function readFile(fileName, callback) {

	fs.readFile(repoPath + '/' + fileName, 'utf8', function(err, content) {
		if (err) {
			if (err.errno === -2)
				callback(err)
			else
				throw err
		}
		else {
			callback(null, content)
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
		
		if (outFileIndex % 100 === 0)
			console.log('...' + outputFileName + ' saved')
		
		callback()
		
	})

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
	
	//~console.log('iterations', Math.floor(layoutIterationCount(fileIndex+1)))
	
	forceAtlas2.assign(graph, {iterations: Math.floor(layoutIterationCount(fileIndex+1)), settings: FA2Settings})
	
	//~console.timeEnd('FA2')
	
	//~console.log('... layout computation done')
	
	callback()
}

/****************************
 *
 * Generate SVG
 *
 *****************************/
function updateSVG(callback) {

	//~console.log(JSON.stringify(graph.toJSON(), null, '    '))
	
	
	// update metrics panel content
	$timestamp.text(formatTimestamp(metadata.timestamp))
	
	$infectionCount.text(metadata.infectionCount)
	$commentCount.text(metadata.commentCount)
	$infectionRate.text((metadata.infectionCount / metadata.commentCount * 100).toFixed(2) + '%')
	
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

	let $nodeSelection = $node.selectAll('.node')
		  .data(d3Graph.nodes, d => d.key)
		  //~.data(d3Graph.nodes.slice(0, 100000), d => d.key)
		  
	$nodeSelection.enter()
	  .append('circle')
		.attr('class', 'node')
		
	$nodeSelection.exit()
	  .remove()

	// update selection
	$nodeSelection.attr('r', (d, i) =>  { return radius(d.inDegree)})
		    .attr('cx', d => x(d.x))
		    .attr('cy', d => y(d.y))
		    .attr('fill', d => d.infectionAge? d.infectionAge === 10 ? patient0Color : color(d.infectionAge) : saneColor)
		    
	$linkSelection = $link.selectAll('.link')
		.data(d3Graph.edges, d => d.key)
	
	$linkSelection.enter()
	  .append('path')
		.attr('class', 'link')

	$linkSelection.exit()
	  .remove()
	  
	// update selection
	$linkSelection.attr('d', (d, i) => {
		try {
		  let dx = x(d3Graph.nodes[d.target].x) - y(d3Graph.nodes[d.source].x)
			  , dy = y(d3Graph.nodes[d.target].y) - y(d3Graph.nodes[d.source].y)
			  , dr = Math.sqrt(dx * dx + dy * dy)
			  , sweep = i%2 === 0 ? 0 : 1
			  
		  return 'M' + x(d3Graph.nodes[d.source].x) + ',' + y(d3Graph.nodes[d.source].y) + 'A' + dr + ',' + dr + ' 0 0,' + sweep + ' ' + x(d3Graph.nodes[d.target].x) + ',' + y(d3Graph.nodes[d.target].y)
		  
		  
		  }catch(e) {
			console.log('missing source', d.source)  
			throw e
		  }
	    })
	    .style('stroke',  d => d3Graph.nodes[d.source].infectionAge? color(d3Graph.nodes[d.source].infectionAge) : saneColor)
			  
	//~console.log('... done')
	
	callback()

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
