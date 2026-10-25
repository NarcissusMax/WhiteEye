# Run WhiteEye on this computer

Open **http://127.0.0.1:8000/**. The current website, three appearance choices, conversation UI and
both courses run from `/home/narmexis/Projects/WhiteEye/website`.

## Start and stop

The enabled user service starts at login and continues after the terminal is closed.

```sh
systemctl --user start whiteeye.service
systemctl --user stop whiteeye.service
systemctl --user restart whiteeye.service
systemctl --user status whiteeye.service
```

To see recent server output:

```sh
journalctl --user -u whiteeye.service -n 40 --no-pager
```

## Run manually

Stop the service to free port 8000, then start the current project:

```sh
systemctl --user stop whiteeye.service
cd /home/narmexis/Projects/WhiteEye/website
npm start
```

Leave the terminal open. Press Ctrl+C to stop. To return to the background service:

```sh
systemctl --user start whiteeye.service
```

For a second independent server while the service is running:

```sh
cd /home/narmexis/Projects/WhiteEye/website
PORT=8001 npm start
```

Open http://127.0.0.1:8001/ for that copy. A different port is a different browser origin, so chats
and appearance preferences saved on port 8000 will not appear there.

## Configuration and data

The local `.env` file contains the model configuration copied from your existing local WhiteEye.
It is ignored by Git, has owner-only permissions, and stays on this computer. Edit it locally and
restart the server to change the model or provider. The Node launcher uses the same backend as the
hosted website and requires an HTTPS model-provider URL. Chat still uses the configured online
provider; serving the site locally does not install a local language model.

`PORT` defaults to 8000. `WHITEEYE_ENV_FILE` can select another configuration file. The server
binds to 127.0.0.1 and can also be visited through http://localhost:8000/. Use the same address each
time to keep the same browser chats and preferences.

Course progress and notes are stored in `/home/narmexis/Projects/WhiteEye/data/local/course.sqlite`, independently of
the hosted site's database. `WHITEEYE_DATA_DIR=../data/local` selects the project data directory. Relative values are
resolved from the website directory; `XDG_STATE_HOME` controls the fallback location when no override is set. Stop the service before making a file copy of that directory for
backup. Keep the browser profile and its cookies too: those identify the learner whose course
progress is in the database. Chats and appearance choices are stored in the browser. Markdown
chat export remains available from the interface.

`npm start` rebuilds the current assets and backend, then runs `scripts/serve-local.mjs`. The
systemd service performs the same build on startup. Restart after changing source files. The
launcher forwards response streams, cookies, request cancellation and course database operations.
The short-lived QA preview script remains separate and is not used for persistent local hosting.

## Fresh checkout

This machine already has the required Node.js and installed packages. A fresh copy needs a Node
version with `node:sqlite` and `process.loadEnvFile` support, this repository's private source index
files, and these commands:

```sh
cd /path/to/whiteeye-sites-source
npm ci
cp .env.example .env
# Edit .env locally with your provider settings.
npm start
```

The installation here was verified with Node v26.11.1. The public deployment archive alone is not
the source checkout used by these build commands.

## Previous local installation

The previous `/home/narmexis/Projects/WhiteEye/archive/whiteeye-app` source and configuration remain available. Its original
service file was saved at:

`/home/narmexis/Projects/WhiteEye/operations/systemd/whiteeye.service.before-sites-source-20261016`

To restore that launcher:

```sh
systemctl --user stop whiteeye.service
cp /home/narmexis/Projects/WhiteEye/operations/systemd/whiteeye.service.before-sites-source-20261016 ~/.config/systemd/user/whiteeye.service
systemctl --user daemon-reload
systemctl --user start whiteeye.service
```

These local hosting changes do not require redeploying the hosted website.
