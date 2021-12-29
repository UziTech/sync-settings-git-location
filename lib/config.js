const config = {
	gitCreateUrl: {
		title: 'Git Create URL',
		description: 'Custom URL to create git repo.',
		type: 'string',
		default: 'https://github.com/new',
	},
	gitUrl: {
		title: 'Git URL',
		description: 'URL of git repo.',
		type: 'string',
		default: '',
	},
	gitBranch: {
		title: 'Git Branch',
		description: 'Branch to store settings in.',
		type: 'string',
		default: 'main',
	},
	commitMessage: {
		title: 'Commit Message',
		description: 'Backup commit message.',
		type: 'string',
		default: 'Sync Settings Update',
	},
	commitMessagePrompt: {
		title: 'Prompt for Commit Message',
		description: 'Ask for the commit message on every backup.',
		type: 'boolean',
		default: false,
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
