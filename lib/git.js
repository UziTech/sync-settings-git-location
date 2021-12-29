const { shell } = require('electron')
const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const { exec } = require('child_process')
const { InputView } = require('atom-modal-views')

async function invalidGitUrl (invalidUrl, message = '', description = '') {
	let resolveFn
	let rejectFn
	const promise = new Promise((resolve, reject) => {
		resolveFn = resolve
		rejectFn = reject
	})
	let rejectOnDismiss = true

	const notification = atom.notifications.addError(message || (invalidUrl ? 'Invalid Git URL' : 'No Git URL'), {
		description: description || (invalidUrl
			? `Invalid URL: \`${invalidUrl}\``
			: 'No Git URL found in settings'),
		dismissable: true,
		buttons: [{
			text: 'Enter Git URL',
			async onDidClick () {
				rejectOnDismiss = false
				notification.dismiss()
				const inputView = new InputView({
					title: 'Enter Git URL',
					description: 'You can create a new git repo at [GitHub.com/new](https://github.com/new). You should create a private repo.',
					placeholder: 'Git URL',
					value: invalidUrl,
				})
				const gitUrl = await inputView.getInput()
				if (gitUrl) {
					atom.config.set('sync-settings-git-location.gitUrl', gitUrl)
					resolveFn(gitUrl)
				}
				rejectFn()
			},
		}, {
			text: 'Package settings',
			onDidClick () {
				notification.dismiss()
				atom.workspace.open('atom://config/packages/sync-settings-git-location')
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

async function invalidGitBranch (invalidUrl) {
	let resolveFn
	let rejectFn
	const promise = new Promise((resolve, reject) => {
		resolveFn = resolve
		rejectFn = reject
	})
	let rejectOnDismiss = true

	const notification = atom.notifications.addError((invalidUrl ? 'Invalid Git Branch' : 'No Git Branch'), {
		description: (invalidUrl
			? `Invalid Branch: \`${invalidUrl}\``
			: 'No Git branch found in settings'),
		dismissable: true,
		buttons: [{
			text: 'Enter Git Branch',
			async onDidClick () {
				rejectOnDismiss = false
				notification.dismiss()
				const inputView = new InputView({
					title: 'Enter Git Branch',
					description: 'Branch should already exist.',
					placeholder: 'Git Branch',
					value: invalidUrl,
				})
				const gitUrl = await inputView.getInput()
				if (gitUrl) {
					atom.config.set('sync-settings-git-location.gitBranch', gitUrl)
					resolveFn(gitUrl)
				}
				rejectFn()
			},
		}, {
			text: 'Package settings',
			onDidClick () {
				notification.dismiss()
				atom.workspace.open('atom://config/packages/sync-settings-git-location')
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

async function getGitUrl (allowEmpty) {
	let gitUrl = atom.config.get('sync-settings-git-location.gitUrl')
	if (gitUrl) {
		return gitUrl.trim()
	}

	if (allowEmpty) {
		return ''
	}

	gitUrl = await invalidGitUrl()
	if (gitUrl) {
		return gitUrl.trim()
	}
}

async function getGitCreateUrl () {
	const gitCreateUrl = atom.config.get('sync-settings-git-location.gitCreateUrl')
	if (gitCreateUrl) {
		return gitCreateUrl.trim()
	}
	return 'https://github.com/new'
}

async function getGitBranch () {
	const gitBranch = atom.config.get('sync-settings-git-location.gitBranch')
	if (gitBranch) {
		try {
			await git(`check-ref-format refs/heads/${gitBranch}`)
			return gitBranch.trim()
		} catch (ex) {
			atom.notifications.addWarning(`Sync-Settings: Defaulting to main branch`, {
				dismissable: true,
				detail: 'You have invalid branch name set in settings, sync-settings is defaulting to main branch.',
			})
		}
	} else {
		atom.notifications.addWarning(`Sync-Settings: Defaulting to main branch`, {
			dismissable: true,
			detail: 'You have invalid branch name set in settings, sync-settings is defaulting to main branch.',
		})
	}
	return 'main'
}

async function displayError (error, action, retryFn, gitUrl, gitBranch) {
	try {
		console.error(`Error ${action}:`, error)

		if (['remote branch', 'could not find remote branch'].some(e => error.message.toLowerCase().includes(e))) {
			await invalidGitBranch(gitBranch)
			return await retryFn()
		}

		if (['not found', 'does not exist'].some(e => error.message.toLowerCase().includes(e))) {
			await invalidGitUrl(gitUrl)
			return await retryFn()
		}

		if (error.message.toLowerCase().includes('could not resolve host')) {
			await invalidGitUrl(gitUrl, 'Are you off line?', `Cannot connect to \`${gitUrl}\`.`)
			return await retryFn()
		}

		atom.notifications.addError(`Sync-Settings: Error ${action}`, {
			dismissable: true,
			detail: error.message,
		})
		// throw error
	} catch (err) {
		if (err) {
			throw err
		}
	}
}

async function cloneToLocalRepo (gitUrl, gitBranch) {
	const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-settings-git-clone-'))
	const env = {
		...process.env,
		GIT_TERMINAL_PROMPT: '0',
	}
	try {
		await git(`clone --branch ${gitBranch} --depth 1 ${gitUrl} .`, repoPath, '', { env })
	} catch (ex) {
		if (ex.message && ex.message.includes('fatal: Cannot prompt because terminal prompts have been disabled.')) {
			throw new Error(`Cannot connect to the repo. Try running \`git clone --depth 1 ${gitUrl}\` in a terminal and follow the prompts to authenticate.`)
		}
		throw ex
	}
	return repoPath
}

async function getLogTime (repoPath) {
	try {
		const logTime = await git('log -1 --format=%ct', repoPath)
		return new Date(parseInt(`${logTime.trim()}000`, 10)).toISOString()
	} catch (err) {
		if (err.message.includes('does not have any commits yet')) {
			return ''
		}
		throw err
	}
}

async function git (cmd, repoPath, stdin = '', opts = {}) {
	return new Promise((resolve, reject) => {
		const proc = exec(`git ${cmd}`, { cwd: repoPath, ...opts }, (err, stdout, stderr) => {
			if (err) return reject(err)
			resolve(stdout)
		})

		if (stdin) {
			proc.stdin.write(stdin)
		}
		proc.stdin.end()
	})
}

async function readAllFiles (root, dir = root, files = {}) {
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
			const relativePath = path.relative(root, filePath).replace(/\//g, '\\')
			files[relativePath] = {
				content: await fs.readFile(filePath),
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
		return getGitUrl(true)
	},

	/**
	 * Create new backup location
	 * @return {Promise} Returns empty object on success. `undefined` on silent error
	 */
	async create () {
		// TODO: use octokit?
		let gitCreateUrl
		try {
			gitCreateUrl = await getGitCreateUrl()
			shell.openExternal(gitCreateUrl)
		}
		catch (err) {
			if (err) {
				return displayError(err, 'creating backup', () => this.get(), gitCreateUrl)
			}
		}

	},

	/**
	 * Get backup files and time
	 * @return {Promise} Returns object with `files` and `time` on success. `undefined` on silent error
	 */
	async get () {
		let gitUrl, repoPath, gitBranch
		try {
			gitUrl = await getGitUrl()
			gitBranch = await getGitBranch()
			const repoPath = await cloneToLocalRepo(gitUrl, gitBranch)

			const files = await readAllFiles(repoPath)
			const time = await getLogTime(repoPath)

			return { files, time }
		} catch (err) {
			if (err) {
				return displayError(err, 'getting backup', () => this.get(), gitUrl, gitBranch)
			}
		} finally {
			if (repoPath) {
				await fs.remove(repoPath)
			}
		}
	},

	/**
	 * Delete backup
	 * @return {Promise} Returns empty object on success. `undefined` on silent error
	 */
	async delete () {
		// TODO: use octokit?
		atom.notifications.addError('Sync-Settings: We cannot delete the repo. You will have to do it manually')
	},

	/**
	 * Update backup and get time
	 * @param  {object[]} files Files to update.
	 * @return {Promise} Returns object with `time` on success. `undefined` on silent error
	 */
	async update (files) {
		let gitUrl, repoPath, gitBranch
		try {
			gitUrl = await getGitUrl()
			gitBranch = await getGitBranch()
			const repoPath = await cloneToLocalRepo(gitUrl, gitBranch)

			for (const file in files) {
				const fileName = file.replace(/\\/g, '/')
				if (fileName.startsWith('../')) {
					throw new Error(`Invalid file name: '${file}'`)
				}
				const { content } = files[file]
				const filePath = path.resolve(repoPath, fileName)
				if (content) {
					await fs.outputFile(filePath, content)
				} else {
					await fs.unlink(filePath)
				}
			}

			await git('add .', repoPath)
			const clean = await git('diff --staged --quiet', repoPath).then(() => true, () => false)
			if (clean) {
				atom.notifications.addSuccess('Sync-Settings: Backup has not changed')
				return
			}

			let commitMessage = atom.config.get('sync-settings-git-location.commitMessage')
			const shouldPrompt = atom.config.get('sync-settings-git-location.commitMessagePrompt')

			if (shouldPrompt) {
				const inputView = new InputView({
					title: 'Enter Backup Commit Message',
					placeholder: 'Sync Settings Update',
					value: commitMessage,
				})
				const inputMessage = await inputView.getInput()
				if (typeof inputMessage === 'undefined') {
					throw new Error('Backup Canceled')
				}
				if (inputMessage) {
					commitMessage = inputMessage
				}
			}
			await git('commit --file=-', repoPath, commitMessage)
			await git('push', repoPath)
			const time = await getLogTime(repoPath)

			return { time }
		} catch (err) {
			if (err) {
				return displayError(err, 'updating backup', () => this.update(files), gitUrl, gitBranch)
			}
		} finally {
			if (repoPath) {
				await fs.remove(repoPath)
			}
		}
	},

	/**
	 * Fork backup
	 * @return {Promise} Returns empty object on success. `undefined` on silent error
	 */
	async fork () {
		// TODO: use octokit?
		atom.notifications.addError('Sync-Settings: We cannot fork a repo. You will have to do it manually')
	},
}
