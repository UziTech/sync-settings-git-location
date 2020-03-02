const git = require('../lib/git')

describe('sync-settings', () => {
	beforeEach(async () => {
		atom.config.set('sync-settings.useOtherLocation', true)
		atom.config.set('sync-settings.checkForUpdatedBackup', false)
		await atom.packages.activatePackage('sync-settings-git-location')
		// load sync-settings
		const pkg = await atom.packages.activatePackage('sync-settings')
		await pkg.mainModule.activationPromise
	})

	it('uses the git', async () => {
		spyOn(git, 'get')
		await atom.commands.dispatch(atom.views.getView(atom.workspace), 'sync-settings:check-backup')
		expect(git.get).toHaveBeenCalled()
	})
})
