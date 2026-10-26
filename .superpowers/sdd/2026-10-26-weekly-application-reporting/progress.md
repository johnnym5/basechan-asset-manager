# SDD ledger — plan: docs/superpowers/plans/2026-10-26-weekly-application-reporting.md

Original implementation (Tasks 1–7) was completed in the previous turn. Approved follow-up completed in this turn.

- Task 8: complete — owner-scoped personal templates, personal library index, universal starter, revised count rules and Firestore rules. Admins can also save a personal copy for their own weekly reporting.
- Task 9: complete — first-run two-stage setup wizard; edit/copy/save personal templates; select saved templates for weekly entry; retain draft and immutable submit flow.
- Task 10: complete — admin creates shared templates, staff access is granted separately, per-staff template assignment UI removed.
- Verification: `npm run typecheck` passed; `git diff --check` passed with Git LF-to-CRLF normalization warnings only.
- Tests were not added or run under the current session instruction. Firestore rules were not compiled in an emulator.

Rulings:
- Ruling: keep at most one APPLICATION-kind personal template in a weekly report — the weekly report has one unambiguous application total and its breakdown; cost if wrong: staff cannot combine two application layouts in one week.
- Ruling: arithmetic validation is based on stable metric IDs; renaming preserves checks, and deleting a metric disables only equations that require it.
- Ruling: keep deleted template IDs in the staff library index — previously saved drafts may still contain a snapshot and need to be submittable; cost if wrong: a deleted ID remains accepted for a report snapshot even though the template is no longer selectable.
- Ruling: retain the existing branch/worktree because native execution was chosen and the user explicitly said proceed.
