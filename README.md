# Sync Atom settings to a git repo

[![CI](https://github.com/UziTech/sync-settings-git-location/workflows/CI/badge.svg)](https://github.com/UziTech/sync-settings-git-location/actions)

Synchronize settings, keymaps, user styles, init script, snippets and installed packages across [Atom](https://atom.io) instances to git repository.

## Installation

This is a service package for [Sync-Settings](https://atom.io/packages/sync-settings). You will need Sync-Settings installed for this package to do anything.

1. Install [Sync-Settings](https://atom.io/packages/sync-settings).
2. Install [Sync-Settings-git-location](https://atom.io/packages/sync-settings-git-location).
3. Go To the Sync-Settings [settings page](atom://config/packages/sync-settings).
4. Check `Use Other Backup Location`.
5. Create a [new repository](https://github.com/new). We recommend making it **private**.
6. Enter the url in the `Git URL` setting on the `sync-settings-git-location` [settings page](atom://config/packages/sync-settings-git-location)
7. Run command `sync-settings:backup` to backup your settings.
