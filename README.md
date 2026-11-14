# Xenity — Operating System

A working, light operating-system interface that runs in the browser. Not a mockup:
the window server, shell, file system, package store and settings are all real.

**Open the preview** and Xenity boots to the desktop. To take a copy away,
use **Settings → About → Download ISO** (or the Xenity menu → Download ISO…):
Xenity writes a real, mountable ISO 9660 disc image in the browser — about 46 KB,
holding the launcher page and the release notes.

## What's inside

| App | What it does |
| --- | --- |
| **Files** | Browse Xenity Drive (`/Users/xenity`, `/Applications`, `/System`). Create, rename and delete files and folders; double-click a text file to edit it. |
| **Terminal** | A real shell over the same file system: `ls, cd, pwd, cat, echo, touch, mkdir, rm, mv, cp, tree, df, open, pkg, update, neofetch, uname, whoami, history, man, clear, exit`. Supports `>` and `>>` redirection. |
| **Xenity Browser** | Tabbed browser with a start page, bookmarks, history and its own `xenity://` pages. External sites load in a sandboxed frame; sites that refuse embedding get an "open in a new tab" affordance. |
| **Xenity Store** | Install and remove Calculator, Notes and Weather — installed apps appear in the Dock and Launchpad. Same thing from the shell: `pkg install calculator`. |
| **Settings** | Appearance (light/dark, accent, four CSS wallpapers), account name, storage report, updates and about. |
| **Notes / Calculator / Weather** | Installed from the Store, fully working. |

## How updates treat your data

On every boot the updater compares the installed version with the running one and
removes **only Xenity's own old artefacts**:

- `/var/cache/xenity-<old version>` directories on Xenity Drive,
- `xenity.system.cache.*` keys in browser storage.

Your files, settings, packages and notes (`xenity.user.*`, `/Users/**`) are never
read for deletion. You can see the log in Settings → Updates, run it by hand with
`update` in the Terminal, or read `/var/log/update.log`.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Vite + React, no backend, no database, no credentials. Everything persists in the
browser's localStorage on the machine you use it on.
