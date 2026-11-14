# Xenity — Operating System

A working, light operating-system interface that runs in the browser. Not a mockup:
the window server, shell, file system, accounts, network, package store and
Passwords vault are all real.

**Open the preview.** The first boot asks you to create an account (name, user
name, password) and afterwards starts at the login screen; everything is stored on
this machine only.

## What's inside

| App | What it does |
| --- | --- |
| **Files** | Browse Xenity Drive (`/Users/xenity`, `/Applications`, `/System`). Create, rename and delete files and folders; double-click a text file to edit it. |
| **Terminal** | A real shell over the same file system with ~60 commands: `ls, cd, pwd, cat, head, tail, wc, grep, find, sort, uniq, touch, mkdir, rmdir, rm, mv, cp, ln, chmod, stat, du, df, tree, ps, top, free, kill, env, export, unset, which, man, history, echo, date, cal, uptime, whoami, id, uname, hostname, open, apps, pkg, apt, flatpak, wifi, ip, ping, curl, update, neofetch, passwd, lock, screensaver, nuke, sudo, reboot, shutdown, exit`. Supports `>` and `>>`. |
| **Xenity Browser** | Tabbed browser with a start page, shortcuts and its own `xenity://` pages. Typing a query runs a real search page: web engines open in a new tab, and the same query searches your apps, files and settings. External sites load in a sandboxed frame, with an "open in a new tab" affordance. A key button saves and copies website logins for the current site. |
| **Xenity Store** | Two catalogues: Xenity apps, and **Flathub**. A Flatpak install writes its ref, runtime and desktop entry to `/Applications`, and the app appears in the Dock and Launchpad. Same thing from the shell: `flatpak install org.mozilla.firefox`. |
| **Passwords** | Website and Wi-Fi logins. Locked behind your account password every time you open it; reveal, copy, edit and delete entries. |
| **Settings** | Appearance (theme, accent, six wallpapers, reduce motion), Display (brightness, Night Shift, screen saver and idle), Sound (alert volume, mute), Wi-Fi & Network, Account (name and password change, lock now), Startup apps, Date & Time, Storage (with **Nuke all**), Updates and About (with the ISO download). |
| **Notes / Calculator / Weather** | Installed from the Store, fully working. |

## Account, lock screen and screen saver

- First run: create an account. The password is stored as a salted SHA-256 hash
  in localStorage — never in plain text.
- Every start (and every restart) stops at the login screen with your profile
  icon. Change the password in Settings → Account.
- Idle for the configured time (30 minutes by default) and the screen saver
  appears; waking requires the password unless you turn that off in
  Settings → Display.

## Wi-Fi

Settings → Wi-Fi & Network (or the menu-bar Wi-Fi icon) lists the machine's
networks. Joining a WPA2 network asks for its password, saves the network for
automatic reconnection on the next boot, and files the password in the Passwords
app. You can also join a hidden network by name.

## How updates treat your data

On every boot the updater compares the installed version with the running one and
removes **only Xenity's own old artefacts**:

- `/var/cache/xenity-<old version>` directories on Xenity Drive,
- `xenity.system.cache.*` keys in browser storage.

Your files, settings, packages, Flatpaks, passwords and networks are never read
for deletion. The one thing that clears them is **Settings → Storage → Nuke all**,
which resets the machine to a clean Xenity and keeps the system, the default apps
and your account.

## The disc image

Settings → About → **Download ISO** (or the Xenity menu) writes a real ISO 9660
image in the browser — about 58 KB, volume label `XENITY`. It carries an El
Torito boot record and a 16-bit boot loader, so it boots on BIOS machines and in
virtual machines (verified with QEMU) to the Xenity boot banner, alongside
`XENITY.HTM` (the launcher) and `README.TXT`. The desktop itself runs from the web
build, so the disc carries the boot loader and launcher, not a Linux kernel.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Vite + React, no backend, no database, no credentials. Everything persists in the
browser's localStorage on the machine you use it on.
