const  exec = require('child_process').exec
	, tempy = require('tempy')


let repoRoot = tempy.directory()
	, repoUrl = 'https://github.com/dovedevic/memonavirus'
	
module.exports = function(callback) {
	
	console.log('-----------------------------------------------------')	
	console.log('Starting extraction of source data...')
	
	exec('git clone ' + repoUrl + ' ' + repoRoot, function(err, res) {
		
		console.log('... a copy of the data source repository has been stored in the following temporary folder:')
		console.log(repoRoot)
		

		return callback(err, repoRoot)

	})
}
