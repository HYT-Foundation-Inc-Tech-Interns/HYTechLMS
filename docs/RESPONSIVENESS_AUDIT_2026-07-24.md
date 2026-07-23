# HYTech LMS Responsiveness Audit

Date: 2026-07-24

## Implementation status

Implemented on 2026-07-24:

- Added a global 44 × 44 minimum hit area for buttons and button-like controls.
- Added consistent keyboard focus indicators and touch-action behavior.
- Added reduced-motion handling and disabled hover movement on coarse pointers.
- Changed primary and outline orange controls to WCAG-AA-safe resting colors.
- Fixed the signup birth-date label association.
- Enlarged landing and authentication secondary actions.
- Added responsive padding and short-viewport scrolling to authentication states.
- Added explicit usable minimum widths to student assessment and matrix tables.
- Converted student calendar dates from clickable `div` elements to labeled, touch-safe buttons.
- Collapsed rigid editable/detail grids below the `sm` breakpoint across admin, trainer, student, log, and incident screens.
- Made the student waiting-room header, content, join form, email, and footer actions mobile-first.
- Made navbar logo/name interactions keyboard accessible.
- Improved all three mobile sidebars with accessible state, Escape handling, route-change closing, and background scroll locking.
- Added a meta description plus valid `robots.txt` and `llms.txt`.

Post-fix public-route verification:

| Check | Result |
| --- | --- |
| Production build | Pass |
| Signup Lighthouse accessibility | 100/100 |
| Signup Lighthouse best practices | 100/100 |
| Signup Lighthouse SEO | 100/100 |
| Signup horizontal overflow at 404 px | None |
| Signup controls below 44 px | None |
| Landing horizontal overflow at 412 px | None |
| Landing controls below 44 px | None |
| Landing LCP | 704 ms — good |
| Landing CLS | 0.00 — good |

Authenticated role routes were subsequently validated with temporary test accounts:

- Admin: dashboard, user management, and system logs at 412 px.
- Trainer: home and class detail at 412 px.
- Trainee: home, calendar, and course detail at 412 px.
- Trainee course detail at 1440 × 900.

All tested authenticated routes kept the document and dashboard shell at viewport width. Wide management/log tables stayed within their local horizontal scroll containers, and no tested button or button-like control was below 44 px. The authenticated pass also exposed and fixed a pre-existing trainer-home blank-screen error caused by passing a gradient string directly to React's `style` prop.

## Verdict

The project has a good responsive foundation, but it is not fully responsive or accessibility-ready yet.

- Public routes were tested in the production build with Chrome DevTools.
- Protected routes were reviewed component-by-component in source because the test credentials documented in the README are rejected by the live Firebase project.
- The browser window could be reduced to 500 CSS pixels manually; Lighthouse mobile emulation tested the signup page at 412 CSS pixels.
- The production build completes successfully.

## Runtime results

| Area | Result |
| --- | --- |
| Landing page horizontal overflow | Pass at 500 px |
| Landing page short viewport | Pass at 500 × 400; content remains reachable through its internal scroller |
| Sign-in horizontal overflow | Pass at 500 px |
| Signup horizontal overflow | Pass at 412/492 px |
| Landing-page LCP | 691 ms — good, local unthrottled run |
| Landing-page CLS | 0.00 — good |
| Signup Lighthouse accessibility | 85/100 — needs improvement |
| Signup touch-target audit | Lighthouse pass overall, but manual measurement found small secondary actions |

These are lab results from a local production preview, not real-user field data.

## Confirmed issues

### High priority

1. Signup has an unlabeled date input.
   - Lighthouse identifies the `birthDate` input in `SignUp.jsx`.
   - The visible text is not programmatically associated with the input.
   - Add `htmlFor`/`id` or wrap the input in its label.

2. The primary orange button fails WCAG AA contrast at the signup mobile font size.
   - Lighthouse measured white on `#f97316` at 2.8:1; 4.5:1 is required for 14 px normal text.
   - Use a darker orange for the resting state, such as Tailwind `orange-600` or a verified brand color.

3. Several interactive controls are substantially below a 44 × 44 CSS-pixel touch target.
   - Landing “Sign In”: approximately 37 × 16 px.
   - Sign-in password visibility button: approximately 16 × 16 px.
   - “Forgot Password?”: approximately 105 × 16 px.
   - Signup “Clear Form”: approximately 60 × 16 px.
   - Signup “Sign In”: approximately 53 × 17 px.
   - Student multiple-grid answer controls use `w-6 h-6` (24 × 24 px).
   - Navbar/profile and sidebar icon buttons commonly use `p-1` or `p-2`, leaving some targets under 44 px.

4. Student assessment tables have no minimum content width or mobile card alternative.
   - The assessment table has six columns and `w-full` inside `overflow-x-auto`, but no `min-w-*`.
   - It can compress text and controls into unusable columns before scrolling becomes necessary.
   - Add a meaningful minimum width or render stacked assessment cards below `md`.

### Medium priority

5. Several mobile forms and modal summaries force two or three columns.
   - Examples occur in `Classes`, `ClassDetail`, `SystemLogs`, `IncidentForms`, `StudentArchivedCourses`, `StudentCalendar`, `TrainerHome`, and `StudentHome`.
   - Some are legitimate compact stat rows; editable inputs and long-value summaries should use `grid-cols-1 sm:grid-cols-2`.

6. The student calendar is visually dense on narrow screens.
   - It retains a seven-column month grid with 48 px cells on mobile.
   - Full weekday labels, event indicators, and day controls can become cramped.
   - Use short weekday labels, minimum touch-safe day cells, and a mobile agenda/list companion view.

7. Desktop-style data tables depend only on horizontal scrolling.
   - `SystemLogs` uses `min-w-[820px]`.
   - `UserManagement` uses `min-w-[700px]`.
   - `ClassDetail` uses tables between 680 and 900 px.
   - Scrolling prevents page overflow, but important actions/row identity can leave the viewport. Add a mobile card view or sticky first/action columns.

8. Some public and waiting-state cards use fixed generous padding on the smallest screens.
   - `ForcePasswordChange`, `StudentWaitingRoom`, and parts of `VerifyEmail` use `p-6`/`p-8` without a smaller base value.
   - Use `p-4 sm:p-6 lg:p-8`.

9. `overflow-x-hidden` on the dashboard content can conceal component mistakes.
   - All three dashboard shells deliberately clip horizontal overflow.
   - Keep the shell stable, but ensure each wide child owns an explicit `overflow-x-auto` region and visible scroll affordance.

10. Reduced-motion support is missing.
    - The UI uses pulse, shimmer, slide, scale, and translate animations.
    - Add a global `prefers-reduced-motion: reduce` rule and avoid hover movement on coarse pointers.

### Low priority

11. Signup also lacks a meta description and has invalid/missing crawler files according to Lighthouse.
    - These are SEO/agent-readiness issues, not responsiveness issues.

12. The landing LCP spends most of its 691 ms in render delay (547 ms).
    - The score is already good, so this is not a remediation priority.
    - Render-blocking resources showed 0 ms estimated LCP/FCP savings.

## What is already good

- The landing and authentication layouts use responsive spacing and typography.
- Dashboard shells use `100dvh`, `min-w-0`, and bounded widths.
- Admin, trainer, and student sidebars become off-canvas drawers below `lg`.
- Sidebar widths are bounded with `w-[min(88vw,18rem)]`.
- Major modals generally use `w-full`, `max-w-*`, viewport-bound maximum heights, and internal scrolling.
- Many data tables are already inside `overflow-x-auto`.
- Most card collections move from one column to two or three columns at appropriate breakpoints.
- Notification dropdown and HYTBot use viewport-relative widths.

## Responsive implementation prompts

Each prompt is designed to be given independently to a coding agent. Preserve all existing Firebase behavior and business logic.

### Prompt 1 — Global responsive and accessibility baseline

> Audit and update `src/index.css`, Tailwind utilities, and shared UI patterns for a mobile-first responsive baseline. Ensure the page never creates accidental document-level horizontal scrolling from 320 px through 1920 px. Give every interactive control a minimum 44 × 44 CSS-pixel hit area without necessarily enlarging its visible icon. Add strong `:focus-visible` states, `touch-action: manipulation` where appropriate, safe-area padding for fixed mobile controls, and a `prefers-reduced-motion: reduce` fallback for all nonessential transitions and animations. Darken the default orange primary-button background until white text passes WCAG AA at 14 px. Do not alter business logic or brand hierarchy. Validate at 320, 360, 390, 412, 768, 1024, 1440, and 1920 px, plus 667 px and 400 px viewport heights.

### Prompt 2 — Landing page

> Make `src/components/landing/LandingPage.jsx` robust on small phones, short landscape screens, tablets, and large desktops. Preserve the full-screen visual design and background composition. Keep all content reachable at 320 × 400 without relying on clipped document content. Give “Get Started” and “Sign In” at least 44 px touch height, retain a clear visual distinction between primary and secondary actions, and prevent the long uppercase badge or heading from overflowing at 200% text zoom. Confirm there is no horizontal scrollbar and that decorative absolute-positioned layers cannot expand the scrollable page.

### Prompt 3 — Authentication flows

> Responsively harden `SignIn.jsx`, `SignUp.jsx`, `VerifyEmail.jsx`, and `ForcePasswordChange.jsx`. Use `p-4 sm:p-6 lg:p-8`, allow forms to scroll on short viewports, and keep inputs at least 44 px tall. Associate every visible label with its input using matching `htmlFor` and `id`, especially the signup birth-date field. Expand password visibility, “Forgot Password?”, “Clear Form”, sign-in/sign-up links, and modal close controls to 44 px hit targets. Change the resting primary orange so white 14 px text reaches WCAG AA contrast. Ensure the two-column signup fields collapse to one column below `sm`, browser validation messages remain visible, keyboard focus is never covered, and the forgot-password modal fits at 320 × 400.

### Prompt 4 — Shared dashboard shells, navbars, and sidebars

> Unify responsive behavior across `AdminDashboardLayout.jsx`, `DashboardLayout.jsx`, `StudentDashboardLayout.jsx`, all three navbars, and all three sidebars. Preserve the desktop sidebar and the existing mobile off-canvas drawer. Ensure the hamburger, logo, notification, avatar, dropdown, close, and collapse controls each have a 44 × 44 hit area. Trap focus inside an open mobile drawer, close it with Escape and route changes, restore focus to the trigger, and prevent background scrolling. Truncate long class/page titles without pushing navbar actions off-screen. Account for safe-area insets, 200% text zoom, and 320 px screens. Do not use shell-level clipping to hide child layout defects.

### Prompt 5 — Admin dashboard

> Refine `Dashboard.jsx` for 320–1920 px widths. Keep KPI cards one column on the smallest phones, two columns only when content fits, and avoid forcing six cards across until there is sufficient width. Let activity rows wrap while keeping timestamps readable; truncate only nonessential text and expose the full value accessibly. Make “View all” and card interactions 44 px touch targets. Verify empty, loading, error, and long-name states at 200% zoom.

### Prompt 6 — User management, logs, ID requests, and incident forms

> Make `UserManagement.jsx`, `SystemLogs.jsx`, `IdRequests.jsx`, and `IncidentForms.jsx` fully usable on mobile. Below `md`, replace wide management/log tables with semantic stacked cards, or provide a deliberate scroll region with a sticky identity column and sticky actions. Do not let row menus render off-screen. Stack search/filter controls at 320 px, keep labels visible, and make filter/reset/action buttons 44 px tall. Change rigid two-column modal grids containing editable or long values to `grid-cols-1 sm:grid-cols-2`. Bound every modal to `100dvh`, keep header/footer visible, and scroll only the body.

### Prompt 7 — Sectors and admin classes

> Responsively refine `Sectors.jsx`, `Classes.jsx`, `AdminCreateClassModal.jsx`, and `AdminStudentClassPreview.jsx`. Stack toolbars and filters on small screens, allow tabs to scroll with a visible affordance, and prevent `min-w-[12rem]` filters from causing overflow at 320 px. Convert unprefixed two-column form groups to `grid-cols-1 sm:grid-cols-2` when fields contain labels or user-entered text. Let action rows wrap or become full-width stacked buttons. Keep modal header/footer controls touch-safe and sticky while modal content scrolls. Test very long class names, sector names, codes, descriptions, and empty states.

### Prompt 8 — Trainer home, task lists, archives, sector detail, and settings

> Audit `TrainerHome.jsx`, `Tasks.jsx`, `ArchivedCourses.jsx`, `SectorDetail.jsx`, and `TrainerSettings.jsx` at all standard breakpoints. Stack header actions and filters below `sm`; keep course-card metrics legible when three values are shown; change editable two-column blocks to one column on small phones; and make mobile settings navigation discoverable instead of hiding the desktop tab row without an equivalent. Ensure cards, task rows, archive actions, toggles, and menus have 44 px targets. Validate long titles, no-data states, loading states, and 200% zoom.

### Prompt 9 — Trainer class detail

> Perform a focused responsive refactor of `ClassDetail.jsx` without changing its data logic. Treat each tab—overview, modules/content, assessments, responses, grade/competency tables, students, announcements, and settings—as an independent mobile layout. Keep the main tab strip horizontally scrollable with the active tab automatically brought into view. Below `md`, render 680–900 px tables as labeled cards where practical; otherwise add sticky identity/action columns and a clear scroll affordance. Stack all unprefixed two-column form groups below `sm`. Make the full-screen assessment builder, preview, response viewer, media viewer, and every CRUD modal fit `100dvh`, with sticky header/footer and a scrollable body. Maintain 44 px controls, visible focus, long-word wrapping, and no document-level horizontal overflow.

### Prompt 10 — Student home, enrollment, waiting room, archive, and ID request

> Responsively update `StudentHome.jsx`, `StudentEnroll.jsx`, `StudentWaitingRoom.jsx`, `StudentArchivedCourses.jsx`, and `StudentRequestId.jsx`. Stack banner/header actions on narrow screens, collapse metric grids only when labels or values wrap, and make all course cards work with long qualification/class names. Replace base `p-8` with progressive spacing such as `p-4 sm:p-6 lg:p-8`. Let waiting-room footer actions wrap or stack and do not truncate the signed-in email without an accessible full value. Change archive/detail modal grids to one column below `sm`, keep modal controls visible above the mobile keyboard, and give all buttons and links 44 px targets.

### Prompt 11 — Student course and assessments

> Perform a full mobile-first pass on `StudentCourse.jsx`. Preserve all quiz, announcement, material, module, and submission behavior. Make the course tab navigation horizontally scrollable and automatically reveal the active tab. Convert the six-column assessment table to mobile assessment cards below `md`, or add a tested minimum width plus sticky title/action columns. For matrix questions, retain semantic table headers but give each radio-like button a 44 × 44 hit area and a minimum table width derived from its column count. Ensure quiz fullscreen mode and all result/history/material/comment modals use `100dvh`, sticky controls, and independently scrolling content. Test long question text, many answer columns, long filenames, 200% zoom, keyboard navigation, and 320 px width.

### Prompt 12 — Student tasks and calendar

> Make `StudentTasks.jsx` and `StudentCalendar.jsx` usable at 320 px. Stack task filters/actions, prevent status badges and deadlines from colliding, and keep the primary row action touch-safe. For the calendar, use compact weekday labels on mobile, keep each selectable day at least 44 px, avoid unreadable event text inside 48 px cells, and add or prioritize an agenda list for the selected day below the month grid. Make previous/next month icon buttons 44 px, allow the calendar header to wrap, and test months with six weeks and multiple events per day.

### Prompt 13 — Student and trainer settings

> Unify responsive patterns in `Settings.jsx`, `StudentSettings.jsx`, and `TrainerSettings.jsx`. Provide a visible mobile section selector or accordion when desktop tabs are hidden. Stack label/control rows when text wraps, keep switches and their labels jointly clickable with a 44 px target, and make save/cancel actions sticky or easy to reach on long forms. Use responsive padding, preserve validation messages, and ensure profile/avatar controls and destructive actions remain usable at 320 px and 200% zoom.

### Prompt 14 — Notifications and HYTBot

> Responsively refine `NotificationDropdown.jsx`, `NotificationsPage.jsx`, and `HytBot.jsx`. Keep dropdown/panel edges inside the visual viewport and safe areas at 320 px, including when launched near a screen edge. Give notification rows, mark-read actions, close buttons, and the bot launcher 44 px targets. Use `100dvh`-aware panel heights, keep the composer above the mobile keyboard, wrap long unbroken URLs/files, and prevent chat bubbles from becoming too narrow. Add focus trapping, Escape-to-close, focus restoration, and reduced-motion behavior.

### Prompt 15 — Shared modal, table, toolbar, and form regression pass

> Run a final cross-component responsive regression pass. Every modal must use a viewport-bound shell, sticky header/footer, scrollable body, safe-area padding, and a 44 px close button. Every wide table must have either a mobile card representation or an explicit scroll container with preserved row context. Every toolbar must stack or wrap at 320 px; every form grid must default to one column and opt into multiple columns at a justified breakpoint. Test with realistic maximum-length names, descriptions, filenames, codes, empty/error/loading states, 200% text zoom, keyboard-only navigation, and landscape heights. Report any remaining horizontal overflow with the exact component and DOM element responsible.

## Acceptance checklist

- No document-level horizontal scroll at 320, 360, 390, 412, 768, 1024, 1440, or 1920 px.
- All meaningful controls have at least a 44 × 44 hit area.
- All form controls have programmatic labels and visible focus.
- Normal-size text meets WCAG AA contrast.
- No content becomes unreachable at 320 × 400 or behind the mobile keyboard.
- Tables remain understandable without losing row identity or actions.
- Dialogs trap focus, close with Escape, restore focus, and do not scroll the background.
- Layout remains usable at 200% text zoom.
- Reduced-motion users do not receive nonessential movement.
- Production build and role-specific smoke tests pass.
