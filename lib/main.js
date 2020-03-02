const { config } = require('./config')

module.exports = {
	config,

	provideLocationService () {
		return require('./git.js')
	},
}
