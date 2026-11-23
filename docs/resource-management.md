# Resource management

The Vue app supports managing categories, books, teams and projects from the existing navigation. These changes do not require a database migration. Deploy the backend and rebuilt Vue frontend together.

## Categories

Admins and superadmins can create, edit and delete categories. Choose **Document** or **Book** to match its use. A category referenced by a document (including a soft-deleted document) or book cannot be deleted or have its type changed. Reassign those records first. Names are required; duplicate names are rejected.

## Books

Editors and higher roles can create books. Editor/admin owners and superadmins can manage an existing book. Select a Book category and owners, then use the details screen to link or unlink accessible documents. Metadata saves preserve existing document associations. Removing a link does not delete a document; deleting a book removes its team/project links.

Book creation/editing, document creation/category reassignment, and category deletion/type changes share the database guard `locks.category-book-references`. A concurrent request returns HTTP 409; retry after the other request finishes. The guard does not expire while a slow write is running. Release retries transient failures while matching its own holder. If its process crashes or release retries are exhausted, a server diagnostic identifies the retained guard and these operations stay blocked rather than risk invalid category references.

For a persistent conflict after a crash or release failure, an administrator must stop **all application processes and other writers using this database**, confirm their in-flight writes have ended, and inspect affected documents/books/categories before recovery. In an authenticated MongoDB shell with `docman` selected, read the guard and clear only the holder inspected:

```javascript
const guard = db.systemsettings.findOne({ key: "locks.category-book-references" });
if (!guard?.value?.holder) throw new Error("STOP: no retained holder found; investigate instead of clearing blindly.");
db.systemsettings.updateOne(
  { key: guard.key, "value.holder": guard.value.holder },
  { $set: { value: {} } }
)
```

Expected: `acknowledged: true` and `matchedCount: 1`. If the holder changed or the operation fails, keep writers stopped and investigate. Restart the stopped writers only after successful recovery, then retry the operation. Never clear it while another writer could still be active. This coordination covers book/category APIs and document API writes that set or change a category; it does not serialize direct database edits.

## Teams

Editors and higher roles can create teams. Owners, team admins and superadmins can manage members and roles; only owners/superadmins can delete a team. Viewers can inspect their teams without gaining management rights. Team membership does not grant access to every linked document.

Add an existing active account directly or send a team invitation. New accounts must first be invited by a superadmin through **Users** and activate their accounts. Team invitees accept in **Activity** while signed in as the invited account. Invitation tokens are omitted from team-management responses. Owners can allow members with editor-or-higher application roles to invite other members. Inviting a team admin requires team-management rights.

## Projects

Editors and higher roles can create projects using accessible teams. Owners, project managers and superadmins can edit metadata, manage direct collaborators and link resources. Direct collaborators must belong to a linked team. Team membership also provides inherited project access; removing a direct collaborator does not remove inherited access. Owners cannot remove themselves or change their owner role through collaborator controls.

Status, priority, tags and optional dates can be edited. Clearing an optional date removes it. An end date cannot precede a start date. Book/document links organize resources without changing document assignments or approval policies.

## Acceptance checks after deployment

Use synthetic records and at least an owner/editor, another editor and an unrelated viewer. Record each result; this checklist is not evidence of a live pass.

1. Create and edit both category types. Assign a category to a record and verify deletion/type change is rejected. Verify unused-category deletion succeeds.
2. Create a book, edit its owners, link/unlink a readable document and confirm the underlying document survives. Verify a non-owner cannot modify it, including a direct API request.
3. Create a team, add a member, change their role, invite another active account and accept in Activity. Verify a different account cannot accept the invitation and a consumed invitation cannot be reused.
4. Verify team admins can manage members, ordinary members cannot promote themselves, and the owner cannot be removed. Test leaving and deleting with confirmation.
5. Create a project, select its teams, add a qualifying collaborator, change their role, and clear optional dates. Verify invalid date ordering is rejected.
6. Link/unlink books and documents on teams/projects. Verify private documents remain unavailable to unauthorized users, including guessed IDs. Verify unrelated users cannot list/open private teams or projects.
7. Delete test books/teams/projects and check surviving resource links. Deletion and association cleanup use separate writes; investigate partial failures before retrying.
8. Check empty states, retry after failed requests, duplicate names, cancelled deletion, keyboard operation and narrow-screen forms.

Local unit/build/browser-fixture checks do not establish real database, SMTP or multi-user deployment acceptance. Full live acceptance remains pending. The PDF manuals include these screens and their acceptance procedures.

## Local verification — November 20, 2026

- Vue production build passed; the existing large-bundle advisory remains.
- 43 backend management regression tests passed (validation/reference guards, populated membership, project access and book deletion cleanup).
- 11 frontend permission/payload/calendar-date tests passed.
- 48 account, notifications and public-sharing regression tests passed.
- Independent browser review with synthetic API fixtures passed at 1440, 768 and 375 pixels, including list/create screens and book/team/project details. No page errors or page-level horizontal overflow were observed. This was not a live database or mail test.
- Follow-up browser check confirms shared account actions fit at 375 pixels; failed-load retries and viewer project access also passed with synthetic fixtures. Both PDF manuals were refreshed.

Linking a project to a team requires project owner/manager rights (or superadmin) as well as team resource-management permission, because it gives the team's members inherited project access. The project selector only offers qualifying projects.

Follow-up verification also passed 84 invitation, account-administration, email-settings and storage-encryption checks (186 focused tests total across this pass). Review calendar dates now retain their stored day across timezones; creation/update timestamps remain localized.
