# Verity clickable concept

Open `index.html` in a modern browser, or run the local preview server from the repository root:

```powershell
& 'C:\Users\euris\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' wireframe/serve.py
```

Then visit http://127.0.0.1:5173/wireframe/index.html.

## What to explore

- Home: subject navigation, next study step, proposed opportunity route.
- Study Studio: six subject examples; diagram steps; Physics label editing; class source and notes modes; clearly scripted tutor.
- Practice: setup, three first-answer questions per subject, feedback, completed result saved into Progress.
- Progress: topical records, six-axis overview with text equivalents, manually editable Physics exam mark, 50/50 and 70/30 formula comparison.
- Opportunities: fictional listings; search, format/cost/eligibility filters, save state, explicit missing information, practical support checklist, proposed application preparation.
- Portfolio: sample evidence, private local entry creation, self-report labels, sharing-controls preview.
- Connections: simulated Classroom connection, filename-only upload placeholder, manual exam entry, unavailable-source state.
- Concept map: clickable flow connectors, original/proposed feature boundaries, Challenge 4, and an organiser-side alternative.

## Recommended walkthrough

Home → Physics → Next step → My notes → Practice → answer three questions → Progress → compare score formulas → Opportunities → filter and save → See the details → Support checklist → Portfolio → Add an experience → Concept map.

## Assumptions and limitations

This is a design artifact, not the actual service. The original extension files and supplied DOCX remain unchanged. The mascot is referenced from the existing static asset; additional poses have named placeholders.

No AI generation, Classroom API, real opportunity feed, application submission, remote sharing, credential verification, backend, or school account exists here. Demo data and original-feature assumptions are documented in `../PRODUCT.md`. Practice examples are fixed; repeating them does not establish learning transfer. Student and opportunity examples are fictional.

Local browser storage keeps preview changes. Reset demo clears only the `verity-wireframe-v1` key. File selection stores only a filename; no file contents are read. Support checkboxes in an individual checklist are intentionally temporary, while preference choices persist locally.

The original 50/50 and 70/30 formulas are both shown for discussion; neither is treated as validated. Opportunities do not use grades to rank careers. The challenge-focused additions are proposals for the team to debate.

## Verification performed

Browser checks on 13 September 2026:

- All eight route views loaded at 1440px and 390px without page-level horizontal overflow after the mobile Progress fix.
- Study, Progress, Opportunities and Concept map also checked at 768px.
- All six subject selectors rendered their matching lesson.
- Diagram steps and Physics label edit, local note save, and clearly scripted chat response exercised.
- A Physics quiz with two correct and one incorrect answer produced 2/3, saved 67% as its displayed practice percentage, and appeared in Progress. The comparison uses displayed whole-number percentages: with a 60% exam, 50/50 displays 64%, and 70/30 displays 65%.
- Cost and institution filters, opportunity save, detail/support dialogs, matching search and empty search state exercised.
- A portfolio entry persisted after reload; simulated connector and manual exam edits exercised.
- Mobile drawer navigation opened and closed correctly; hidden navigation is inert. Skip link preserves the current route.
- Eight actual CSS foreground/background token pairs were calculated at 6.21:1 or higher (body/secondary text, gold actions, and subject/status tags). This is a token check, not a full accessibility conformance audit.
- JavaScript syntax check passed. Existing extension files remain unchanged.

No real AI, Google Classroom, organiser, placement, school, or end-to-end service integration was tested because those services are deliberately absent.
