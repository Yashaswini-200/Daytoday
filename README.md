# Daytoday

A lightweight, calendar-first monthly habit tracker built with plain HTML, CSS, and JavaScript.

## Run locally

Open `index.html` in a browser, or serve the project folder with:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.

Habit check-ins, personal habit definitions, target snapshots, junk-food occasions, and theme preference are saved in that browser's local storage. They are not synced between browsers or devices. Built-in habit defaults are kept separately in `habit-defaults.js`; use **Manage your habits** in the dashboard to add, edit, reorder, or deactivate personal habits without editing source files. Deactivation preserves dated records. Each habit has three states: not recorded, completed (1 point), and not completed (0 points). The monthly grid shows each habit across the dates of the selected month; click a cell to cycle its status or select a date to open its compact details. Target and habit snapshots remain attached to historical check-ins when definitions change. Junk-food occasions are capped at two per month in the display, while additional records remain allowed and are clearly flagged. Older study-journal and spending data in local storage are retained for compatibility but are no longer shown or changed by the dashboard.

The current storage is intentionally browser-local and single-user. Records are specific to this browser and device, are not synced elsewhere, and may be lost if the browser's site data is cleared. The defaults and personal configuration are separate so a later account-backed storage adapter can scope user settings and records without changing the habit definitions or dashboard rendering.

## Deploy

This is a static site and does not require a build step. Import the repository into Vercel, leave the framework preset as **Other**, and use the repository root as the project root. No build command or output directory is needed; Vercel serves `index.html`. Subsequent pushes to the connected branch trigger deployments.