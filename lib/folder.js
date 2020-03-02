const path = require('path')
const fs = require('fs-extra')
const InputView = require('./views/input-view')

async function invalidFolderPath (invalidPath) {
	let resolveFn
	let rejectFn
	const promise = new Promise((resolve, reject) => {
		resolveFn = resolve
		rejectFn = reject
	})
	let rejectOnDismiss = true

	const notification = atom.notifications.addError(invalidPath ? 'Invalid Folder Path' : 'No Folder Path', {
		description: invalidPath
			? `Invalid Folder Path: \`${invalidPath}\``
			: 'No Folder Path found in settings',
		dismissable: true,
		buttons: [{
			text: 'Enter Folder Path',
			async onDidClick () {
				rejectOnDismiss = false
				notification.dismiss()
				const inputView = new InputView({
					title: 'Enter Folder Path',
					description: 'Enter an absolute path to the folder where you want to store your backup.',
					placeholder: 'Folder Path',
					value: invalidPath,
				})
				const folderPath = await inputView.getInput()
				if (folderPath) {
					atom.config.set('sync-settings-folder-location.folderPath', folderPath)
					resolveFn(folderPath)
				}
				rejectFn()
			},
		}, {
			text: 'Package settings',
			onDidClick () {
				notification.dismiss()
				atom.workspace.open('atom://config/packages/sync-settings-folder-location')
			},
		}],
	})
	notification.onDidDismiss(() => {
		if (rejectOnDismiss) {
			rejectFn()
		}
	})

	return promise
}

async function getFolderPath (allowEmpty) {
	let folderPath = atom.config.get('sync-settings-folder-location.folderPath')
	if (folderPath) {
		return folderPath.trim()
	}

	if (allowEmpty) {
		return ''
	}

	folderPath = await invalidFolderPath()
	if (folderPath) {
		return folderPath.trim()
	}
}

async function displayError (error, action, retryFn, folderPath) {
	try {
		console.error(`Error ${action}:`, error)
		atom.notifications.addError(`Sync-Settings: Error ${action}`, {
			dismissable: true,
			detail: error.message,
		})
		throw error
	} catch (err) {
		if (err) {
			throw err
		}
	}
}

async function readAllFiles (root, dir, files = {}) {
	const fileNames = await fs.readdir(dir)
	for (const fileName of fileNames) {
		if (fileName === '.git') {
			continue
		}
		const filePath = path.join(dir, fileName)
		const stats = await fs.stat(filePath)
		if (stats.isDirectory()) {
			await readAllFiles(root, filePath, files)
		} else {
			const fileName = path.relative(root, filePath)
			files[fileName] = {
				content: await fs.readFile(filePath, { encoding: 'utf8' }),
			}
		}
	}
	return files
}

module.exports = {
	/**
	 * Get URL for backup
	 * @return {string} Backup URL
	 */
	async getUrl () {
		return getFolderPath(true)
	},

	/**
	 * Create new backup location
	 * @return {Promise} Returns empty object on success. `undefined` on silent error
	 */
	async create () {
		let folderPath
		try {
			folderPath = await getFolderPath()
			await fs.mkdirp(folderPath)

			return {}
		} catch (err) {
			if (err) {
				return displayError(err, 'creating backup', () => this.create(), folderPath)
			}
		}
	},

	/**
	 * Get backup files and time
	 * @return {Promise} Returns object with `files` and `time` on success. `undefined` on silent error
	 */
	async get () {
		let folderPath
		try {
			folderPath = await getFolderPath()

			const files = await readAllFiles(folderPath, folderPath)
			const stats = await fs.stat(folderPath)
			const time = new Date(stats.mtime).toISOString()

			return { files, time }
		} catch (err) {
			if (err) {
				return displayError(err, 'getting backup', () => this.get(), folderPath)
			}
		}
	},

	/**
	 * Delete backup
	 * @return {Promise} Returns empty object on success. `undefined` on silent error
	 */
	async delete () {
		let folderPath
		try {
			folderPath = await getFolderPath()
			await fs.remove(folderPath)

			atom.config.unset('sync-settings-folder-location.folderPath')

			return {}
		} catch (err) {
			if (err) {
				return displayError(err, 'deleting backup', () => this.delete(), folderPath)
			}
		}
	},

	/**
	 * Update backup and get time
	 * @param  {object[]} files [description]
	 * @return {Promise} Returns object with `time` on success. `undefined` on silent error
	 */
	async update (files) {
		let folderPath
		try {
			folderPath = await getFolderPath()

			for (const file in files) {
				if (file.startsWith('..')) {
					throw new Error(`Invalid file name: '${file}'`)
				}
				const { content } = files[file]
				const filePath = path.join(folderPath, file)
				if (content) {
					await fs.outputFile(filePath, content)
				} else {
					await fs.unlink(filePath)
				}
			}

			const stats = await fs.stat(folderPath)
			const time = new Date(stats.mtime).toISOString()

			return { time }
		} catch (err) {
			if (err) {
				return displayError(err, 'updating backup', () => this.update(files), folderPath)
			}
		}
	},

	/**
	 * Fork backup
	 * @return {Promise} Returns empty object on success. `undefined` on silent error
	 */
	async fork () {
		let forkFolderPath
		try {
			const folderPath = await getFolderPath(true)

			let inputView = new InputView({
				title: 'Fork Backup Folder',
				description: 'Enter the absolute path to the backup that you want to copy.',
				placeholder: 'Path to Copy',
				value: folderPath,
			})
			forkFolderPath = await inputView.getInput()
			if (!forkFolderPath) {
				return
			}

			inputView = new InputView({
				title: 'Fork Backup Folder',
				description: 'Enter the absolute path to the new backup.',
				placeholder: 'Backup Path',
				value: folderPath,
			})
			const newFolderPath = await inputView.getInput()
			if (!newFolderPath) {
				return
			}

			await fs.copy(forkFolderPath, newFolderPath)

			atom.config.set('sync-settings-folder-location.folderPath', newFolderPath)

			return {}
		} catch (err) {
			if (err) {
				return displayError(err, 'forking backup', () => this.create(), forkFolderPath)
			}
		}
	},
}
