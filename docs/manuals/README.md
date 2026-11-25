# User and QA manuals

The QA guide was refreshed on **25 November 2026** for the 3.1.0 working tree plus
pending My Profile and notification changes on `feature/ui-updates-profile`.
It includes tabbed settings, UI customization, stable-release updates and helper
refresh, profile/photo/password edits, update broadcasts and security notices.
Record both application and installed-helper revisions before execution; a version
label alone does not prove that the pending features are deployed.

The separately maintained end-user manual remains the **20 November 2026** edition;
it has not been rewritten as part of this QA refresh. Use the current feature guides
for My Profile, UI customization, activity notifications and web updates.
These are guides, not claims of deployment or completed acceptance testing.

- [End-user source](user-manual.md)
- [QA guide source](qa-end-to-end-guide.md)
- [Generated API appendix](qa-api-appendix.md)
- [API route inventory](api-route-inventory.csv)
- [Blank QA execution sheet](qa-results-template.csv)
- [User PDF](../../output/pdf/docman-user-manual.pdf)
- [QA PDF](../../output/pdf/docman-qa-end-to-end-guide.pdf)

The user manual contains four labeled vector illustrations. They are explanatory
diagrams, not screenshots of a deployed system. No organization-specific mail
workaround, credentials or private test-user identity is included.

## Rebuild

From the repository root, with Python available:

```sh
python -m pip install --target tmp/pdf-deps reportlab
python scripts/documentation/build_manuals.py
```

Expected: two PDFs under `output/pdf`, a refreshed mounted-route inventory and
API appendix, and a results template with every row set to `NOT RUN`.
**Copy the results template to a separate run-specific file before recording
results. Rebuilding overwrites the template; it must not hold live test results.**

For a QA-only documentation change, use `python scripts/documentation/build_manuals.py --qa-only`.
This refreshes the QA PDF, mounted-route inventory, API appendix and blank results
sheet while preserving the end-user PDF. The PDF cover records the build-time
package version and Git revision, including whether working-tree changes exist.

The builder uses Segoe UI on Windows, DejaVu Sans where installed on Linux,
or Helvetica as a fallback. No browser, database or mail service is required to
build the documents. It does not run the app's test cases or send email.

## PDF verification

Install a renderer and image tools in the isolated dependency folder:

```sh
python -m pip install --target tmp/pdf-deps pymupdf pillow
python scripts/documentation/verify_manuals.py
```

Expected: no text outside page-safe bounds, no duplicate case IDs, all cases
present in the QA PDF, and page PNGs/contact sheets under `tmp/pdfs`. Review the
latest rendered pages visually for clipping, unreadable figures and broken
page breaks. Do not use text extraction alone as layout acceptance.

When changing features, update the source manuals and rebuild both PDFs. The
route appendix is generated from the actual `server.js` mounts and explicit
router declarations; inspect its output if route declarations become multiline
or dynamic. A generated route row is an execution obligation, not proof of
coverage or passing authorization.

Generated execution worksheets remain blank (`NOT RUN`); these documents do not assert live deployment acceptance. The updater password-feedback/three-attempt improvement remains explicitly deferred; its requested behavior is not an implemented acceptance expectation.
