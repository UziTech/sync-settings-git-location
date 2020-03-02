const { createRunner } = require('atom-jasmine3-test-runner')

module.exports = createRunner({
	testPackages: ['sync-settings'],
})
