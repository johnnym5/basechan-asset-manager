# Weekly Application and Lead Reporting Design

## Status and scope

This specification updates the staff reporting design for application and lead tracking. It replaces the earlier flexible, generic report-table workflow where the two conflict. It covers a universal default starter, staff-owned customized templates, admin-created shared templates, a first-run setup wizard, per-staff access, weekly report drafts and submissions, optional application and offer totals, and week-over-week graphs. Existing reporting areas such as late unlocks and admin submission oversight remain unless they conflict with this design.

## Goals

- Give administrators control over which staff can access and generate reports.
- Give every staff member with report-generation access the same universal default starter template, combining all supplied metrics.
- Let each staff member add, remove, and rename metrics, then name and save personal templates for reuse.
- Let administrators create and save shared starter templates that staff can copy and customize.
- Allow a staff member to include up to five saved templates in a weekly report.
- Let staff save drafts and submit reports as distinct actions.
- Show numeric metrics as graphs and allow comparison of the current report with selected prior reports, labeled by ISO week number.
- Enforce the application and offer count relationships defined below.

## Roles and access

- Administrators can create, edit, and save shared starter templates; grant report access to individual staff; view staff reports; and use the reporting workflow themselves.
- Staff without reporting access cannot open reporting or read/write report data.
- Staff with reporting access can complete setup, manage their own saved templates, save drafts, submit reports, and view or compare their own reports.
- Staff can use no more than five distinct saved templates in one weekly report. The limit is per report, not per account.
- The default starter is available to all staff with report-generation access; it is not individually assigned.
- Admin-created shared templates are available to staff as starters; staff copy them into personal templates before customizing.
- Administrators grant reporting access and report-generation permission separately where supported; permissions determine whether the staff member may read or create/submit reports.

## Templates

### Universal default starter

The system provides one universal default starter to every staff member with report-generation access. It combines all of the following metrics into one template. These metrics are editable by the staff member in their personal copy.

The starter includes these numeric pipeline metrics:

- Lead Assigned
- Documents Received
- Prospective
- Non Prospective
- Duration of Ad
- Future Leads
- Not Concluded
- Application Submitted
- Conversion

The starter also includes this optional application breakdown:

- Total Applications
- Applications by channel: B2B, B2C, and Subagents
- Within each channel: Conditional Offers, Unconditional Offers, and Awaiting Offers

“Application Submitted” is a separate pipeline metric. It is not added to Total Applications or used in the channel/offer arithmetic.

### Template lifecycle and setup wizard

On first use, staff follow these stages:

1. **Start with the default:** the universal starter is preloaded with the combined pipeline and application metrics.
2. **Customize metrics:** staff can add, remove, or rename metrics. Renaming preserves a metric’s stable ID. Removing a metric removes it from the applicable arithmetic validation, as described below.
3. **Name and save:** staff name the customized template and save it to their personal template library. They can repeat setup to create more personal templates.
4. **Build a weekly report:** staff select up to five personal or copied shared templates, enter that week’s values, and save a draft or submit.
5. **Compare weeks:** submitted reports can be overlaid with selected prior reports, labeled by ISO week number and year.

A staff member may edit their own saved templates for future reports. Each saved weekly report snapshots its template and metric definitions, so template edits do not change historical reports. Staff customizations do not modify the universal default or shared admin templates.

Administrators can create and save shared starter templates. Staff can copy a shared template into their personal library before customization. Template identity and owner are persisted for access control.

## Weekly report workflow and data

- A weekly report belongs to one staff member and an ISO week (year plus week number).
- The report contains the selected template snapshots and numeric values for each metric.
- Draft save persists current values with `DRAFT` status and does not count as a submitted report.
- Submit persists the values with `SUBMITTED` status and a submission timestamp. Draft and submitted states remain separate in admin oversight.
- Reopening a draft restores its saved template selections and entered values.
- A submitted report’s metric definitions and values remain historically stable if a template is subsequently edited.

## Count rules and validation

For a weekly report whose selected template still contains the relevant metrics:

1. When Total Applications and all three channel application metrics are present: `B2B applications + B2C applications + Subagents applications = Total Applications`.
2. For a channel where its application metric and all three offer-status metrics are present: `Conditional Offers + Unconditional Offers + Awaiting Offers = applications in that channel`.
3. Each application is assigned to exactly one of the three channels for this breakdown.
4. `Application Submitted` is recorded separately and is excluded from both equations.
5. Renaming preserves metric identity and validation. Removing any metric required by an equation disables that equation; other complete equations continue to be validated. Adding metrics creates no implicit arithmetic rules.
6. Present count values must be non-negative whole numbers. Prevent submission when any enabled equality fails or a present count is invalid. Drafts may be saved while incomplete or inconsistent, with a visible validation state.

Other Application and Lead metrics are weekly numeric values. No extra arithmetic relationship is imposed on those metrics.

## Graphs and comparisons

- The X-axis lists metrics; the Y-axis represents the numeric count entered for each metric.
- A weekly graph can display the current report and multiple selected prior reports as overlaid series. Each series is labeled with its ISO week number and year where needed to disambiguate (for example, Week 43, Week 44, Week 45, Week 48).
- For a given metric, each series plots that report’s value. Comparisons use the same metric definitions from the report snapshots; metrics absent from a selected report are omitted for that series or shown as missing, never treated as zero without an explicit zero value.
- Graph selection is limited to reports belonging to the same staff member for staff users. Administrators may inspect a selected staff member’s history.
- The graph supplements the entered values with visible labels/tooltips so exact counts remain readable.

## Admin experience

- Provide an admin area to create, edit, and save shared starter templates, including metric labels and numeric metric definitions.
- Provide per-staff controls to grant report-reading and report-generation access. The universal default requires no per-staff template assignment.
- Preserve the existing weekly submission matrix and individual report inspector, extending report views to support multiple selected templates and the new graphs.
- Admins can use the same templates and weekly report workflow as staff.

## Data and security requirements

- Store shared templates, owner-scoped staff templates, the personal-library index, report template snapshots, metric values, report status, staff identity, ISO week/year, and timestamps in Firestore.
- Firestore rules must verify reporting access for staff reads and writes; client-side page hiding alone is insufficient.
- Firestore rules or trusted server validation must enforce that staff can only read and write their own reports and personal templates. Admins can manage shared templates and inspect reports. Legacy admin template assignments remain readable during migration, but they are not needed for the universal starter.
- Staff cannot change shared template definitions or another person’s templates. Staff-created metrics and edits belong to that user’s personal template.
- Submitted report snapshots are immutable to staff and administrators. Administrative edits and deletion of submitted reports are disallowed; corrections require a new submitted report or a separate audited correction workflow.
- Migration must preserve historical weekly reports and existing template documents. Legacy reports should remain readable; they may not satisfy the new channel equations and must not be silently rewritten.

## UI and implementation boundaries

Expected areas of change include reporting types and services, admin shared-template and staff personal-template controls, the staff setup wizard, weekly report editor, comparison graph, access grant configuration, and Firestore security rules. Monthly compilation should be reviewed for compatibility with multiple templates; it must not combine unrelated metrics merely because they share a label. Existing generic comparisons can remain for legacy reports if a safe migration is not feasible.

## Acceptance criteria

1. Staff with report-generation access receive the universal combined default starter without individual template assignment.
2. A staff member can complete the setup wizard, add/remove/rename metrics, name and save a personal template, and create additional personal templates.
3. An administrator can create and save shared starter templates; a staff member can copy one into their personal library.
4. A staff member without reporting access cannot access reporting data; authorized staff see their own templates and reports.
5. A staff member can select up to five saved templates for a weekly report, enter values, and save or restore a draft.
6. A staff member can submit a valid weekly report, and the admin matrix distinguishes draft from submitted reports.
7. Complete application and offer equations are validated by stable metric IDs; removing a required metric disables only its affected equation. “Application Submitted” remains outside those totals.
8. A submitted report can be compared against multiple selected previous reports in a graph with metrics on X, counts on Y, and week labels for each series.
9. Editing a personal or shared template does not alter prior report snapshots or stored metric values.
10. Legacy reports remain accessible without fabricated values or silent changes.

## Decisions and explicit assumptions

- The three channel categories are exclusive and sum to Total Applications; the user corrected an earlier statement to confirm this.
- The three offer statuses are mutually exclusive and sum to the applications count for their own channel.
- “Application Submitted” is a separate pipeline metric and not part of application totals.
- Staff create personal templates from the universal default or copies of admin-created shared templates; personal edits do not affect other staff.
- Metric IDs, not labels, determine whether a metric participates in application/offer arithmetic validation.
- Counts are integers and equality validation blocks submission but does not block saving an incomplete draft.
- Multi-week graphs use one series per selected week and can show more than two reports at once.
- Submitted report correction and deletion are disallowed for administrators in this implementation, preserving the submitted snapshot.
