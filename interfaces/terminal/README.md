# AEGIS Terminal UI

This folder now contains the terminal UI implementation separated from `aegis-core`.

The core package no longer starts the Ink-based UI by default. `npm run dev` and normal `aegis` core execution now run without the terminal UI.

When the dedicated `aegis terminal` command or UI integration is implemented later, this is the intended place for the interface code.
