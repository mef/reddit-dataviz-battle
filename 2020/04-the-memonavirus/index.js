const extract = require('./extract')
	, transform = require('./transform')


// retrieve contents from source data git repository
extract(function(err, path) {

	if(err) {
		console.error('error getting source data')
		throw err
	}
	else {
		
		// process source data
		transform(path)
		
	}
})
