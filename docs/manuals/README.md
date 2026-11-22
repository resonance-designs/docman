# User and QA manuals

Built for the current DocMan 3.0.0 Vue working tree, including the local account,
notification, public-sharing and full category/book/team/project management changes. The edition is dated 20 November 2026.
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

Management procedures and QA cases were refreshed on 20 November 2026. Generated execution worksheets remain blank (`NOT RUN`); these documents do not assert live deployment acceptance.
