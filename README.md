# Sync Atom settings to a local folder

![CI](https://github.com/UziTech/sync-settings-folder-location/workflows/CI/badge.svg)

Synchronize settings, keymaps, user styles, init script, snippets and installed packages across [Atom](https://atom.io) instances to local folder.

This may be useful for storing your backup in Google Drive or Dropbox.

## Installation

This is a service package for [Sync-Settings](https://atom.io/packages/sync-settings). You will need Sync-Settings installed for this package to do anything.

1. Install [Sync-Settings](https://atom.io/packages/sync-settings).
2. Install [Sync-Settings-folder-location](https://atom.io/packages/sync-settings-folder-location).
3. Go To the Sync-Settings [settings page](atom://config/packages/sync-settings).
4. Check `Use Other Backup Location`.
5. Run command `sync-settings:create-backup` to create the backup location.
5. Run command `sync-settings:backup` to backup your settings.
