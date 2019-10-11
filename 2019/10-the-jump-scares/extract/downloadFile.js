const request = require('request')

module.exports = function downloadFile(url, callback) {
	request.get(url, function(err, res, body) {
		
		if (err || res.statusCode !== 200) {
			console.log(res)
			console.log('error downloading file ' + url, res.statusCode)
			throw err
		}
		else {
			callback(null, body)
		}
	})
}
		
