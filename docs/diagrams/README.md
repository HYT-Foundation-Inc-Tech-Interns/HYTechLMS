# HYTech LMS — Diagrams

Three diagram types, in two formats, at two levels of fidelity.

| | Class / UML | Use case | Database schema |
| --- | --- | --- | --- |
| **PlantUML — design-level** | [plantuml/class-diagram.puml](plantuml/class-diagram.puml) | [plantuml/use-case-diagram.puml](plantuml/use-case-diagram.puml) | [plantuml/database-schema.puml](plantuml/database-schema.puml) |
| **Mermaid — design-level** | [mermaid/class-diagram.md](mermaid/class-diagram.md) | [mermaid/use-case-diagram.md](mermaid/use-case-diagram.md) | [mermaid/database-schema.md](mermaid/database-schema.md) |
| **As-built (accurate, messy)** | [as-built/class-diagram.md](as-built/class-diagram.md) | — | [as-built/database-schema.md](as-built/database-schema.md) · [.puml](as-built/database-schema.puml) |

Pre-rendered SVGs of every PlantUML diagram are in [rendered/](rendered/).

---

## Which one do I want?

**Design-level** is the idealised model: roles as subclasses, one abstract
`GradedItem`, a normalised schema, no legacy fields. Use it for documentation,
submissions, onboarding slides, and for deciding where the system *should* go.
It is honest about intent but does not match the code line for line.

**As-built** is what is actually in the repository and in Firestore today,
including the confusing names, duplicated data and dead collections. Use it when
writing a query, a security rule, or a migration — anywhere being wrong costs
you an afternoon.

The gap between the two is not an accident, and it is documented: see
[§4 of the as-built schema](as-built/database-schema.md#4-known-divergences-ranked-by-how-much-they-will-bite-you)
for the ranked list of divergences, and
[§6 of the as-built structure diagram](as-built/class-diagram.md#6-if-you-are-refactoring-toward-the-clean-model)
for the refactor order that would close it.

**PlantUML vs Mermaid** is purely a rendering choice — the content is
equivalent. PlantUML gives proper UML notation (`<<include>>`, `<<extend>>`,
actor generalisation, crow's-foot ER) and prints well. Mermaid renders inline on
GitHub and in VS Code with no toolchain.

---

## Rendering

### PlantUML

Requires Java. Download `plantuml.jar` from
<https://github.com/plantuml/plantuml/releases>.

```powershell
java -jar plantuml.jar -tsvg -o rendered docs/diagrams/plantuml/*.puml
java -jar plantuml.jar -tsvg -o rendered docs/diagrams/as-built/*.puml
java -jar plantuml.jar -checkonly docs/diagrams/plantuml/class-diagram.puml   # syntax only
```

`use-case-diagram.puml` contains **seven** `@startuml` blocks and emits seven
images — `uc-0-context` through `uc-6-records-support`. One frame holding all
sixty-odd use cases is unreadable, so it is split by subsystem.

Prefer SVG. The schema diagrams are ~8,200px wide, and PlantUML's PNG exporter
**silently clips at 4,096px** — you get a valid-looking image with the
right-hand entities missing. If you need PNG, raise the limit:

```powershell
java -DPLANTUML_LIMIT_SIZE=16384 -jar plantuml.jar -tpng docs/diagrams/as-built/database-schema.puml
```

In VS Code, the *PlantUML* extension (jebbs) previews with `Alt+D`.

### Mermaid

No toolchain needed — GitHub renders the fenced blocks, and VS Code's built-in
Markdown preview handles them via the *Markdown Preview Mermaid Support*
extension.

---

## Verification status

Everything here was checked, not just written:

- All four `.puml` files render without error under PlantUML 1.2026.6, and the
  rendered output was inspected — the use-case diagram was **restructured**
  after the first render came out at a 1:2.85 aspect ratio with edges sweeping
  the full height.
- All 20 Mermaid blocks parse cleanly under Mermaid 11.
- Content was derived from `firestore.rules`, `src/utils/firestoreService.js`,
  `functions/src/index.js` and `src/App.jsx` on branch
  `security/hardening-remediation`, not from the prose documentation.

Two things worth knowing about PlantUML if you edit these files:

1. A line whose **first** non-space character is `'` is a comment and vanishes
   from the output. Mid-line `'` is literal text. Several as-built annotations
   were silently dropped this way on the first pass — if a note disappears,
   check for a leading apostrophe.
2. `class` is a keyword. Do not use it as an entity alias. Mermaid's ER parser
   likewise reserves `CLASS`, which is why the clean schema calls the entity
   `CLASS_SESSION`.

---

## Keeping them current

These diagrams describe a moving target. The as-built ones go stale first —
they are pinned to a branch and a date, so re-derive them after any change to
the collection layout, the security rules, or the Cloud Functions. The
design-level ones only change when the intended design changes, which should be
a deliberate decision rather than a side effect.

*Generated 30 July 2026 against branch `security/hardening-remediation`.*
