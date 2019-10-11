const fs = require('fs')

module.exports = function saveFile(fileName, contents, destination) {
	
	//~console.log('saving file', fileName)
	
	destination = __dirname + '/' + (destination || '.')
	
	fs.writeFile(destination + '/' + fileName, contents, function(err, res) {
		if (err)
			throw err
		
	})
}
