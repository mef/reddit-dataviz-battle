const fs = require('fs')

let commentFiles = []
	, infectionFiles = []


function listFiles(path) {
	
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
			
			//~processComments()
		}
	})
	
}

function processComments() {
	
}


function transform(path) {

	console.log(' ')	
	console.log('-----------------------------------------------------')	
	console.log('Starting data transformation...')
	
	listFiles(path + '/data')
}

module.exports = transform
