const exec = require('child_process').exec
	, fs = require('fs')
	, d3 = require('d3')
	, D3Node = require('d3-node')
	, {DirectedGraph} = require('graphology')
	, forceAtlas2 = require('graphology-layout-forceatlas2')
	
const transformSteps = [initLayout, listFiles, processLogFile]

let files // array of log files from data source
	, repoPath // file path for data source repository
	, graph = new DirectedGraph() // comments and infections Graphology instance
	, d3Graph // graph data structure for consumption by d3
	, currentTransformStep = 0
	, fileIndex = 0
	, outFileIndex = 0
	, edgeIndexMap = {}
	, filePrefix = 'hourly'
	
// variable processing of volumes based on progress
const layoutIterationCount = function() { // FA2 layout iterations
		switch(true) {
			case fileIndex >= 350: // over week 1
				return 1000
				break
			case fileIndex > 62: // over day 1
				return 300
				break
			case fileIndex === 62:
				return 1000
				break
			default:
				return 300
				break
		}
		
	}
	, fileCount = function() { // number of hourly files to process in one image grame
		//~return 3
		
		switch(true) {
			case fileIndex >= 350:
				return 7 * 24
				break
			case fileIndex >= 62:
				return 24
				break
			default:
				return 1
				break
		}
		
	}
	, sliceCounter = function() { // number of slices one file should be chunked into
		//~return 1
		switch(true) {
			case fileIndex <= 12:
				return 2
				break
			case fileIndex === 60:
				return 1 // Last available slice for the last hour of day 1
				break
			case fileIndex < 62:
				return 6 // 10 minutes intervals
				break
			default:
				return 1
				break
		}
		
	}
	, frameRate = function() { // number of slices one file should be chunked into
		switch(true) {
			case fileIndex === 12:
				return 15
				break
			case fileIndex < 32:
				return 30
				break
			case fileIndex < 62:
				return 15
				break
			//~case fileIndex < 100:
				//~return 30
				//~break
			default:
				return 15
				break
		}
		
	}
	, metadata = {
		commentCount: 0
		, infectionCount: 0
		, timestamp: null
	}

let width = 1920
	, height = 1080
	, marginH = 40
	, marginV = 30
	, dimensions = {}
	, xScale = d3.scaleLinear()
		.range([0, height - 2 * marginV])
	, yScale = d3.scaleLinear()
		.range([0, height - 2 * marginV])
	, radius = d3.scaleSqrt()
		.range([3, 30])
	, minDegree = +Infinity
	, maxDegree = 0
	, saneColor = '#83D34A'
	, patient0Color = '#1018ef'
	, recentInfectedColor = '#cf29fd'
	, lessRecentInfectedColor = '#5229fd'
	, whiteLike = '#eee'
	, bgFill = '#19101b'
	, color = d3.scaleLinear()
	  .interpolate(d3.interpolateHsl)
	  //.range([d3.rgb("#B429FD"), d3.rgb('#FD29EA')])
	  .range([d3.rgb(lessRecentInfectedColor),d3.rgb(recentInfectedColor)])
	  //~const color = d3.scaleSequential(d3.interpolateViridis)

let d3n = new D3Node({styles:' \
		.link {fill:none; stroke-width: 3; stroke-opacity: .5; mix-blend-mode: multiply;} \
		.node {stroke-width: .5px; stroke: black;} \
		text {fill: ' + whiteLike + '; font-size: 20px; font-family: Raleway; } \
		.metric {text-anchor: end;} \
		.heading {font-size: 28px;} \
		.text-large {font-size: 36px;} \
		#infectionRate {fill: red;} \
		#infectionCount {fill: ' + recentInfectedColor + ';} \
		#commentCount {fill: ' + saneColor + ';} \
	'})
	, svg = d3n.createSVG('100%', '100%', {
		preserveAspectRatio: 'xMinYMin'
		, viewBox: '0 0 ' + width + ' ' + height})

// DOM node selectors
let $captions
	, $chart
	, $commentCount
	, $infectionCount
	, $infectionRate
	, $legend
	, $link
	, $metrics
	, $node
	, $playback
	, $speed
	, $timestamp
	, $top10
	
// mp4 generation
// ffmpeg -r 30 -f image2 -s 1920x1080 -i hourly-%04d.svg -vcodec libx264 -crf 30  -pix_fmt yuv420p test.mp4

// Cross-fade daily frames
// https://gist.github.com/anguyen8/d0630b6aef6c1cd79b9a1341e88a573e
 

// music: Rimsky-Korsakov: "Flight of the Bumble-Bee"
// soundrack alternate Grieg – In the Hall of the Mountain King


// See comment using reddit API using https://www.reddit.com/r/memes/api/info?id=t1_commentID
// for posts, change Id to : t3_postID

/****************************
 *
 * Add comment log entries to the graph
 * 
 * @param {object} logData array of log entries
 * @param {function} callback
 *
 *****************************/
function addComments(logData, callback) {

	// increment comments counter
	metadata.commentCount += logData.length
	
	if (fileIndex < 62) {
	// first 24 hours, also represent uninfectious comments in the graph

		logData.forEach( function(data) {
			
			//~if (graph.hasNode(data[3]) &&  graph.hasNodeAttribute(data[3], 'infectionAge')) {
			if (graph.hasNode(data[3])) {
			// The comment's parent ispresent in the graph and  infected.
				
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
 * Add infection log entries to the graph
 * 
 * @param {object} logData array of log entries
 * @param {function} callback
 *
 *****************************/
function addInfections(logData, callback) {
	
	//~console.log(fileIndex, file)
	
	logData.forEach( function(data) {
		
		metadata.infectionCount++
	
		//~// record infected comment node
		//~graph.mergeNodeAttributes(data[2], {
			//~infectionAge: fileIndex
		//~})
		
		// record infected user node
		graph.mergeNode(data[1], {
			infectionAge: fileIndex
			, x: !data[3] ? 0 : Math.random() * 100
			, y: !data[3] ? 0 : Math.random() * 100
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
	
	})
	
	// update playback timestamp
	if (logData[0])
		metadata.timestamp = logData[logData.length-1][0]

	callback()
}


/****************************
 *
 * Populate legend panel
 * 
 *  @pre $legend panel selector is defined
 *
 *****************************/
function addLegend() {
	
	$legend.append('text')
	  .attr('class', 'heading')
	  .text('Legend')
	  //~.attr('class', 'text-large')
	  .attr('x', marginH)
	  .attr('y', dimensions.rowHeight * .75)
	
	// Shapes
	
	$legend.append('circle')
	  .attr('cx', marginH + 25) // align with rect
	  .attr('cy', dimensions.rowHeight * 1.75 )
	  .attr('r', 30)
	  .attr('fill', 'none')
	  .style('stroke', whiteLike)
	  .style('stroke-width', '1.5px')
	
	$legend.append('circle')
	  .attr('cx', marginH + 25) // align with rect
	  .attr('cy', dimensions.rowHeight * 1.75 + 10 )
	  .attr('r', 20)
	  .attr('fill', 'none')
	  .style('stroke', whiteLike)
	  .style('stroke-width', '1.5px')
	
	$legend.append('circle')
	  .attr('cx', marginH + 25) // align with rect
	  .attr('cy', dimensions.rowHeight * 1.75 + 20 )
	  .attr('r', 10)
	  .attr('fill', 'none')
	  .style('stroke', whiteLike)
	  .style('stroke-width', '1.5px')
	
	let $text = $legend.append('text')
		.attr('x', marginH + 70)
	    .attr('y', dimensions.rowHeight * 1.5 + 5 )
	 
	 $text.append('tspan')
	   .text('User (larger = most')
	 
	 $text.append('tspan')
	   .text('commented on )')
	   .attr('dy', '1.2em')
	   .attr('x', marginH + 70)
	
	let point1  = {
			x: marginH - 10
			, y: dimensions.rowHeight * 2.75
		}
		, point2  = {
			x: point1.x + 45
			, y: point1.y + dimensions.rowHeight * .5
		}
		, arc  = Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))
	
	
	legendEdgePath = 'M'
		  + ' ' + point1.x + ',' + point1.y
		  + ' A'
		  + ' ' + arc + ',' + arc
		  + ' 0 0,0'
		  + ' ' + point2.x + ',' + point2.y
	
	$legend.append('path')
	  .attr('d', legendEdgePath)
	  .attr('fill', 'none')
	  .style('stroke', whiteLike)
	  .style('stroke-width', '1.5px')
	    
	$legend.append('text')
	  .text('Comment')
		.attr('x', marginH + 70)
		.attr('y', dimensions.rowHeight * 2.75 + 20)
	    
	    
	// Colors
	
	let $colors = $legend.append('g')
		.attr('transform', 'translate(0, ' + 3 * dimensions.rowHeight  + ')')
	
	$colors.append('rect')
	  .attr('x', marginH)
	  .attr('y', dimensions.rowHeight * 1.25 - 20 )
	  .attr('width', 50)
	  .attr('height', 20)
	  .attr('fill', saneColor)
	  
	$colors.append('text')
	  .text('Sane')
		.attr('x', marginH + 70)
	    .attr('y', dimensions.rowHeight * 1.25 )
	
	
	$colors.append('rect')
	  .attr('x', marginH)
	  .attr('y', dimensions.rowHeight * 2 - 20 )
	  .attr('width', 50)
	  .attr('height', 20)
	  .attr('fill', recentInfectedColor)
	  
	$colors.append('text')
	  .text('Recently infected')
		.attr('x', marginH + 70)
	    .attr('y', dimensions.rowHeight * 2 )
	
	
	$colors.append('rect')
	  .attr('x', marginH)
	  .attr('y', dimensions.rowHeight * 2.75 - 20 )
	  .attr('width', 50)
	  .attr('height', 20)
	  .attr('fill', lessRecentInfectedColor)
	  
	$colors.append('text')
	  .text('Less recently infected')
		.attr('x', marginH + 70)
	    .attr('y', dimensions.rowHeight * 2.75 )
	
	
	$colors.append('rect')
	  .attr('x', marginH)
	  .attr('y', dimensions.rowHeight * 3.5 - 20 )
	  .attr('width', 50)
	  .attr('height', 20)
	  .attr('fill', patient0Color)
	  .style('stroke', whiteLike)
	  .style('stroke-width', '1.5px')
	  
	$colors.append('text')
	  .text('Patient zero')
		.attr('x', marginH + 70)
	    .attr('y', dimensions.rowHeight * 3.5 )
}

/****************************
 *
 * Append panel to the SVG
 * 
 * @param {object} opts
 * 
 *   opts.x, opts.y Panel position
 *   opts.width, opts.height Panel size
 *   opts.bg {boolean?} whether background rectangle should be displayed
 *
 *****************************/
function addPanel(opts) {
	
	let $panel = svg.append('g')
		  .attr('transform', 'translate(' + opts.x + ', ' + opts.y + ')')
		  .style('mix-blend-mode', 'normal')
	
	if (typeof opts.bg === 'undefined' || opts.bg) {
	// Metrics panel background
		$panel.append('rect')
		  .attr('width', opts.width)
		  .attr('height', opts.height)
		  .attr('fill', bgFill)
		  .attr('fill-opacity', .6)
		  .attr('stroke-width', '1px')
		  .attr('stroke', '#333')
	}
	
	return $panel
}

/****************************
 *
 * Generate and export SVG image
 *
 *****************************/
function exportImage(callback) {
	
	formatData(function(err, res) {

		updateSVG(function(err, res) {
			
			callback()
			//~saveSVG(function(err, res) {
						
				//~callback()
						
			//~})
			
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
	
	//~console.time('formatData')
	
	let res = {
			nodes: []
			, edges: []
		}
		, infectors = []
	
	graph.forEachNode((node, attributes) => {

		const deg = graph.inDegree(node)
		
		res.nodes.push({
			key: node
			, x: attributes.x
			, y: attributes.y
			, inDegree: deg
			, infectionAge: attributes.infectionAge
		})
		
		if (typeof attributes.infectionAge !== 'undefined' && deg > 0) {
		
			infectors.push({n: node, count: deg})

		}
	})
	
	res.mostDangerous = infectors.sort((a, b) => b.count - a.count).slice(0, 10)
	
	//~console.log('most dangerous', res.mostDangerous)
	
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

	//~console.timeEnd('formatData')
	
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
 * Draw the visualization's building blocks in the SVG
 *
 *****************************/
function initLayout() {
	 
	// Background
	svg.append('rect')
		 .attr('width', '100%')
		 .attr('height', '100%')
		 .attr('fill', bgFill)
		 //~.attr('stroke', 'red') // temp
		 //~.attr('stroke-width', '2px')

	// dimension measures
//.. temp
let margin = 30

	let sizes = {
			metricsPanelWidth: (width  - height) / 2  - margin
			, captionsPanelWidth: 2 * (width  - height) / 2  - margin
			, metricsPanelHeight: (height - 2 * margin) * 1 / 3
			, captionsPanelHeight: (height - 2 * margin) * 2 / 3
		}
		, positions = {
			chartPanelX: (width - height + 2 * marginV) / 2
			, metricsPanelX: sizes.metricsPanelWidth + height + margin
			, captionsPanelX: height + margin
			, captionsPanelY: (height - 2 * margin) * 1 / 3 + 2 * margin
			, textX: sizes.metricsPanelWidth / 3
			, dx: 10
			, textY: 2 * margin
			, textYDelta: 60
		}
	
	// Panels horizontal positions and widths
	dimensions = {
		leftCol: {
			x: marginH
			, width: (width - height) / 2 + marginV - 2 * marginH
		}
	}

	dimensions.centerCol = {
		x: dimensions.leftCol.x + dimensions.leftCol.width + marginH
		, width: height - 2 * marginV
	}

	dimensions.rightCol = {
		x: dimensions.centerCol.x + dimensions.centerCol.width + marginH
		, width: dimensions.leftCol.width
	}

	// Panels heights
	dimensions.smallPanel = {
		// reference row height, page fits 7 (3 blocks, including vertical margins)
		height: (height - 4 * marginV ) / 7
	}
	
	dimensions.mediumPanel = {
		height: dimensions.smallPanel.height * 3
	}
	
	dimensions.largePanel = {
		height: dimensions.smallPanel.height * 4 + marginV
	}
	
	dimensions.rowHeight = 60
	
	
	
	
// panels placeholders (temp)

	// left
	//~svg.append('rect')
		 //~.attr('x', dimensions.leftCol.x)
		 //~.attr('y', 3 * marginV + dimensions.smallPanel.height + dimensions.mediumPanel.height)
		 //~.attr('width', dimensions.leftCol.width)
		 //~.attr('height', dimensions.mediumPanel.height)
		 //~.attr('fill', 'none')
		 //~.attr('stroke-width', '2px')
		 //~.attr('stroke', 'red')

	// Graph chart panel - Center, background
	 $chart = addPanel({
		x: dimensions.centerCol.x
		, y: marginV
		, width: dimensions.centerCol.width
		, height: dimensions.centerCol.width
		, bg: false
	})

	$link = $chart.append('g')
	  .attr('id', 'links')
	  .style('opacity', .7)

	$node = $chart.append('g')
	  .attr('id', 'nodes')
		
	// Title panel
	let $title = addPanel({
		x: dimensions.leftCol.x
		, y: marginV
		, width: dimensions.leftCol.width * 2
		, height: dimensions.smallPanel.height
	})
	
	$title.append('text')
		.text('Memonavirus - Journey of an epidemic')
		  .attr('class', 'text-large')
		  .attr('x', marginH)
		  .attr('y', dimensions.smallPanel.height / 2 + 8)

		
	// Legend panel
	$legend = addPanel({
		x: dimensions.leftCol.x
		, y: 2 * marginV + dimensions.smallPanel.height + dimensions.mediumPanel.height * .5
		, width: dimensions.leftCol.width
		, height: dimensions.mediumPanel.height
	})
	
	// populate legend contents
	addLegend()

	// Playback panel
	$playback = addPanel({
		x: dimensions.leftCol.x
		, y:  3 * marginV + dimensions.smallPanel.height + dimensions.mediumPanel.height * 1.5
		, width: dimensions.leftCol.width
		, height: dimensions.mediumPanel.height / 2
	})

	// Playback timestamp
	 $timestamp = $playback.append('text')
		.attr('id', 'timestamp')
	    .attr('class', 'heading')
		.attr('x', marginH)
		.attr('y', positions.textY)
	
	positions.textY += 1.5 * dimensions.rowHeight
	
	$speed = $playback.append('text')
		.attr('id', 'speed')
		.attr('x', dimensions.leftCol.width / 3)
		.attr('y', positions.textY)

	// Metrics panel
	$metrics = addPanel({
		x: dimensions.rightCol.x
		, y: marginV
		, width: dimensions.rightCol.width
		, height: dimensions.mediumPanel.height / 2
	})
		 
	$infectionRate = $metrics.append('text')
	  .attr('id', 'infectionRate')
	  .attr('class', 'metric text-large')
	  .attr('x', dimensions.leftCol.width / 3)
	  .attr('y', dimensions.smallPanel.height / 2 + 8)
		  
	$metrics.append('text')
	  .text('Infection rate')
	  .attr('class', 'text-large')
	  .attr('x', dimensions.leftCol.width / 3)
	  .attr('y', dimensions.smallPanel.height / 2 + 8)
	  .attr('dx', positions.dx)
		  
	positions.textY = 2.2 * margin + dimensions.rowHeight

		
	$infectionCount = $metrics.append('text')
	  .attr('id', 'infectionCount')
	  .attr('class', 'metric')
	  .attr('x', dimensions.leftCol.width / 3)
	  .attr('y', positions.textY)
				
	$metrics.append('text')
	  .text('Infections')
	  .attr('x', dimensions.leftCol.width / 3)
	  .attr('y', positions.textY)
	  .attr('dx', positions.dx)
		
	positions.textY += dimensions.rowHeight / 1.8


	$commentCount = $metrics.append('text')
	  .attr('id', 'commentCount')
	  .attr('class', 'metric')
	  .attr('x', dimensions.leftCol.width / 3)
	  .attr('y', positions.textY)
				
	$metrics.append('text')
	  .text('Comments')
	  .attr('x', dimensions.leftCol.width / 3)
	  .attr('y', positions.textY)
	  .attr('dx', positions.dx)


	// Captions panel

	$captions = addPanel({
		x: dimensions.rightCol.x
		, y: 2 * marginV + dimensions.mediumPanel.height
		, width: dimensions.rightCol.width
		, height: dimensions.largePanel.height
	})

	$captions.append('text')
	  .attr('class', 'heading')
	  .text('Most dangerous users')
	  .attr('x', marginH)
	  .attr('y', dimensions.rowHeight)

	$top10 = $captions.append('g')
	  .attr('transform', 'translate(' + dimensions.leftCol.width / 3 + ',' + dimensions.rowHeight * 2 + ')')
		 
	next()
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
			
			//remove the last two invalid entry from the array
			files.pop()
			
			console.log('files', files.length)
			console.log('last files', files[files.length-2])
			console.log('last files', files[files.length-1])
			
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
 * Process a log file(s) buffer dataset:
 * 
 *   * slice in multiple chunks if needed
 *   * generate one frame image per chink
 * 
 * Recursive function, splices input log file content according to log timestamps and desired slice count
 * 
 * @param {object} data: content of one or more log files (comments + infections)
 * @param {number} currentIndex - recursive calls count tracker
 * @param {function} callback
 *
 *****************************/
function processBuffer(data, currentIndex, callback) {
	
	let sliceCount = sliceCounter()
	
	console.log('processBuffer', currentIndex, sliceCount)
	
	
	if (currentIndex === sliceCount)
		callback()
	else {

		let commentSlice
			, infectionSlice
		
		if (currentIndex === sliceCount - 1) {
			// last slice, process all remaining data
			// This is necessary in order not to miss the last line of comment file, which is generally the first record of next hour (minute 0)
			commentSlice = data.comments
			infectionSlice = data.infections
		}
		else {
			// Identify the first record with minutes higher than (60 * currentIndex / sliceCount) threshold
			let commentIndex = data.comments.findIndex(record => new Date(record[0]).getMinutes() > 59 * ((currentIndex+1) / sliceCount) )
				, infectionIndex = data.infections.findIndex(record => new Date(record[0]).getMinutes() > 59 * ((currentIndex+1) / sliceCount) )
				
			commentSlice =  data.comments.splice(0, commentIndex)
			
			infectionSlice =  data.infections.splice(0, infectionIndex)
		}
			

		addComments(commentSlice, function(err, res) {
		
			addInfections(infectionSlice, function(err, res) {

//~console.log('processed slice', currentIndex, commentSlice.length, infectionSlice.length)
//~processBuffer(data, ++currentIndex, callback)

				if(graph.order === 0)
					processBuffer(data, ++currentIndex, callback)
				else {
					
					// Generate a frame with the updated dataset
					updateMetrics(function(err, res) {
						
						exportImage(function(err, res) {
							console.log('image exported', fileIndex)
							processBuffer(data, ++currentIndex, callback)

						})
					})
				}
			})
		})
		
		
		//~let recordCount = Math.ceil(logContent.length / sliceCount)
		//~, commentSlice = data.comments.splice(0, recordCount)
		//~, infectionSlice = data.infections.splice(0, recordCount)

		//~if (outFileIndex % 100 === 0)
			//~console.log('sliceCount', sliceCount)
		
	}
}

/****************************
 *
 * Append data buffer with one comment and one infection file until fileCount is met.
 * 
 * @param {object} buff buffer of comments and infections to be included in next frame
 *
 *****************************/
function processLogFile(buff) {
	
	if (fileIndex === files.length) {
	//~if (fileIndex === 250) {
		console.log('... All log files processed')
		next()
	}
	else  {

		if (fileIndex % 40 === 0) {
			console.log('..')
			console.log('.. progress:', Math.floor(fileIndex / files.length * 100) + '%')
		}
		
		buff = buff || {
			comments: []
			, infections: []
			, count: 0
		}
		
console.log('processing file', fileIndex, ' - ', files[fileIndex], 'into outFile', (outFileIndex + 1))

		// Cleanup comments out of graph when processing first file after 24h
		if (fileIndex === 62) {
			filterComments()
			filePrefix = 'aggregate'
		}
		
		// get comments file contents
		readFile(files[fileIndex], function(err, file) {
			
			if(err) {
				// invalid file, skip
	console.log('skip')
				fileIndex += 2
				
				// process next hour slot
				processLogFile()
			}
			else {
				
				let comments = file.split('\n')
								.map(line => line.split('\t'))
								.filter(line => line.length > 1)
					
					console.log('comments count', comments.length)
								
				buff.comments = buff.comments.concat(comments)
				
				// get infections file contents
				readFile(files[fileIndex+1], function(err, file) {
					
					if(err) {
						// invalid file, skip
			
						fileIndex += 2
						
						// process next hour slot
						processLogFile()
					}
					else {				
						
						let infections = file.split('\n')
								.map(line => line.split('\t'))
								.filter(line => line.length > 1)
										
						buff.infections = buff.infections.concat(infections)
						
						buff.count++
							
						fileIndex += 2
						
						if (buff.count === fileCount()) {
							processBuffer(buff, 0, function(err, res) {
								processLogFile()
							})
							
						}
						else {
							
							// process next hour slot
							processLogFile(buff)
						}
				
				

					}
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
				, sliceCount = sliceCount()

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
	
	let outputFileName = filePrefix + '-' + ('' + outFileIndex).padStart(4, '0') + '.svg'
	
	fs.writeFile(__dirname + '/../data/staging/svg/' + outputFileName, d3n.svgString(), function(err, res) {
		if (err)
			throw err
		
		if (outFileIndex % 100 === 0)
			console.log('...' + outputFileName + ' saved')
		
		if (callback)
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
	
	//~console.time('updateSVG')
	
	// update panels content
	
	$timestamp.text(formatTimestamp(metadata.timestamp))
// temp	
	//~$timestamp.text('file ' + fileIndex + ' - slice ' + sliceCounter() + ' ' + formatTimestamp(metadata.timestamp))
	
	let fr = frameRate()
		, speed = (fr === 120? '1/4' : fr === 60? '1/2' : fr === 15? '2' : '1') + 'x'

	$speed.text(speed)
	
	// countagion statistics
	
	$infectionCount.text(d3.format(",.0d")(metadata.infectionCount))
	$commentCount.text(d3.format(",.0d")(metadata.commentCount))
	$infectionRate.text(d3.format(".2%")(metadata.infectionCount / metadata.commentCount))
	
	$top10.html('')
	
	d3Graph.mostDangerous.forEach( (infector, i) => {
		
		$top10.append('text')
		  .text(infector.count)
		  .attr('class', 'metric')
		  .attr('x', 0)
		  .attr('y', (2.2 * i ) + 'em')
		
		$top10.append('text')
		  .text(infector.n)
		  .attr('x', 10)
		  .attr('y', (2.2 * i ) + 'em')
		  
   })
	
	//~console.log('Update graph image...')
		
	const minX = d3.min(d3Graph.nodes, function(d) { return d.x})
		, minY = d3.min(d3Graph.nodes, function(d) { return d.y})
		, maxX = d3.max(d3Graph.nodes, function(d) { return d.x})
		, maxY = d3.max(d3Graph.nodes, function(d) { return d.y})

//~console.log( 'min max X', minX, maxX)
//~console.log( 'min max Y', minY, maxY)

	xScale.domain([Math.min(minX, minY), Math.max(maxX, maxY)])
	yScale.domain([Math.min(minX, minY), Math.max(maxX, maxY)])
	
	radius.domain(d3.extent(d3Graph.nodes, d => d.inDegree))
	
	color.domain([10, fileIndex])


	let $nodeSelection = $node.selectAll('.node')
		  .data(d3Graph.nodes, d => d.key)
		  //~.data(d3Graph.nodes.slice(0, 100000), d => d.key)
    
	$linkSelection = $link.selectAll('.link')
	  .data(d3Graph.edges, d => d.key)
	  
		
	$nodeSelection.exit()
	  .remove()

	$linkSelection.exit()
	  .remove()
	
	if(fileCount() === 1) {
		let transitionInterval

		const t = svg.transition().duration(1000)
					.ease(d3.easePolyInOut) 
					.on('start', function() {
						//~console.log('transition start')
						transitionInterval = setInterval(saveSVG, 1000 / frameRate()) 
					})
					
		$nodeSelection.enter()
		  .append('circle')
			.attr('class', 'node')
			  .attr('cx', d => xScale(d.x))
			  .attr('cy', d => yScale(d.y))
			.attr('r', 3)
			.attr('opacity', 0)
			.attr('fill', d => d.infectionAge? d.infectionAge === 12 ? patient0Color : color(d.infectionAge) : saneColor)
			.style('stroke', d => d.infectionAge && d.infectionAge === 12 ? whiteLike : 'black')
			.style('stroke-width', d => d.infectionAge && d.infectionAge === 12 ? '1.5px' : '.5px')
			.transition(t)
			  .attr('r', (d, i) =>  { return radius(d.inDegree)})
			  .attr('opacity', 1)

		// update selection
		$nodeSelection.transition(t)
		  .attr('r', (d, i) =>  { return radius(d.inDegree)})
		  .attr('cx', d => xScale(d.x))
		  .attr('cy', d => yScale(d.y))
		  .attr('fill', d => d.infectionAge? d.infectionAge === 12 ? patient0Color : color(d.infectionAge) : saneColor)
		  .attr('opacity', 1)

		
		$linkSelection.enter()
		  .append('path')
			.attr('class', 'link')
			.attr('d', (d, i) => {
				try {
					let dx = xScale(d3Graph.nodes[d.target].x) - yScale(d3Graph.nodes[d.source].x)
						  , dy = yScale(d3Graph.nodes[d.target].y) - yScale(d3Graph.nodes[d.source].y)
						  , dr = Math.sqrt(dx * dx + dy * dy)
						  , sweep = i%2 === 0 ? 0 : 1
						  
					return 'M' + xScale(d3Graph.nodes[d.source].x) + ',' + yScale(d3Graph.nodes[d.source].y) + 'A' + dr + ',' + dr + ' 0 0,' + sweep + ' ' + xScale(d3Graph.nodes[d.target].x) + ',' + yScale(d3Graph.nodes[d.target].y)
					  
					  
				}
				catch(e) {
					console.log('missing source', d.source)  
					throw e
				}
			})
			.style('stroke',  d => d3Graph.nodes[d.source].infectionAge? color(d3Graph.nodes[d.source].infectionAge) : saneColor)
			.style('opacity', 0)
			.transition(t).delay(500)
			  .style('opacity', 1)
		  
		// update selection
		$linkSelection.transition(t)
		  .attr('d', (d, i) => {
			  try {
				let dx = xScale(d3Graph.nodes[d.target].x) - yScale(d3Graph.nodes[d.source].x)
					  , dy = yScale(d3Graph.nodes[d.target].y) - yScale(d3Graph.nodes[d.source].y)
					  , dr = Math.sqrt(dx * dx + dy * dy)
					  , sweep = i%2 === 0 ? 0 : 1
					  
				  return 'M' + xScale(d3Graph.nodes[d.source].x) + ',' + yScale(d3Graph.nodes[d.source].y) + 'A' + dr + ',' + dr + ' 0 0,' + sweep + ' ' + xScale(d3Graph.nodes[d.target].x) + ',' + yScale(d3Graph.nodes[d.target].y)
				  
				  
			  }
			  catch(e) {
				console.log('missing source', d.source)  
				throw e
			  }
		  })
		  .style('stroke',  d => d3Graph.nodes[d.source].infectionAge? color(d3Graph.nodes[d.source].infectionAge) : saneColor)
		  .style('opacity', 1)
				  
		//~console.log('... done')
		
		//~console.timeEnd('updateSVG')
		t.on('end', function() {
			//~console.log('transition end')
			if (transitionInterval)
				clearInterval(transitionInterval)
			callback()
		})
		
	}
	else {
	// the updated data groups multiple files, only generate one frame, no d3 transition
	console.log('no transition')
		$nodeSelection.enter()
		  .append('circle')
			.attr('class', 'node')
			.style('stroke', d => d.infectionAge && d.infectionAge === 12 ? whiteLike : 'black')
			.style('stroke-width', d => d.infectionAge && d.infectionAge === 12 ? '1.5px' : '.5px')

		// update selection
		$nodeSelection
		  .attr('r', (d, i) =>  { return radius(d.inDegree)})
		  .attr('cx', d => xScale(d.x))
		  .attr('cy', d => yScale(d.y))
		  .attr('fill', d => d.infectionAge? d.infectionAge === 12 ? patient0Color : color(d.infectionAge) : saneColor)

		
		$linkSelection.enter()
		  .append('path')
			.attr('class', 'link')
		  
		// update selection
		$linkSelection
		  .attr('d', (d, i) => {
			  try {
				let dx = xScale(d3Graph.nodes[d.target].x) - yScale(d3Graph.nodes[d.source].x)
					  , dy = yScale(d3Graph.nodes[d.target].y) - yScale(d3Graph.nodes[d.source].y)
					  , dr = Math.sqrt(dx * dx + dy * dy)
					  , sweep = i%2 === 0 ? 0 : 1
					  
				  return 'M' + xScale(d3Graph.nodes[d.source].x) + ',' + yScale(d3Graph.nodes[d.source].y) + 'A' + dr + ',' + dr + ' 0 0,' + sweep + ' ' + xScale(d3Graph.nodes[d.target].x) + ',' + yScale(d3Graph.nodes[d.target].y)
				  
				  
			  }
			  catch(e) {
				console.log('missing source', d.source)  
				throw e
			  }
		  })
		  .style('stroke',  d => d3Graph.nodes[d.source].infectionAge? color(d3Graph.nodes[d.source].infectionAge) : saneColor)
		  
		saveSVG(function(err, res) {
			callback()
		})
	}

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
