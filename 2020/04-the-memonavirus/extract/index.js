const exec = require('child_process').exec
	, fs = require('fs')
	, tempy = require('tempy')


let repoRoot = tempy.directory()
	, repoUrl = 'https://github.com/dovedevic/memonavirus'
	
console.log('-----------------------------------------------------')	
console.log('Starting extraction of source data...')

exec('git clone ' + repoUrl + ' ' + repoRoot, function(err, res) {
	
	fs.writeFile(__dirname + '/../data/metadata/datasourcePath', repoRoot, function(err, res) {
		
		if (err)
			throw err
		
		console.log('... a copy of the data source repository has been stored in the following temporary folder:')
		console.log(repoRoot)		
			
	})

})
