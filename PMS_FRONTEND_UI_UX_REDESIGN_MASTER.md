# PMS Orbit — Frontend UI/UX Redesign Master Plan

> **Purpose** — A code-aware redesign guide for turning the current PMS Orbit frontend into a calm, consistent, polished product without changing the business behavior that already works.
>
> **How to use this file** — Follow the delivery loop in Section 4 for every screen. Do not redesign isolated screens by adding one-off classes. First build the shared foundations, then migrate high-traffic experiences, then validate light and dark mode.
>
> **Scope reviewed** — the supplied frontend archive: **322 files / ~54,104 lines** across Next-style routes, feature modules, shared UI primitives, the app shell, task/project/page flows, admin screens, and theming.

---

## 1. Executive conclusion

The app is not missing capability. It already has a substantial product surface: dashboard, personal work, projects, task board and details, pages/editor, team, search, notifications, GitHub, audit/activity, settings, and platform administration.

The visual problem is **system drift**, not a lack of components:

- A good shared UI foundation already exists in `components/ui/` (Button, Card, Input, Table, Dialog, Select, Tabs, Sheet, Skeleton, EmptyState, and more).
- A semantic theme foundation also exists in `app/globals.css`, with light/dark variables, accent variables, radius variables, and shared utility classes.
- However, individual pages bypass those foundations with direct colors, custom glows, bespoke shadows, special radii, custom action buttons, and repeated local status maps.
- Several experience-heavy files are very large, so layout, interaction state, and presentation are intertwined. This makes visual improvements slow and causes future inconsistency.

**Design direction:** use a restrained, information-first workspace style. The product should feel dependable and quiet—not a showcase of effects. Keep one primary action per screen, reduce decoration, make status and hierarchy easy to scan, and use motion only to clarify change.

---

## 2. What the codebase already does well

Keep and extend these assets rather than rebuilding the app from scratch.

| Existing asset | Evidence in the frontend | Redesign decision |
|---|---|---|
| Shared primitives | `components/ui/button.tsx`, `card.tsx`, `input.tsx`, `table.tsx`, `dialog.tsx`, `select.tsx`, `tabs.tsx` | Standardize these as the only base controls; improve their variants once, then reuse everywhere. |
| App shell | `components/layout/app-layout.tsx`, `header/`, `sidebar/` | Retain the responsive sidebar/header architecture; simplify visual treatment and tighten layout contracts. |
| Light/dark infrastructure | `app/globals.css`, `providers/theme-provider.tsx`, `store/theme-store.ts` | Consolidate semantic tokens and test both modes as a release requirement. |
| Responsive foundations | mobile sidebar, compact header, responsive grids | Preserve the behavior; replace cramped mobile layouts with intentional stacked patterns. |
| Loading and empty UI | `Skeleton`, `EmptyState`, page-level loading branches | Define standard state templates and apply them consistently. |
| Domain modularity | `features/tasks`, `projects`, `pages`, `github`, etc. | Add feature-level presentational components, keeping queries/mutations and business rules intact. |
| Accessibility starting point | focus rings, button labels, dialogs, tooltips | Make keyboard paths, contrast, state announcements, and touch targets consistent. |

---

## 3. Code review findings and decisions

### 3.1 Token foundation is present, but competing styling systems weaken it

**Observed**

- `app/globals.css` defines semantic colors (`--background`, `--surface`, `--foreground`, `--muted`, `--border`, `--card`, `--sidebar`) and dark counterparts.
- The same file also holds a very large accent catalog, accent-specific gradients, utility effects, and visual recipes.
- `store/theme-store.ts` exposes **20 typed accent values**, but `ACCENT_COLORS` contains additional IDs such as `navy`, `steelblue`, `mint`, `aqua`, `gold`, `bronze`, `charcoal`, and `ice` that are not in `AccentColor`. This is a type/data mismatch.
- Individual pages still use direct color families. Examples include `PROJECT_STATUS_COLORS` in the dashboard and `STATUS_STYLES` in Projects. The Projects page adds page-specific white overlays, neutral colors, glow shadows, and dark-only color overrides.
- The review found **66 direct `bg-white`**, **38 `dark:` modifiers**, **340 shadow uses**, **1,281 rounded-class uses**, and **202 animation references** across source files. These numbers are signals to audit; not every occurrence is wrong.

**Decision**

Use semantic product tokens for all app chrome, surfaces, text, borders, actions, and semantic states. Permit only a small number of chart/data colors. Do not use raw palette colors for standard UI state.

**Outcome**

A screen respects light/dark mode automatically; a component does not need its own private visual language.

### 3.2 Existing primitives need a stricter contract

`Button`, `Card`, `Input`, and `Table` are solid starts, but usage varies widely through custom class overrides.

**Decision**

Create a documented component contract:

- `Button`: `primary`, `secondary`, `outline`, `ghost`, `destructive`, plus `icon` size. Do not invent a page-level action-button style.
- `Card`: default `surface`, optional `interactive`, `flat`, and `inset`. No arbitrary translucent/glass cards for routine data.
- `Input`, `Select`, and date controls: one 40 px desktop control height and a 44 px mobile touch minimum.
- `Badge`: semantic `neutral`, `info`, `success`, `warning`, `danger`, and `status` variants—not raw Tailwind color maps.
- `Table`: shared density, header, row hover/focus, selected-state, loading, empty, and mobile overflow behavior.
- `PageHeader`, `FilterBar`, and `PageContent` already exist in `components/layout/page-header.tsx`; make them mandatory for standard list/detail pages.

### 3.3 Screen code is overly concentrated

Largest reviewed UI files include:

- `app/(dashboard)/pages/[id]/page.tsx` — **2,209 lines**
- `features/tasks/components/task-dashboard.tsx` — **2,046 lines**
- `app/(dashboard)/settings/page.tsx` — **1,977 lines**
- `features/tasks/components/task-board.tsx` — **1,460 lines**
- `app/(dashboard)/your-work/page.tsx` — **1,230 lines**
- `features/tasks/components/panel/task-side-panel.tsx` — **1,075 lines**

**Decision**

Do not undertake a “visual refactor” inside these files in one pass. Extract presentational blocks first—toolbar, view switcher, filters, metric cards, list row, state panel, and property groups—then migrate visual styles to primitives. Keep existing data hooks and mutations in their current feature boundaries until UI migration is stable.

### 3.4 The app shell is structurally good, but needs consistent hierarchy

`AppLayout` already correctly handles desktop and mobile navigation, and the header has search, workspace switcher, theme control, notifications, and user menu. However, the header mixes multiple stylistic treatments, and page bodies choose their own spacing and max widths.

**Decision**

Adopt a shell contract:

- Sidebar: 256 px expanded, 72 px collapsed, with a plain surface and one clear active indicator.
- Header: 64 px desktop / 56 px mobile. Use one border, one background surface, modest blur only if it improves legibility.
- Standard page canvas: `max-w-7xl`, inline padding 24 px desktop / 16 px mobile, block gap 24 px desktop / 16 px mobile.
- Board and task-detail experiences may intentionally use full width, but must use their own documented layout recipe—not bypass the system ad hoc.

### 3.5 Theme configuration should be simplified before it grows further

The user wants excellent light/dark mode. That is easier with fewer variables and fewer exceptions.

**Decision**

- Keep `light`, `dark`, and `system` modes.
- Ship **one default brand accent** (Cobalt/Blue recommended) plus at most 4 optional accessible accents in personal settings. A PMS needs recognizable system semantics more than 20 color choices.
- Remove accent-dependent page background gradients from work screens. If a brand atmosphere is desired, use a single low-contrast ambient tint in the shell only.
- Keep a single standard radius preset (`10px` controls, `12px` cards, `16px` dialogs). Treat radius personalization as a later preference, not a core visual dependency.
- Resolve the `AccentColor` / `ACCENT_COLORS` mismatch before exposing more choices.

---

## 4. Mandatory redesign loop

Apply this loop to **each feature and route**. A redesign is not complete when the happy path looks nice.

### Step 1 — Observe

Before touching UI:

1. List the route, user role(s), actions, data states, and dependencies.
2. Capture the current light and dark view at desktop and mobile widths.
3. Identify the user’s primary job on the screen and the one action that advances it.
4. Inventory every current state: loading, empty, error, permission-limited, populated, filter-no-results, saving, success, and destructive confirmation.
5. Record any existing keyboard behavior, side panels, drafts, dialogs, or unsaved-change protection that must remain.

**Output:** a small feature brief in the pull request or implementation note.

### Step 2 — Decide

Choose the appropriate composition before coding:

- **Collection:** header + search/filter row + table/grid + bulk actions + pagination.
- **Board:** compact board toolbar + view/filter controls + horizontally scrollable columns + a focused task side panel.
- **Detail:** breadcrumb + title/status/actions + overview metrics + tabs/sections + sticky contextual actions when needed.
- **Personal workspace:** personal summary + prioritized work queue; analytics must not dominate action-taking.
- **Settings:** grouped navigation and forms; save state must be explicit.

Map every element to an existing primitive or identify one reusable new primitive. Do not start with a one-off `<div>` recipe.

### Step 3 — Build foundations first

1. Apply token changes and shared primitive variants.
2. Build reusable feature patterns.
3. Migrate one representative route in each category.
4. Validate it in both themes.
5. Only then migrate the remaining routes.

### Step 4 — Validate behavior and visual quality

For every migrated route verify:

- existing API calls, permissions, mutations, dialogs, drafts, and routes still work;
- 320 px, 768 px, 1024 px, and 1440 px views remain usable;
- light, dark, and system preference render without flashes or unreadable contrast;
- keyboard-only navigation works from entry through primary completion;
- focus is visible and stays inside dialogs/sheets;
- a screen reader receives labels and status changes;
- no raw color, hard-coded white surface, or page-owned style is introduced without an explicit exception.

### Step 5 — Refine

Reduce, rather than add:

- remove duplicated visual signals;
- remove shadows that do not indicate elevation;
- remove animation that does not indicate a state or spatial change;
- shorten labels and helper text;
- retain only one primary action per context.

### Step 6 — Document and guard

Add the pattern to the component catalogue and use lint/search checks for regressions. A simple recurring audit should flag `bg-white`, raw `text-*-500`, bespoke `shadow-[…]`, `style={{`, and non-semantic status maps in app-facing components.

---

## 5. Target visual language

### 5.1 Product personality

**Calm, capable, clear.**

- The dashboard is a briefing, not a poster.
- Task and project pages prioritize scanability and momentum.
- Decorative gradients, glass surfaces, neon glows, oversized icons, and bouncy hover scaling are exceptions—not the default.
- Color communicates meaning; it is never the only source of meaning.

### 5.2 Core light/dark tokens

Use these as target semantic values. Exact values may be tuned after contrast testing, but names and roles must stay stable.

| Token | Light | Dark | Use |
|---|---:|---:|---|
| `background` | `#F8FAFC` | `#0B1220` | application canvas |
| `surface` | `#FFFFFF` | `#111827` | primary cards, header, sidebar |
| `surface-raised` | `#FFFFFF` | `#172033` | dialogs, menus, side panels |
| `surface-muted` | `#F1F5F9` | `#1E293B` | inset areas, secondary controls |
| `foreground` | `#0F172A` | `#F8FAFC` | headings and body text |
| `muted-foreground` | `#64748B` | `#94A3B8` | supporting content |
| `border` | `#E2E8F0` | `#263449` | all default dividers |
| `primary` | `#2563EB` | `#60A5FA` | decisive actions, selected state |
| `focus-ring` | `#2563EB` | `#93C5FD` | focus only |
| `success` | `#15803D` | `#4ADE80` | completed / healthy |
| `warning` | `#B45309` | `#FBBF24` | at risk / due soon |
| `danger` | `#B91C1C` | `#F87171` | destructive / blocked |

**Rules**

- Normal body text must meet WCAG AA contrast; do not use opacity as a substitute for meaningful hierarchy.
- Use `surface`, not white, for regular component backgrounds.
- Use status background tints at low opacity with readable text and a label/icon.
- Semantic status colors are fixed system colors, not affected by the chosen brand accent.

### 5.3 Type, space, radius, elevation, and motion

**Typography**

- Use one UI family. Existing Jakarta/Sora definitions can remain, but assign one to UI text and use the other only if there is a concrete hierarchy reason.
- Page title: 24–28 px / semibold. Section title: 16–18 px / semibold. Body: 14 px. Meta: 12 px.
- Avoid frequent all-caps. Reserve it for compact table headers or minor metadata.

**Spacing**

- Base unit: 4 px.
- Component internals: 8/12/16 px.
- Standard page groups: 16 px mobile, 24 px desktop.
- Card padding: 16 px compact, 20–24 px default. Do not use 24 px everywhere by reflex.

**Radius and elevation**

- Controls: 8 px; cards: 12 px; dialogs/sheets: 16 px; pills: full only where a pill communicates status.
- Default cards are border-led, with no or very soft shadow.
- Use one medium shadow only for menus, dialogs, side panels, and drag overlays.

**Motion**

- 150–200 ms for hover/focus/opacity; 220–280 ms for sheets and dialogs.
- Use opacity and a small translate for entry; do not scale cards on ordinary hover.
- Respect reduced motion. Animations must not delay task creation, editing, navigation, or feedback.

---

## 6. Component system implementation plan

### 6.1 Establish a component catalogue

Create `components/patterns/` for combinations that recur across product surfaces:

```text
components/
  ui/                         # primitive controls only
  patterns/
    app-page.tsx              # page frame and standard spacing
    page-toolbar.tsx          # search / filters / view actions
    metric-card.tsx
    entity-list-state.tsx     # loading / empty / error / no-results
    status-badge.tsx
    priority-indicator.tsx
    entity-row-actions.tsx
    section-card.tsx
    detail-header.tsx
    data-table-shell.tsx
```

Use feature folders for domain-specific presentation (`TaskListRow`, `ProjectCard`, `TaskPropertyGroup`) while drawing their visuals from these patterns.

### 6.2 Shared status and priority semantics

Replace duplicated maps such as `PROJECT_STATUS_COLORS`, `TASK_STATUS_COLORS`, `STATUS_STYLES`, and direct chart status hex maps with a central resolver.

```ts
// Example intent, not copy/paste requirement
getStatusAppearance(status) => {
  label: "In progress",
  tone: "info",
  icon: CircleDot,
}

getPriorityAppearance(priority) => {
  label: "High",
  tone: "warning",
  icon: ArrowUp,
}
```

The resolver owns legacy aliases and dynamic status fallback. Components receive a semantic tone and render `StatusBadge`; they do not decide colors.

### 6.3 Standard state components

Every collection and detail section must use a shared presentation for:

- **Loading:** skeleton matching final geometry; no generic spinner replacing a whole table.
- **Empty:** explanatory title, one sentence of context, and one next action if permitted.
- **No results:** preserve filters/search and offer a single “Clear filters” action.
- **Error:** plain explanation, retry, and technical detail only where helpful.
- **Permission-limited:** state what access is required and provide a neutral next step.
- **Saving:** preserve the edited value and show compact inline progress; avoid blocking entire pages.

### 6.4 Form system

Build all task/project/page settings forms with the existing `Form`, `FormField`, `Label`, `Input`, `Select`, `Textarea`, and error behavior.

- Label above control, helper below, error in the same location.
- Required state should be text-accessible, not color-only.
- Use a two-column form only above 1024 px and only for short related fields.
- Place destructive actions in a visually separate “Danger zone.”
- For long forms, use a sticky footer with Cancel / Save and an unsaved-changes message.

---

## 7. Screen-by-screen redesign blueprint

### 7.1 Global navigation and header

**Keep:** responsive slide-in sidebar, breadcrumbs, global search, notifications, organization switcher, account menu.

**Change:**

- Sidebar logo area should be a single product identity line with workspace name below only when expanded.
- Group labels should be subtle and use consistent ordering: **Workspace** (Dashboard, Your Work, Projects, Tasks, Pages), **Integrations** (GitHub), **Manage** (Team, Activity, Settings).
- Active nav: 2–3 px accent rail *or* a low-contrast tinted background; not both plus bold plus glow.
- Header should not compete with page title. Reduce decorative borders/shadows and retain a quiet search affordance.
- On small screens, show only menu, current context, search, notifications, and account. Workspace switcher can be an accessible compact trigger.

### 7.2 Dashboard

The reviewed dashboard has useful data but currently treats metrics as square, icon-heavy objects and has duplicate local styling logic.

**Target composition**

1. Welcome/context row: “Good morning, Karan” + current workspace + one primary `Create task` action.
2. A 3–4 metric row: assigned to me, due soon, overdue, active projects. Metrics should link to filtered work.
3. “My next work” list: due date, priority, project, current status, quick completion/status action.
4. “Project health” compact section: active projects with progress / at-risk cue.
5. “Recent activity” at lower priority.

**Rules**

- Do not hide the dashboard page title; orientation matters.
- Metrics use a small icon, one number, one clear label, and a meaningful trend only if real comparison data exists.
- Use the shared `MetricCard`, not a local `StatCard`.
- Avoid `backdrop-blur`, hover scaling, and aspect-square metric cards on small screens. On mobile, use a two-column or horizontal-scroll metric pattern with legible labels.

### 7.3 Your Work

The current route has six tabs (`Summary`, `Assigned`, `Created`, `Activity`, `Visualize`, `Stats`), charts, and a very large page component.

**Target composition**

- Make **Assigned to me** the default and core work surface.
- Keep Summary as an overview, and move low-frequency analytics into a `Insights` tab or progressive section.
- Use task rows optimized for execution: title, project, status, priority, due date, assignees, overflow action.
- Expose a view switcher only where it changes work behavior (List / Board / Timeline). Do not have tabs for every information grouping.
- Put “Created by me” and activity in secondary tabs, not equal visual rank to active assigned work.

**Refactor boundary**

Split the 1,230-line route into `YourWorkHeader`, `YourWorkSummary`, `MyTaskList`, `MyActivity`, `WorkInsights`, and task row/chart patterns.

### 7.4 Projects

**Target composition**

- `PageHeader`: Projects, count/description, `Create project` primary action.
- `PageToolbar`: search, status filter, owner filter, optional sort/view controls.
- Default desktop list/table or compact cards—choose one based on the fields users most need to compare. A switch can be offered later.
- Each project summary shows: name, status, health/progress, owner, updated time, member count; action menu only on hover/focus.
- Avoid individual circular action buttons with glass/glow styling. Put rarely used actions in the consistent overflow menu.

**Project detail**

- Header: breadcrumb, project name, status badge, owner/members, one contextual action.
- Tabs: Overview, Tasks, Pages, Resources, Activity, Settings. Keep task board as a focused full-width tab.
- Overview: goal, health, milestone/progress, next tasks, linked pages, recent activity.

### 7.5 Tasks

Task management is the product’s center of gravity. Its density is appropriate, but visual priority must be disciplined.

**Target composition**

- Header: `Tasks`, compact count, primary create action.
- Toolbar: saved view, search, filter, sort, display switcher, and a visible active-filter count.
- Board: consistent status columns; header displays title/count/WIP if applicable; cards have title, priority, assignee avatars, due state, project, and only critical metadata.
- List: table/list rows must match card semantic signals.
- Task side panel: title and status at top; properties in a compact single column; Description, Subtasks/linked work, Activity, and Comments as clear sections.

**Interaction rules**

- Drag affordances should be visible only when board mode is active.
- Keep direct status change but give clear success feedback and preserve undo where feasible.
- Opening a task should preserve list/board context and browser navigation should return naturally.
- On mobile use a full-height sheet, not a squeezed desktop side panel.

**Refactor boundary**

Break `task-dashboard.tsx` into shell/toolbars/views. Keep its current query and mutation behavior intact while replacing each view’s presentation independently.

### 7.6 Pages and editor

`pages/[id]/page.tsx` is the largest route and should be staged carefully.

**Target composition**

- List screen: page title, visibility, parent/project, last edited, editor, and quick menu.
- Editor: quiet document surface; persistent title; only contextual controls. Put sharing/publish in a clear action area rather than among formatting controls.
- Linked tasks: compact list with count and creation/link action.
- Draft/saving/published state is always visible but unobtrusive.

**Mobile**

Editor action controls collapse into one menu; avoid long horizontal formatting bars.

### 7.7 GitHub, team, activity, settings, and admin

- **GitHub:** treat as an integration hub. Start with connection status and selected repositories; analytics should appear after a clear connection state.
- **Team:** default to a readable member table; invite action clear; permissions use explicit wording and confirmation.
- **Activity:** use an event list grouped by time. Filters are secondary and should not overwhelm the first view.
- **Settings:** replace long visual sections with left sub-navigation on desktop and accordions or grouped cards on mobile. Preserve a clear save status.
- **Admin:** use the same primitives and shell but distinguish platform context through labeling, not a separate flashy visual language.

---

## 8. Light/dark mode quality contract

A component is not done until it passes both modes.

### Must be true in both modes

- Surfaces are distinguishable without creating a stack of floating shadows.
- Borders are visible but quiet.
- Muted text is readable at normal size.
- Selected nav, status, disabled, hover, keyboard focus, and destructive states are unmistakable.
- Charts contain a dark-theme grid/axis/tooltip palette, not only changed bars.
- Images, avatars, rich-text editor content, code blocks, dropdowns, sheets, and calendar/date pickers are included in testing.
- System mode responds cleanly to OS changes and no theme-dependent page flashes occur.

### Implementation restrictions

- Do not use `bg-white`, `text-black`, `border-gray-*`, or raw fixed colors for shared product UI except in a deliberate image/chart context.
- Prefer semantic classes (`bg-surface`, `text-foreground`, `border-border`, etc.).
- Avoid individual `dark:` overrides when a token can solve the problem.
- Update the theme store type and accent definitions together so every selectable setting has a valid token definition.

---

## 9. Accessibility and UX acceptance checklist

### Keyboard and focus

- Tab order follows visual order.
- Every icon-only control has an accessible label and tooltip.
- The focus ring uses the same clear treatment in light and dark modes.
- Dialogs/sheets trap focus, restore focus on close, and close with Escape unless there is an unsaved-change confirmation.
- Boards can be navigated and task details opened without requiring drag gestures.

### Content and feedback

- Do not use color as the only status/priority signal; include label, icon, or shape.
- Loading skeleton geometry corresponds to the final content.
- Empty states tell users what is empty, why, and the next available action.
- Saving, success, error, offline, and permission feedback are localized to the affected work area.
- Confirm destructive actions with the item name and clear consequence.

### Responsive behavior

- Primary actions remain reachable on 320 px width.
- Toolbars wrap into deliberate rows or use an overflow menu; they never simply overflow.
- Tables horizontally scroll with persistent essential columns or transform into stacked rows where comparison is not essential.
- Touch targets are at least 44 × 44 px for icon actions on mobile.
- Side panels become full-screen sheets on phones.

---

## 10. Delivery roadmap

### Phase 0 — Baseline and guardrails (1–2 days)

- Capture representative screen states in both modes.
- Agree a default brand accent, semantic status palette, and standard radius.
- Add visual audit search checks and write a short migration note.
- Fix theme accent type/data mismatch.

**Done when:** token roles are agreed, no new one-off page styling is added, and baseline screenshots exist.

### Phase 1 — Foundation (2–4 days)

- Simplify `globals.css` into durable semantic tokens and a small utility layer.
- Update Button, Card, Input, Select, Badge, Table, Dialog, EmptyState, Skeleton, and Tooltip contracts.
- Add shared `StatusBadge`, `PriorityIndicator`, `MetricCard`, `PageToolbar`, `EntityListState`, and `DetailHeader` patterns.
- Normalize header/sidebar/page canvas geometry.

**Done when:** a small test screen can be built using only primitives/patterns in light and dark mode.

### Phase 2 — Core work flows (4–7 days)

- Dashboard
- Tasks list + board + task side panel
- Projects list + project detail overview
- Create/edit task and project forms

**Done when:** the primary daily workflow is cohesive end-to-end and existing mutations/permissions remain unchanged.

### Phase 3 — Knowledge and people (3–5 days)

- Your Work
- Pages list + page detail/editor shell
- Team, activity, notifications, search results

**Done when:** all common workspace routes use common headers, toolbars, states, and status patterns.

### Phase 4 — Integration and administration (2–4 days)

- GitHub
- Settings
- Admin routes

**Done when:** specialized areas still feel like the same product and have complete light/dark state coverage.

### Phase 5 — Finish and protect (2–3 days)

- Responsive audit
- Keyboard and contrast audit
- Empty/error/loading audit
- Motion reduction audit
- Remove deprecated local style maps and unused effects

**Done when:** the acceptance checklist passes for representative routes and no priority styling regressions remain.

---

## 11. First implementation queue

Execute this exact order to get a visible quality lift without risking functionality:

1. Fix `AccentColor` versus `ACCENT_COLORS`; reduce selectable accents and standardize radius.
2. Consolidate global tokens; remove work-screen accent gradients and limit visual effect utilities.
3. Upgrade `Badge` and create central status/priority appearance helpers.
4. Lock the contracts for Button, Card, Input/Select, Table, EmptyState, Skeleton, and Dialog.
5. Standardize `AppLayout`, header, sidebar, `PageHeader`, `PageToolbar`, and page canvas.
6. Redesign Dashboard using `MetricCard`, Next Work, Project Health, and activity patterns.
7. Extract TaskDashboard toolbar, list/board views, and task panel sections; redesign one at a time.
8. Migrate Projects list/detail and reuse task/status patterns.
9. Migrate Your Work and Pages after common task/list patterns are stable.
10. Complete theme, responsive, and accessibility validation before polishing low-frequency admin surfaces.

---

## 12. Definition of done

The redesign is complete only when all of the following are true:

- [ ] Existing backend behavior, routing, roles, data fetching, mutation flows, task drafts, and confirmation behavior remain intact.
- [ ] All standard app UI uses shared semantic primitives or documented patterns.
- [ ] Status and priority styles come from a central semantic resolver.
- [ ] Light, dark, and system modes are tested for app shell, forms, tables, boards, side panels, editor, charts, dialogs, menus, and empty/loading/error states.
- [ ] Page headers, toolbars, card spacing, form layout, and action hierarchy are consistent across workspace routes.
- [ ] There is only one visually primary action in each normal context.
- [ ] Mobile workflows are intentional rather than compressed desktop layouts.
- [ ] Keyboard, visible focus, labels, destructive confirmations, and no-results feedback work throughout core task/project/page journeys.
- [ ] New UI code does not introduce arbitrary raw colors, hard-coded white surfaces, excessive effect styling, or one-off control variants without a documented exception.
- [ ] Representative screenshots and visual checks demonstrate no regression across light and dark modes.

---

## Final north star

**PMS Orbit should make the next piece of work obvious.**

The redesign should not make the product louder. It should make it faster to understand: where am I, what needs attention, what can I do next, and what changed after I did it. That is the smooth, professional finish worth shipping.
