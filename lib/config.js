const config = {
	folderPath: {
		title: 'Folder Path',
		description: 'Absolute path to the backup folder.',
		type: 'string',
		default: '',
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
