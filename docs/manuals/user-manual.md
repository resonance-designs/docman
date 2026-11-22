# DocMan user manual

Edition: 20 November 2026 | DocMan 3.0.0, current Vue interface

## 1. Start here

DocMan lets you upload documents, give people access, replace files with newer versions, and approve those versions before publication. You edit a downloaded file in its normal application, such as Word, and upload the revised file. DocMan does not provide live browser-based document editing.

This manual covers the current repository, including My account, activity email and public sharing changes that may not yet be installed on your server. Ask your administrator which build is deployed if a control is missing. Illustrations in this manual are explanatory diagrams, not screenshots or evidence of a live deployment.

You need the application address supplied by your administrator, a supported browser, network access to that address, and an activated account for private documents. An internal installation may require your organization's network or VPN. A public link removes the sign-in requirement; it does not remove network restrictions.

**Quick start:** accept your invitation, sign in, choose Documents, click Open beside a document, then Download beside the published version. If you are an editor, see section 6 to create a document. If you are an approver, see section 8.

## 2. Activate your account and sign in

1. Open the invitation email from your organization. Use the newest invitation if more than one arrived. Invitations expire after 24 hours.
2. Open its link in a browser that can reach DocMan. Keep the link private; do not paste it into a support ticket.
3. On Set up your DocMan account, read the displayed password requirement. Enter your chosen password in Password and Repeat password.
4. Click Activate account. A successful result says your account is activated and you can sign in.
5. Choose Sign in. Enter your Email or username and Password, then click Sign in with local DocMan account.
6. After signing in, open Documents. Your list contains documents your account is permitted to read.

If you see Invalid or expired invitation, ask a superadmin to resend it. A used invitation cannot set a second password. The setup form can still appear when a used link is opened; the rejection occurs when it is submitted. If there is no email, check junk mail, then ask the superadmin to inspect the existing pending account rather than creating a duplicate.

Some organizations enable Sign in with Resonance Account. Use that identity-provider flow when instructed. Local passwords and SSO passwords are separate. A Create a local account link appears only when local self-registration is enabled; otherwise request an invitation. Local self-registration currently creates a viewer account without mailbox verification.

**Success check:** you see the navigation menu and Sign out. Do not repeatedly retry a failed login: Too many login attempts means the rate limiter has temporarily blocked requests. Wait and contact your administrator if it persists.

## 3. Find your way around

The left navigation menu contains the areas available to your role. Use the menu button near RDocMan to open or close the menu on a smaller screen. The top toolbar provides My account, Activity and Sign out after login.

[[figure:navigation]]

- Documents: your document library and the starting point for uploads and downloads.
- Approvals: file versions awaiting a decision you are permitted to make. Click Refresh to update the list, then Review to open a document.
- Books and Categories: view collections and classification values; permitted roles can create and manage them.
- Teams and Projects: view your memberships, including read-only access for viewers. Editors and higher roles can create; ownership and assigned roles control management.
- Audit Log: administrative activity records; visible to admins and superadmins.
- Users and Authentik Linking: superadmin account administration.
- System Settings: administrative configuration; individual cards require the appropriate administrative role.

List pages include Search this view. This searches the rows already loaded into the page, not necessarily every record on the server. A no-results message does not prove a document does not exist. Clear the search, check your assignments and ask its owner if necessary.

## 4. Understand roles and assignments

Your account role and your assignment on a document work together. Being named an owner does not turn a viewer account into an editor. A team or project association does not automatically grant private document access.

[[figure:roles]]

- Viewer: reads documents assigned to them and downloads versions they are allowed to see. A designated viewer approver can make approval decisions; the assignment matters.
- Editor: can create documents. Can edit or upload replacements when they are the author or an owner.
- Admin: has broad document administration, including deletion and restoration; some global settings remain superadmin-only.
- Superadmin: additionally manages accounts, global account/email/public-sharing policies and audit integrity verification.

Document assignments are Author, Owners, Approvers, Stakeholders and Review Assignees. All grant private-document read access. Owners and authors with editor privileges can edit. Approvers decide whether versions are published; when there are no explicit approvers, owners are the fallback. Stakeholders and review assignees do not automatically gain editing or approval authority. External contact details are reference information, not account invitations or access grants.

Default approval policy requires one eligible approval and blocks uploaders from approving their own versions. The server can have different global policy settings: read the Approval required badge. Per-team and per-document majority/all-approver policy controls are not currently provided.

## 5. Open and download a document

1. Select Documents. Optionally type part of its title in Search this view.
2. Click Open on the matching row. Check its title, description, author, category and review dates.
3. Read the line under its title. Published version N identifies the current approved file. No published version yet means initial approval has not finished.
4. Scroll to Versions. Find the row marked Published and click Download.
5. Open the downloaded file in the appropriate application. Confirm it is the version you intended to use.

Published is a file-version status. Review open is a review-cycle status; a published file can still have an open scheduled review. Superseded versions are older approved files; they are not the current publication. Draft-related rows may be hidden from readers.

Encrypted at rest means the server stores encrypted bytes and decrypts authorized downloads. It does not mean the downloaded file remains encrypted. The current app does not ask you to distribute a separate document password or personal encryption key.

If download reports an integrity failure, stop using that copy and contact an administrator. Do not keep retrying or bypass the check. If access is denied, ask the owner to check assignments; a saved URL does not confer private access.

## 6. Create a document

You need an editor, admin or superadmin account. Have the file ready and decide who will own, approve and read it. No team or project is required.

1. Open Documents and click Create Document.
2. Fill Title and Description with meaningful text. Select Author and Category.
3. Enter Opens For Review. This is required even for an initial upload. Select Review Interval and Review Period. If you select a custom interval, provide a positive number of days.
4. Where appropriate, set Review Due Date and Next Review Due On. These dates describe scheduled review, not publication approval.
5. Select Document File. Read the maximum-size message; the limit is configured by your administrator, not fixed by this manual.
6. In Assignments, select Owners, Approvers, Stakeholders and Review Assignees as needed. Assign a separate approver if you are uploading under the default no-self-approval policy.
7. Add Review Notes if needed. Optional External Contacts rows include name, email, phone and type. A contact does not gain application access from this entry.
8. Click Create Document once and wait for the result.
9. On the details page, confirm title, assignments and the initial version. Under default policy it should say Awaiting approval, not Published.

**If saving fails:** correct the highlighted field. Required fields include title, description, author, category, Opens For Review and a file. If an error occurs after submission, check Documents before submitting again: document creation and review-task creation are separate requests, so the document may already exist.

**Date caution:** a one-day difference between a date entered in Edit and the date shown on details has been observed in POC testing. Report both displays and your time zone; do not compensate by deliberately entering the wrong date.

## 7. Edit details, share privately and replace a file

To change metadata or assignments, open the document, choose Edit, make the change and click Save Changes. Return to details and confirm it persisted. Use assignments to share a private document: select the intended user under the appropriate role, save, then give them the ordinary document URL. They must sign in and have network access.

Removing someone from every document assignment removes their ordinary private access unless an administrative role independently grants it. Removing just one assignment does not remove access granted by another assignment. Public links are a separate access path; see section 10.

To replace the file:

1. Download the current publication and edit it outside DocMan. Save the revised copy with recognizable content.
2. Return to the document's Versions panel and find Upload a new version.
3. Choose File, optionally enter a Version label, and fill What changed? with a useful explanation.
4. Click Submit for approval. If the server disables approvals, the action instead says Upload and publish.
5. Confirm the new row and its status. While replacement approval is pending, the earlier published file remains current.

Only one active pending/publication-in-progress version is permitted at a time. If upload controls are disabled, resolve the pending version first. Do not delete the document just to upload a replacement.

[[figure:workflow]]

## 8. Approve, reject or withdraw a version

**Approve:** open Approvals, click Review, download the pending file and inspect its contents. In Versions click Approve, optionally enter a comment and confirm. The decision is recorded with the actor and time. When the configured number of distinct eligible approvals is reached, the version becomes Published and the previous published version becomes Superseded.

With the default threshold of one, assigning several approvers does not mean all must approve. You cannot approve a version you uploaded under the default policy, even if you are a superadmin. An absent Approve button may also mean you are not an eligible approver or already approved.

**Reject:** click Reject on the pending version, enter the required reason and confirm. The version becomes Rejected and the current published file remains unchanged. Tell the uploader what must change. Submit a corrected new version rather than treating the rejected file as published.

**Withdraw:** where permitted, the uploader or authorized user can click Withdraw and confirm to stop a pending submission. The previous publication remains available. Withdrawn is not a deleted document.

**Retry publication:** if a version is stuck in publishing and the button is offered, an eligible user may retry publication. If it fails again, give support the document/version, time and message; do not repeatedly submit new versions.

## 9. Reviews, history and Activity

Scheduled reviews and version approval are different tasks. Review dates and assignees record who should review the documentation and when. The current Vue interface collects review assignments during creation/editing but does not provide a complete review-task inbox and completion interface. Ask an administrator how your organization operates those tasks; do not assume approving a file completes every scheduled review task.

On document details, Revision history shows metadata changes. Audit trail, when permitted, shows recorded document activity. Some readers cannot view audit history. Do not interpret missing access to an audit tab as missing records.

Click Activity in the top toolbar to read your in-app notices. Use Open document, Open teams or Open projects when shown. For a pending team invitation, click Accept team invitation while signed in as the invited account. Expect a success message, then open Teams to see the membership. An expired, already-used or mismatched invitation cannot be accepted. Ask a permitted team member to send a new invitation if yours expired. Click Mark read to mark a notice read. Opening a notice does not grant additional access to the linked item.

Activity email can notify you about changed assignments, account role/status, team/project membership, review tasks, publication, rejection and withdrawal. Email contains a generic event and a sign-in link; it does not attach the document. The normal queue polls about every 15 seconds, but delivery can take longer. A reminder scan runs hourly. Do not expect email for every login, download or unchanged save.

Resource names in notices depend on your current access; losing access can hide a name that was visible earlier. If a notice is missing, first check Activity and junk mail. Give your administrator the action, approximate time and affected account. Queuing/delivery failures are possible and need investigation; successful document saving does not guarantee email delivery.

## 10. Share a public link

Public sharing is optional and read-only. Anyone who receives or is forwarded the link can download the current published file without an account. Share only documents your organization permits to be public to everyone who can reach the server.

1. As an authorized document editor or administrator, open the document details page.
2. Find Public sharing. Read its explanation and check that a published version exists.
3. Click Enable public sharing. If a superadmin disabled new links, you cannot enable it.
4. Click Copy link, or select and copy the Public document link field manually.
5. Open it in a signed-out/private browser session. Confirm the title, filename and version, then choose Download published file.
6. Distribute that public link, not the private document URL. Later approved versions are served through the same link.
7. To revoke it, return to the document and click Disable public sharing. The old link stops working. Re-enabling creates a different link.

Public visitors cannot view assignments, audit records, private metadata or earlier/pending/rejected versions through the public page. Deleting a document blocks the public link. Restoring the document can reactivate its retained link; revoke it individually if it must never work again. No switch can recall copies already downloaded or cancel every request already in progress.

[[figure:public]]

Superadmins have two global switches. Allow public document sharing controls creation of new links. Disable existing public links while sharing is off determines whether existing links also stop working during the global shutdown. If that second switch is off, existing links remain usable. Turning the global feature on again restores suspended links; this differs from permanent individual revocation.

## 11. Manage your account

1. Click My account in the top toolbar.
2. In Profile, edit First name, Last name, Telephone, Job title, Department or About me.
3. Click Save profile. Expect Profile saved. Reload the page to confirm the values remain.
4. For a local password change, enter Current password, New password and Repeat new password.
5. Read the current minimum displayed above the fields and click Change password and sign out.
6. On success, click Sign in with your new password. Existing DocMan sessions are invalidated; the old password no longer works.

The configurable minimum is 14-24 characters, default 18; it is not a maximum. Passwords can be longer up to 72 UTF-8 bytes. Some non-ASCII characters use more than one byte. Spaces and punctuation are allowed; control characters are not. Changing the policy does not invalidate an existing shorter password, but applies the next time it is set.

Username, email address, role and account status are not editable here. Request username/email changes from a superadmin. SSO profile/password fields are managed in the identity provider. If you forgot your current local password, contact a superadmin: the current Vue login page does not expose a complete forgot/reset-password screen even though backend reset endpoints exist.

## 12. Books, Categories, Teams and Projects

These sections now include management screens. The controls you see depend on your account role and ownership or membership. Linking a document groups it; it does not replace that document's Owners, Approvers, Stakeholders or Review Assignees.

### Categories: classify documents and books

1. Choose Categories. Filter by Document or Book and use the page controls to inspect additional results. Search filters the loaded page.
2. As an admin or superadmin, choose Create category. Enter a meaningful name, optional description and the correct type, then save.
3. Expect the new category in the list. Edit changes its details; Delete asks you to confirm removal.
4. If a category is in use, deletion or changing its type is rejected. Reassign its documents/books first; retained deleted documents may still reference it. Ordinary users can inspect categories but cannot change them.

### Books: group related documents

1. Choose Books and select Create book as an editor, admin or superadmin.
2. Enter a title and optional description, select a Book category and the owners, then save. Create a Book category first if the selector is empty.
3. Open the book. Under Add a document, search the documents you can access, choose one and add its link. Expect it in the linked list.
4. Open follows the document link. Remove link removes it from this book only; the document and its files remain.
5. Editor/admin owners and superadmins can edit a book or confirm its deletion. Deleting the book also removes its team/project links, not the underlying documents. Editing metadata does not replace the linked-document list.

### Teams: manage people and resource links

1. Choose Teams. Viewers can inspect their own teams; editors and higher roles can choose Create team. Enter a name and optional description, then save. The creator is the owner.
2. Open a team. Owners, team admins and superadmins with the required application role can use Members to select an active user and their team role, then Add member.
3. Use the role selector to change a member between Member and Admin. Confirm Remove member when needed. You cannot remove the owner or change their owner role here.
4. To let someone accept membership, use Invitations: enter an existing active user's email, select the allowed role and choose Send invitation. The recipient signs in and accepts in Activity. A new account must first be invited through Users by a superadmin and activated.
5. Edit team can enable Allow members to invite other members. This applies to members whose application role is editor or higher; it does not allow ordinary members to appoint team admins.
6. Use the resource tabs to link or unlink books, documents and eligible projects. A project's owner/manager or superadmin must authorize linking it to a team because team members inherit project access. Private document permissions still apply independently.
7. Leave team removes your membership when offered. Delete team is restricted to the owner/superadmin and requires confirmation; linked resources survive. Removing membership does not remove access separately assigned on documents.

### Projects: organize work and collaborators

1. Choose Projects to see accessible projects. Viewers have read-only access. Choose Create project as an editor or higher role. Enter name, description and at least one accessible team. Choose status and priority; add optional start/end dates and comma-separated tags.
2. Save and open the project. Owners, project managers and superadmins can edit its details. Clear an optional date to remove it; an end date cannot be earlier than the start date.
3. In Collaborators, add an eligible user from a linked team and choose Viewer, Contributor or Manager. Use role controls to change a direct collaborator's role, or remove a direct collaborator with confirmation.
4. Team members may already have inherited project access. Removing a direct collaborator does not remove access inherited from a linked team. The owner cannot be removed or demoted through collaborator controls.
5. Use Books and Documents to link or unlink resources. Linking does not change document access or approval policy. Delete project is restricted to the owner/superadmin, requires confirmation and preserves the underlying books/documents.

An account-wide Admin role alone does not grant team/project resource-management rights: the user must also be the owner, team admin or project manager as applicable. Superadmins can manage across these resources.

**When an action fails:** read the message, correct the highlighted fields or select Retry for a loading failure. Check whether the record saved before repeating an interrupted create. A missing management button usually means your account or assignment does not permit that action. Ask the resource owner or administrator; do not assume it is safe to bypass the UI.

## 13. Administrator reference

**Users (superadmin):** click Create user; enter name, email, unique username and role, then Create user. Confirm Invitation pending. No initial password is entered. Use Resend invitation for delivery recovery, Edit for account details, Disable/Enable for access, and Reset password for an active local account when appropriate. A pending invitation must be handled through its invitation controls. Protect the last active superadmin and do not disable your own administrative access.

**Accounts and passwords (superadmin):** choose the minimum password length and whether local self-registration is allowed. Save and re-open the card to verify. Enabling self-registration currently activates viewer accounts without confirming mailbox ownership; invitations provide the confirmation flow.

**Outgoing email (superadmin):** select SMTP, AWS SES, existing server AWS SES settings or Disabled. Use server, port, connection-security mode and sender approved by IT. SMTP supports an IP-authorized relay without credentials or username/password authentication. Save settings before Send test email. Confirm actual inbox receipt separately. Leave stored credential fields blank only when keeping credentials for the same saved server/account; changed connection details can require re-entry.

**Activity notifications (superadmin):** pausing email leaves in-app notices and queued messages intact; resume sends the backlog. Invitations/resets are separate. Refresh status shows Pending, Sending, Sent, Failed and Skipped. Sent means provider acceptance, not proof of inbox arrival. Fix the cause before Retry failed emails.

**Public document sharing (superadmin):** use both global switches as described in section 10 and save. **Storage (superadmin):** configure Encrypt uploaded files at rest and Maximum upload size. Encryption needs server key setup; existing files are not automatically re-encrypted by flipping a switch. **Redis (admin/superadmin):** change only with server-administrator guidance; this selects rate-limit storage, not document access policy.

## 14. Delete, restore and inspect audits

An admin/superadmin can open a document, choose Delete document, enter a reason and confirm Delete. This is soft deletion: normal access stops while retained history supports restoration. To restore, open System Settings, locate the deleted-document list and click Restore. Verify restored access and any retained public-sharing setting before telling users it is available.

Open Audit Log to filter by Action, User email, Outcome, From and To, then click Search. Clear removes filters. Export CSV or Export JSON produces records for investigation; handle exported identities and activity information as sensitive organizational data. Superadmins can click Verify integrity. Chain intact is the expected healthy result. If integrity fails, preserve the result and contact the responsible administrator; do not try to edit the audit records.

## 15. Troubleshooting and getting help

- Missing document: clear Search this view; verify the URL and your assignments with the owner. Admin roles can have broader access than ordinary users.
- Missing control: check account role, document assignment, current status and deployed build. New repository features may not be installed yet.
- Upload too large: check the size shown in the form. Ask the administrator to align application and web-server limits; do not split a controlled document without agreement.
- Upload disabled: a pending version must be approved, rejected or withdrawn first.
- File opens but content is old: download the row marked Published and verify its version; a pending replacement does not replace it yet.
- Sharing controls disabled after a load error: choose Retry; wait for settings to load before making changes.
- Public link unavailable: check network access, publication status, individual revocation, deletion and global sharing policy.
- Date differs by one day: report input date, displayed date and browser time zone. This is a known validation concern, not a reason to enter an offset date.
- Sign-in blocked: stop retries and wait for the limiter window. A private window may share the same IP-based limit.
- Email absent: check Activity, junk mail and recipient address; ask an administrator about queue/provider status.

For support, provide the app build if known, browser, your role, action, time/time zone, document/version identifier and the exact error. Redact passwords, authentication tokens, invitation links and public-link tokens from screenshots and logs. Do not send actual document contents unless authorized. Sign out when finished on a shared workstation.

## 16. Document scope and maintenance

This manual was checked against the Vue routes, document form/version/history components, account views, public-sharing components, administrative cards and backend access/policy services in the working tree based on commit 6d864ef, plus uncommitted notification/account/public-sharing changes. It is a usage guide, not a statement that all functions have passed live acceptance.

Maintain this source alongside UI changes. Regenerate its PDF using scripts/documentation/build_manuals.py. The companion QA guide contains test fixtures, positive/negative cases, route inventory and execution records. Network-specific operations notes and real credentials are deliberately excluded.
