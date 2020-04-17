const fs = require('fs')
	, d3 = Object.assign({}, require('d3-selection'), require('d3-scale'), require('d3-array'), require('d3-scale-chromatic'))
	, D3Node = require('d3-node')
	, {DirectedGraph} = require('graphology')

const  transformSteps = [importGraph,  formatData, generateGraphImage, saveGraphImage]

let graphFile
	, graph = new DirectedGraph()
	, currentTransformStep = 0
	, graphData
	, graphImage
	, width = 6500
	, height = 6500
	, nodeMargin = 55
	, x = d3.scaleLinear()
		.range([nodeMargin, width - nodeMargin])
	, y = d3.scaleLinear()
		.range([nodeMargin, height - nodeMargin])
	//~, color = d3.scaleOrdinal(d3.schemeCategory10)
	
	
	const infectionStartDate = new Date('2020-03-20 20:00')
		, color = d3.scaleSequential(d3.interpolateYlOrBr) // color by number of days since outbreak start
		, defaultColor = '#ccc'
	
	let  d3n = new D3Node({styles:'.link {fill:none; stroke-width: 1}'})
		, chart = d3n.createSVG(width, height).append('g')


/****************************
 *
 * convert data to a format suitable for consumption by d3
 *
 *****************************/
function formatData() {
	
	
	console.log('Format data...')
	
	let res = {
			nodes: []
			, edges: []
		}
	
	graph.forEachNode((node, attributes) => {
		res.nodes.push({
			key: node
			, x: attributes.x
			, y: attributes.y
			//~, community: attributes.community
			, infectionDay: attributes.infection_ts? Math.floor((new Date(attributes.infection_ts).getTime() - infectionStartDate.getTime()) / (1000 * 3600 * 24)) : null
			//~, isInfected: 
			// TODO add red stroke when the node is infected
		})
		
	})
	
	//~graph.forEachEdge(function(edge, attributes, source, target) {
		//~let sourceIndex = res.nodes.findIndex(function(node, index){
			//~return node.key === source
		//~})
		//~let targetIndex = res.nodes.findIndex(function(node, index){
			//~return node.key === target
		//~})
		
		//~res.edges.push({
			//~key: source + '-' + target
			//~, source: sourceIndex
			//~, target: targetIndex
			//, color: 
			//~// TODO switch color according to whether the edge carried infection
		//~})
	//~})
	
	graphData = res

	console.log('... done')
	
	next()
}

/****************************
 *
 * Generate SVG
 *
 *****************************/
function generateGraphImage() {

	//~console.log(JSON.stringify(graph.toJSON(), null, '    '))
	
	console.log('Generate graph image...')
	
	let node = chart.append('g')
		.attr('id', 'nodes')
	
	let link = chart.append('g')
		.attr('id', 'links')
		.style('opacity', .3)
		
	const minX = d3.min(graphData.nodes, function(d) { return d.x})
		, minY = d3.min(graphData.nodes, function(d) { return d.y})
		, maxX = d3.max(graphData.nodes, function(d) { return d.x})
		, maxY = d3.max(graphData.nodes, function(d) { return d.y})

	x.domain([Math.min(minX, minY), Math.max(maxX, maxY)])
	y.domain([Math.min(minX, minY), Math.max(maxX, maxY)])
	
	color.domain([ Math.floor((new Date().getTime() - infectionStartDate.getTime()) / (1000 * 3600 * 24)) - 5 , 0])
	//color domain is offset by 3 in order to to get too light colors

	node.selectAll('.node')
		  .data(graphData.nodes, d => d.key)
		  //~.data(graphData.nodes.slice(0, 100000), d => d.key)
		  .enter()
		  .append('circle')
		    .attr('class', 'node')
		    .attr('r', '6')
		    .attr('cx', d => x(d.x))
		    .attr('cy', d => y(d.y))
		    //~.attr('fill', d => color(d.community))
		    .attr('fill', d => d.infectionDay? color(d.infectionDay) : defaultColor)

	//~link.selectAll('.link')
		//~.data(graphData.edges, d => d.key)
		//~.enter()
		//~.append('path')
			  //~.attr('class', 'link')
			  //~.attr('d', (d, i) => {

				  //~let dx = x(graphData.nodes[d.target].x) - y(graphData.nodes[d.source].x)
					  //~, dy = y(graphData.nodes[d.target].y) - y(graphData.nodes[d.source].y)
					  //~, dr = Math.sqrt(dx * dx + dy * dy)
				  
				  //~return 'M' + x(graphData.nodes[d.source].x) + ',' + y(graphData.nodes[d.source].y) + 'A' + dr + ',' + dr + ' 0 0,1 ' + x(graphData.nodes[d.target].x) + ',' + y(graphData.nodes[d.target].y)
			  //~})
			  //~.style('stroke',  d => color(graphData.nodes[d.source].community))
			  
	console.log('... done')
	
	next()

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
 * Export graph to a JSON file
 *
 *****************************/
function saveGraphImage() {

	//~console.log(JSON.stringify(graph.toJSON(), null, '    '))
	
	console.log('Save graph image file...')
	
	let fileName = 'infection-graph.svg'
	
	fs.writeFile(__dirname + '/../data/dist/' + fileName, d3n.svgString(), function(err, res) {
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
fs.readFile(__dirname + '/../data/staging/infection-graph.json', 'utf8', function(err, file) {
	if (err)
		throw err
		
	graphFile = JSON.parse(file)

	console.log(' ')
	console.log('-----------------------------------------------------')
	
	// launch first step
	next()
})
