# SPEC-004 — UI polish: icons, layout and visual hierarchy

## 1. Meta

| Field | Value |
|---|---|
| ID | SPEC-004 |
| Title | UI polish: icons, layout and visual hierarchy |
| Track | small-spec |
| Status | `done` |
| Compliance critical | `false` |
| Created | 2026-10-14 |
| Owner | Kobi Saada |

## 2. Summary

The UI is functional, accessible and responsive but plain. This spec raises its visual quality without changing behaviour: an icon set, a consistent page header, avatars, richer status badges, a redesigned app shell and login page, and polished feature screens — then documents the result with screenshots in the README.

## 3. Goal

A reviewer opening the app sees a coherent, modern product: clear hierarchy, recognisable icons, consistent spacing, and the same quality on a phone as on a desktop.

## 4. Scope

**In scope**

1. Design foundations: `lucide-vue-next` icons (tree-shaken), Inter font, colour tokens; new shared components `PageHeader`, `UserAvatar`, `IconBadge`; icons in `BaseButton`, `StatusBadge`, `EmptyState`, `ErrorState`, toasts.
2. App shell: sticky header, brand, navigation with icons and active state, user chip (avatar, name, role pill), sign-out icon button; mobile-friendly nav.
3. Login: split layout (brand panel with value points on large screens), demo accounts as cards with avatar and role pill.
4. Feature screens: my requests (header with count and action, avatar-free table with date icon), new request (sectioned card, day-count pill, guidance), dashboard (employee avatars, filter bar with icons, action buttons with icons), decision dialog (icon header), team planning (avatars per row, today marker, legend), request history (timeline with icons).
5. Screenshots of every screen in `docs/screenshots/` and a gallery in the README.

**Out of scope**

Behaviour, API, stores, routing, dark mode, i18n, new pages.

## 5. Acceptance criteria

- **AC-1** — Every screen uses `PageHeader`; primary actions and navigation carry icons; status badges show icon + text.
- **AC-2** — Browser walkthrough at 390 px and desktop for both roles: no horizontal page scroll, no console errors (checklist §17).
- **AC-3** — Icons are decorative (`aria-hidden`) or labelled; existing a11y behaviour (dialog focus trap, labels, live regions) unchanged.
- **AC-4** — `npm run verify` green; web bundle still builds.
- **AC-5** — README shows the screenshots.

## 6. Implementation notes

| Task | Commit |
|---|---|
| T-001 design foundations | `feat(web): design foundations — icons, font, page header, avatars` |
| T-002 app shell + login | `feat(web): redesign app shell and login` |
| T-003 feature screens | `feat(web): polish feature screens` |
| T-004 walkthrough + screenshots + docs | `docs: UI screenshots` |

## 7. Tests

Existing component and store tests stay green (assertions on text, not markup). Manual: §17 walkthrough.

## 10. Change log

| Date | What changed | Reason | Approved by |
|---|---|---|---|
| 2026-10-14 | created, approved | owner asked for more investment in design and icons | Kobi |
