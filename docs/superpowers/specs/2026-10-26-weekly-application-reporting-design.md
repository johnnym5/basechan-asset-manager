# Weekly Application and Lead Reporting Design

## Status and scope

This specification updates the staff reporting design for application and lead tracking. It replaces the earlier flexible, generic report-table workflow where the two conflict. It covers reusable admin templates, per-staff access, weekly report drafts and submissions, application and offer totals, and week-over-week graphs. Existing reporting areas such as late unlocks and admin submission oversight remain unless they conflict with this design.

## Goals

- Give administrators control over which staff can access reporting and which shared templates they may use.
- Provide reusable Application and Lead report templates, with the Application template prefilled from the supplied metric list.
- Allow a staff member to include up to five assigned templates in a weekly report and add personal metrics to each selected template.
- Let staff save drafts and submit reports as distinct actions.
- Show numeric metrics as graphs and allow comparison of the current report with selected prior reports, labeled by ISO week number.
- Enforce the application and offer count relationships defined below.

## Roles and access

- Administrators can create, edit, and save shared templates; assign report access and available templates to individual staff; view staff reports; and use the reporting workflow themselves.
- Staff without reporting access cannot open reporting or read/write report data.
- Staff with reporting access can choose from their assigned templates, save drafts, submit reports, and view or compare their own reports.
- Staff can use no more than five distinct templates in one weekly report. The limit is per report, not per account.
- Administrators can grant access to the reporting page separately from the ability to create or submit reports if the existing access grant model supports those distinct actions. Template assignment determines which templates are available to the staff member.

## Templates

### Application template

The shared default Application template starts with these numeric metrics:

- Lead Assigned
- Documents Received
- Prospective
- Non Prospective
- Duration of Ad
- Future Leads
- Not Concluded
- Application Submitted

The following application breakdown is also included in the Application reporting experience:

- Total Applications
- Applications by channel: B2B, B2C, and Subagents
- Within each channel: Conditional Offers, Unconditional Offers, and Awaiting Offers

“Application Submitted” is a separate pipeline metric. It is not added to Total Applications or used in the channel/offer arithmetic.

### Lead template

The Lead template is a shared, admin-managed template. The request supplied no Lead-specific starter metrics, so it begins with no preset metrics until an administrator adds them. Staff can add their own metrics to a selected Lead template.

### Template lifecycle

- Administrators create and save reusable organization templates and assign each template to staff.
- Staff choose up to five templates for a given week. The weekly report records a snapshot of each chosen template, so later edits to shared templates do not rewrite report history.
- Staff may add personal metrics to their selected template copies. These additions apply to that staff member’s report and do not modify the shared template.
- Template identity, template owner/admin, and staff assignment are persisted so permissions can be enforced when templates are read and reports are written.

## Weekly report workflow and data

- A weekly report belongs to one staff member and an ISO week (year plus week number).
- The report contains the selected template snapshots and numeric values for each metric.
- Draft save persists current values with `DRAFT` status and does not count as a submitted report.
- Submit persists the values with `SUBMITTED` status and a submission timestamp. Draft and submitted states remain separate in admin oversight.
- Reopening a draft restores its saved template selections and entered values.
- A submitted report’s metric definitions and values remain historically stable if a template is subsequently edited.

## Count rules and validation

For each weekly Application report:

1. `B2B applications + B2C applications + Subagents applications = Total Applications`.
2. For each channel independently: `Conditional Offers + Unconditional Offers + Awaiting Offers = applications in that channel`.
3. Each application is assigned to exactly one of the three channels for this breakdown.
4. `Application Submitted` is recorded separately and is excluded from both equations.
5. Values are non-negative whole-number counts. The interface should show the expected total and the entered total, and prevent submission when the equalities do not hold. Drafts may be saved while incomplete or inconsistent, with a visible validation state.

Other Application and Lead metrics are weekly numeric values. No extra arithmetic relationship is imposed on those metrics.

## Graphs and comparisons

- The X-axis lists metrics; the Y-axis represents the numeric count entered for each metric.
- A weekly graph can display the current report and multiple selected prior reports as overlaid series. Each series is labeled with its ISO week number and year where needed to disambiguate (for example, Week 43, Week 44, Week 45, Week 48).
- For a given metric, each series plots that report’s value. Comparisons use the same metric definitions from the report snapshots; metrics absent from a selected report are omitted for that series or shown as missing, never treated as zero without an explicit zero value.
- Graph selection is limited to reports belonging to the same staff member for staff users. Administrators may inspect a selected staff member’s history.
- The graph supplements the entered values with visible labels/tooltips so exact counts remain readable.

## Admin experience

- Provide an admin area to create, edit, and save shared templates, including metric labels and numeric metric definitions.
- Provide per-staff controls to grant reporting access and assign one or more templates.
- Preserve the existing weekly submission matrix and individual report inspector, extending report views to support multiple selected templates and the new graphs.
- Admins can use the same templates and weekly report workflow as staff.

## Data and security requirements

- Store shared templates, staff/template assignments, report template snapshots, metric values, report status, staff identity, ISO week/year, and timestamps in Firestore.
- Firestore rules must verify reporting access for staff reads and writes; client-side page hiding alone is insufficient.
- Firestore rules or trusted server validation must enforce that staff can only read and write their own reports and only use templates assigned to them. Admins can manage shared templates and inspect reports.
- Staff cannot change shared template definitions or another person’s assignment. Staff-specific metric additions belong to that user’s report/template copy.
- Submitted report snapshots must be immutable to staff. Any administrative correction must preserve an audit trail or be explicitly disallowed; implementation must choose and document the existing project-consistent policy before coding.
- Migration must preserve historical weekly reports and existing template documents. Legacy reports should remain readable; they may not satisfy the new channel equations and must not be silently rewritten.

## UI and implementation boundaries

Expected areas of change include reporting types and services, admin template and staff assignment controls, weekly report editor, comparison graph, access grant configuration, and Firestore security rules. Monthly compilation should be reviewed for compatibility with multiple templates; it must not combine unrelated metrics merely because they share a label. Existing generic comparisons can remain for legacy reports if a safe migration is not feasible.

## Acceptance criteria

1. An administrator can create and save shared Application and Lead templates, edit their metrics, and assign templates to named staff members.
2. A staff member without reporting access cannot access reporting data; an authorized staff member sees only assigned templates and their own reports.
3. A staff member can select up to five assigned templates for a weekly report, add personal metrics, and save or restore a draft.
4. A staff member can submit a valid weekly report, and the admin matrix distinguishes draft from submitted reports.
5. The Application report validates channel totals and each channel’s offer-status totals according to the equations above. “Application Submitted” remains outside those totals.
6. A submitted report can be compared against multiple selected previous reports in a graph with metrics on X, counts on Y, and week labels for each series.
7. Editing a shared template does not alter prior report snapshots or stored metric values.
8. Legacy reports remain accessible without fabricated values or silent changes.

## Decisions and explicit assumptions

- The three channel categories are exclusive and sum to Total Applications; the user corrected an earlier statement to confirm this.
- The three offer statuses are mutually exclusive and sum to the applications count for their own channel.
- “Application Submitted” is a separate pipeline metric and not part of application totals.
- Staff add personal metrics to their report-specific template copy; they do not publish template changes for other staff.
- The Lead template has no default metrics until an administrator defines them, because no Lead metric list was provided.
- Counts are integers and equality validation blocks submission but does not block saving an incomplete draft.
- Multi-week graphs use one series per selected week and can show more than two reports at once.
