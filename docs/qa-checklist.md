# 48-Hour Website Repair Sprint

## QA and Release Checklist

Use **Pass / Fail / Blocked / N/A** for every applicable check and attach concise evidence. A checked box alone is not proof. The signed proposal's acceptance criteria take priority over this general checklist.

**Engagement reference:** [Reference]<br>
**Website/environment:** [URL/environment]<br>
**Tester:** [Name]<br>
**Test date/time/timezone:** [Timestamp]<br>
**Build/release identifier:** [Identifier]

### 1. Authorization and safety gate

- [ ] Proposal, scope, and acceptance tests are accepted.
- [ ] Customer authority and written access/change authorization are recorded.
- [ ] Only the systems and accounts listed in the intake are being accessed.
- [ ] Upfront payment is confirmed.
- [ ] Backup reference and timestamp are recorded.
- [ ] Rollback steps and decision-maker are confirmed.
- [ ] Maintenance/change window is approved.
- [ ] Known sensitive-data constraints are recorded.
- [ ] Credentials are handled through the approved secure method and are absent from reports/logs/screenshots.
- [ ] No suspected compromise, unlawful instruction, or unauthorized target is present.

**Stop condition:** Do not deploy if authorization, backup/rollback, access scope, or a material safety question is unresolved.

### 2. Reproduction and baseline

- [ ] Each agreed defect is reproducible or its non-reproducible status is documented.
- [ ] Baseline screenshots/logs/measurements are timestamped.
- [ ] Test device, browser, viewport, account state, and URL are recorded.
- [ ] Current production behavior and known pre-existing defects are separated from the proposed repair.
- [ ] Customer-provided impact statements are not presented as independently verified facts unless tested.

### 3. Change review

- [ ] Every material change maps to an included scope item.
- [ ] No unrelated content, accounts, data, settings, or systems were changed.
- [ ] Files/settings changed are recorded.
- [ ] Debug code, test accounts, placeholder content, and temporary flags are removed or documented.
- [ ] Third-party code/assets are approved and their licenses are compatible.
- [ ] Secrets, API keys, personal data, and environment-specific values are not committed or exposed.
- [ ] New findings or scope changes have written customer approval before implementation.

### 4. Functional testing

- [ ] Primary navigation works.
- [ ] Agreed links and calls to action reach the intended destinations.
- [ ] In-scope forms validate, submit, show the correct state, and deliver/store data as authorized.
- [ ] Error and empty states are understandable and do not expose sensitive details.
- [ ] Authentication/account behavior is tested if explicitly in scope.
- [ ] Search, filters, checkout, embeds, downloads, or integrations are tested if explicitly in scope.
- [ ] Browser console and relevant server/application logs show no new material errors from the repair.
- [ ] Cache/CDN behavior is refreshed and tested if relevant.
- [ ] The agreed acceptance test for every repair passes or is marked Fail/Blocked with evidence.

### 5. Responsive and visual testing

- [ ] Agreed mobile viewport(s) pass.
- [ ] Agreed tablet viewport(s) pass.
- [ ] Agreed desktop viewport(s) pass.
- [ ] Content does not overlap, clip, or create unintended horizontal scrolling.
- [ ] Navigation, dialogs, menus, and interactive controls remain usable.
- [ ] Images and media load at appropriate dimensions and do not distort.
- [ ] Typography, focus, hover, active, loading, success, and error states are checked where affected.
- [ ] Changed components remain consistent with the existing site unless a different direction was approved.

### 6. Browser and device matrix

| Browser/device | Version/OS | Viewport | Result | Evidence/notes |
|---|---|---|---|---|
| [Target 1] | [Details] | [Size] | [Status] | [Reference] |
| [Target 2] | [Details] | [Size] | [Status] | [Reference] |
| [Target 3] | [Details] | [Size] | [Status] | [Reference] |

Do not imply support for untested environments.

### 7. Accessibility checks within scope

- [ ] Changed interactive elements are reachable and operable by keyboard.
- [ ] Focus order and visible focus are usable.
- [ ] Changed controls have appropriate accessible names and labels.
- [ ] Heading/order semantics remain reasonable on affected pages.
- [ ] Images changed in the sprint have appropriate alternative text treatment.
- [ ] Color contrast of changed content is checked where practical.
- [ ] Form errors are identified in text and associated with relevant fields.
- [ ] Zoom/reflow behavior is checked on affected pages.
- [ ] Automated-check findings are manually reviewed rather than treated as certification.

These checks are limited QA, not a compliance certification or guarantee.

### 8. Performance and technical checks within scope

- [ ] A consistent before/after test method and environment are recorded.
- [ ] Images, fonts, scripts, and styles changed in the sprint load successfully.
- [ ] No obvious new render-blocking, payload, or repeated-request regression is introduced.
- [ ] Lazy loading, caching, compression, or minification is checked if affected.
- [ ] Core templates/pages affected by the repair return expected HTTP status codes.
- [ ] Performance results are reported as measurements, not guaranteed future scores.

### 9. Security and privacy hygiene within scope

- [ ] HTTPS and mixed-content behavior are checked on affected pages.
- [ ] Changed forms use the intended secure submission endpoint.
- [ ] Input/output handling changed in the sprint is reviewed for obvious validation/encoding issues.
- [ ] Error messages and logs do not expose secrets or unnecessary personal data.
- [ ] Permissions granted for the sprint follow least privilege.
- [ ] New dependencies/plugins are necessary, maintained to a reasonable degree, approved, and recorded.
- [ ] Tracking, cookies, or data collection were not added or materially changed without customer approval.
- [ ] Temporary data and diagnostic exports have a documented deletion/return plan.

These checks are not penetration testing, incident response, or a security/privacy guarantee. Stop and escalate suspected compromise or unexpected regulated/sensitive data.

### 10. SEO and sharing checks within scope

- [ ] Affected pages retain the intended title, description, canonical, robots, and indexing behavior.
- [ ] Redirects and changed URLs behave as approved.
- [ ] Structured data changed in the sprint is syntactically checked.
- [ ] Social sharing metadata and preview image work if affected.
- [ ] Sitemap/internal-link changes are checked if relevant.

No ranking or traffic outcome is guaranteed.

### 11. Regression and deployment

- [ ] Critical unaffected paths selected in the proposal still work.
- [ ] Staging test passed before production deployment, if staging exists.
- [ ] Production deployment matches the tested release identifier.
- [ ] Post-deployment smoke tests pass on production.
- [ ] Monitoring/logs are checked for new material errors during the agreed observation period.
- [ ] Any failure triggered rollback or an approved remediation decision.
- [ ] Deployment time, deployer, result, and any interruption are recorded.

### 12. Evidence and handoff

- [ ] Delivery report maps each included item to work, test, result, and evidence.
- [ ] Before/after evidence contains no unnecessary secrets or personal data.
- [ ] Known limitations, blocked checks, and pre-existing issues are clearly labeled.
- [ ] Customer actions have an owner and due date.
- [ ] Final BTC invoice states USD amount, BTC amount, rate source, rate timestamp, address, network, expiry, confirmations, and fee responsibility.
- [ ] Payment-address verification instructions do not request a seed phrase or private key.
- [ ] Customer has been asked to revoke temporary access and rotate shared credentials.
- [ ] No customer name, logo, screenshot, metric, testimonial, or case study is approved for publicity unless separate written permission exists.

### 13. Release decision

**Overall result:** [Pass / Pass with documented limitations / Fail / Blocked / Rolled back]

**Open issues and owners**

| Issue | Status | Owner | Next action | Due |
|---|---|---|---|---|
| [Issue] | [Status] | [Owner] | [Action] | [Date] |

**Release approved by provider:** [Name/date/time]<br>
**Customer deployment approval, if required:** [Name/reference/date/time]<br>
**Rollback decision, if applicable:** [Name/reference/date/time]

Do not mark the sprint complete solely because the 48-hour window elapsed. Completion must match the agreed deliverables and record unresolved items honestly.
