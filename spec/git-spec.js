const path = require('path')
const os = require('os')
const fs = require('fs-extra')
const git = require('../lib/git')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

describe('git', () => {
	beforeEach(async () => {
		const gitUrl = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-settings-git-bare-repo-'))
		await exec('git init --bare', { cwd: gitUrl })
		atom.config.set('sync-settings-git-location.gitUrl', gitUrl)
	})

	afterEach(async () => {
		const gitUrl = atom.config.get('sync-settings-git-location.gitUrl')
		if (gitUrl) {
			await fs.remove(gitUrl)
		}
	})

	it('returns correct properties', async () => {
		const data = await git.get()
		expect(Object.keys(data.files).length).toBe(0)
		const data2 = await git.update({
			'init.coffee': {
				content: '# init',
			},
		})
		expect(data2).toEqual({
			time: jasmine.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\dZ$/),
		})
		const data3 = await git.get()
		expect(data3).toEqual({
			files: {
				'init.coffee': jasmine.objectContaining({
					content: '# init',
				}),
			},
			time: jasmine.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\dZ$/),
		})
	})

	it('add, get, delete files in a directory', async () => {
		await git.update({
			'dir\\test.txt': {
				content: 'test',
			},
		})

		const data = await git.get()
		expect(data.files).toEqual(jasmine.objectContaining({
			'dir\\test.txt': jasmine.objectContaining({
				content: 'test',
			}),
		}))

		await git.update({
			'dir\\test.txt': {
				content: '',
			},
		})

		const data2 = await git.get()
		expect(data2.files).toEqual({})
	})

	xit('creates a git', async () => {
		// TODO:
	})

	xit('deletes the git repo', async () => {
		// TODO:
	})

	xit('forks a git repo', async () => {
		// TODO:
	})
})
