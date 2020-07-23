const config = {
	gitUrl: {
		title: 'Git URL',
		description: 'URL of git repo.',
		type: 'string',
		default: '',
	},
	commitMessage: {
		title: 'Commit Message',
		description: 'Backup commit message.',
		type: 'string',
		default: 'Sync Settings Update',
	},
}

function displayOrder (obj) {
	let order = 1
	for (const name in obj) {
		obj[name].order = order++
		if (obj[name].type === 'object' && 'properties' in obj[name]) {
			displayOrder(obj[name].properties)
		}
	}
}
displayOrder(config)

module.exports = {
	config,
}
