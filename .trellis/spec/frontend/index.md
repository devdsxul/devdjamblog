# Frontend Development Guidelines

> Concrete development standards and architectural conventions for DEVDJAM.

---

## Overview

DEVDJAM is a self-hosted retro Windows 98 music and beat blog built with WordPress (PHP 8.3), Vanilla JavaScript (ES2022), and modular CSS on top of `98.css`.

All frontend specifications in this directory are backed by the actual codebase patterns in `wp-content/themes/devdjam/` and `wp-content/plugins/devdjam-core/`.

---

## Guidelines Index

| Guide | Description | Status |
|---|---|---|
| [Directory Structure](./directory-structure.md) | File organization, theme templates, parts, views, and plugin boundaries | Complete |
| [Component Guidelines](./component-guidelines.md) | Win98 windows (`dj_window_*`), player deck, stickers, empty states, and accessibility | Complete |
| [Hook Guidelines](./hook-guidelines.md) | WordPress action/filter hooks and client-side lifecycle/event delegation | Complete |
| [State Management](./state-management.md) | Local storage preferences, session window states, in-memory audio queue, and SPA caching | Complete |
| [Quality Guidelines](./quality-guidelines.md) | Automated syntax verification (`npm run check`), retro constraints, and security review | Complete |
| [Type Safety & Sanitization](./type-safety.md) | Metadata schema typing, output escaping, audio validation, and JS boundary checks | Complete |

---

## Verification

To verify that changes conform to syntax standards:

```bash
npm run check
```
