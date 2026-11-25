
## Appendix A. Route-by-route execution inventory

This inventory includes every explicit mounted GET/POST/PUT/PATCH/DELETE declaration in backend/src/routes at generation time. Preceding router-wide verifyAccessToken declarations and their role middleware are included. Global rate limiting/security middleware also applies. Conditional API documentation and SPA/static handling in server.js are tested by ENV-01/SEC-02; they are not business API declarations.

For EACH row run this procedure using the corresponding domain fixture and request recipe:

1. Locate the handler/model listed below, construct its smallest valid request with the current fixture IDs and required fields, and save a sanitized request in the run evidence. Reuse browser network requests where a UI exists.
2. Send as an authorized actor. For GET compare returned fields, filtering and relationships with the fixture; for create/edit/delete read back the target and list to prove persisted effect. For binary downloads compare SHA-256. For provider/queue effects inspect inbox and saved status.
3. Repeat with no token, expired/invalid token, lowest role and an unrelated account; substitute another fixture's IDs. Public/auth endpoints need their documented anonymous behavior rather than blanket 401. Expected: no privilege escalation, private leakage or unauthorized state change.
4. Send malformed/nonexistent IDs and invalid required fields/types; repeat the successful mutation to check duplicates/state conflicts. Verify useful 4xx and unchanged unrelated state. Record any 500 as a defect needing triage.
5. Record endpoint-specific status/body, persisted result, audit/notification effect where implemented, outcome and evidence. Reset mutated fixtures before the next route. Destructive maintenance only on a disposable database.

Source guards are implementation evidence, not independent proof the authorization design is correct. Apply document/ownership checks from the domain tests even when the route lists only a role guard. All rows start NOT RUN in the results CSV.

### API-001 - GET /api/auth/account-policy
Handler: readPolicy. Source: backend/src/routes/authRoutes.js:18.

Declared guards: No route-level auth; inspect handler/global middleware. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-002 - POST /api/auth/accept-invitation
Handler: acceptInvitation. Source: backend/src/routes/authRoutes.js:19.

Declared guards: limitPasswordReset. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-003 - POST /api/auth/register
Handler: register. Source: backend/src/routes/authRoutes.js:94.

Declared guards: limitRegister. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-004 - POST /api/auth/login
Handler: login. Source: backend/src/routes/authRoutes.js:158.

Declared guards: limitLogin. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-005 - POST /api/auth/forgot-password
Handler: forgotPassword. Source: backend/src/routes/authRoutes.js:162.

Declared guards: limitPasswordReset. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-006 - POST /api/auth/reset-password
Handler: resetPassword. Source: backend/src/routes/authRoutes.js:166.

Declared guards: limitPasswordReset. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-007 - GET /api/auth/refresh
Handler: refreshToken. Source: backend/src/routes/authRoutes.js:169.

Declared guards: No route-level auth; inspect handler/global middleware. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-008 - POST /api/auth/logout
Handler: logout. Source: backend/src/routes/authRoutes.js:172.

Declared guards: No route-level auth; inspect handler/global middleware. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-009 - GET /api/auth/me
Handler: getCurrentSession. Source: backend/src/routes/authRoutes.js:175.

Declared guards: verifyAccessToken. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-010 - GET /api/users/me/account
Handler: getAccount. Source: backend/src/routes/usersRoutes.js:35.

Declared guards: verifyAccessToken. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-011 - PATCH /api/users/me/account
Handler: saveProfile. Source: backend/src/routes/usersRoutes.js:36.

Declared guards: verifyAccessToken. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-012 - POST /api/users/me/password
Handler: changePassword. Source: backend/src/routes/usersRoutes.js:37.

Declared guards: verifyAccessToken, limitPasswordReset. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-013 - POST /api/users/manage/:id/invitation
Handler: resendInvitation. Source: backend/src/routes/usersRoutes.js:40.

Declared guards: verifyAccessToken, requireRole('superadmin'), limitPasswordReset. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-014 - GET /api/users/manage
Handler: listAccounts. Source: backend/src/routes/usersRoutes.js:41.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-015 - POST /api/users/manage
Handler: createAccount. Source: backend/src/routes/usersRoutes.js:42.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-016 - PATCH /api/users/manage/:id
Handler: editAccount. Source: backend/src/routes/usersRoutes.js:43.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-017 - GET /api/users
Handler: getAllUsers. Source: backend/src/routes/usersRoutes.js:46.

Declared guards: verifyAccessToken, requireRole("viewer"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-018 - GET /api/users/authentik/unlinked
Handler: getUsersMissingAuthentikLink. Source: backend/src/routes/usersRoutes.js:49.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-019 - POST /api/users/authentik/link
Handler: linkUserToAuthentikIdentity. Source: backend/src/routes/usersRoutes.js:52.

Declared guards: verifyAccessToken, requireRole("superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-020 - GET /api/users/:id
Handler: getUserById. Source: backend/src/routes/usersRoutes.js:55.

Declared guards: verifyAccessToken, requireRole("viewer"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-021 - PUT /api/users/:id
Handler: updateUser. Source: backend/src/routes/usersRoutes.js:58.

Declared guards: verifyAccessToken, requireRole("viewer"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-022 - POST /api/users/:id/profile-picture
Handler: uploadProfilePicture. Source: backend/src/routes/usersRoutes.js:61.

Declared guards: verifyAccessToken, requireRole("viewer"), uploadMid.single("profilePicture"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-023 - DELETE /api/users/:id/profile-picture
Handler: deleteProfilePicture. Source: backend/src/routes/usersRoutes.js:64.

Declared guards: verifyAccessToken, requireRole("viewer"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-024 - POST /api/users/:id/background-image
Handler: uploadBackgroundImage. Source: backend/src/routes/usersRoutes.js:67.

Declared guards: verifyAccessToken, requireRole("viewer"), uploadMid.single("backgroundImage"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-025 - DELETE /api/users/:id/background-image
Handler: deleteBackgroundImage. Source: backend/src/routes/usersRoutes.js:70.

Declared guards: verifyAccessToken, requireRole("viewer"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-026 - DELETE /api/users/:id
Handler: deleteUser. Source: backend/src/routes/usersRoutes.js:73.

Declared guards: verifyAccessToken, requireRole("superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-027 - GET /api/docs/public/:token
Handler: publicDetails. Source: backend/src/routes/docsRoutes.js:55.

Declared guards: resolvePublicDocument. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-028 - GET /api/docs/public/:token/download
Handler: publicDownload. Source: backend/src/routes/docsRoutes.js:56.

Declared guards: resolvePublicDocument. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-029 - GET /api/docs/:id/sharing
Handler: sharingSettings. Source: backend/src/routes/docsRoutes.js:57.

Declared guards: verifyAccessToken, EDITOR, requireDocumentAccess('edit'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-030 - PUT /api/docs/:id/sharing
Handler: setSharing. Source: backend/src/routes/docsRoutes.js:58.

Declared guards: verifyAccessToken, EDITOR, requireDocumentAccess('edit'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-031 - GET /api/docs
Handler: getAllDocs. Source: backend/src/routes/docsRoutes.js:61.

Declared guards: verifyAccessToken, ANY_ROLE. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-032 - POST /api/docs
Handler: createDoc. Source: backend/src/routes/docsRoutes.js:62.

Declared guards: verifyAccessToken, EDITOR, documentUpload("file"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-033 - GET /api/docs/approvals/pending
Handler: pendingApprovals. Source: backend/src/routes/docsRoutes.js:63.

Declared guards: verifyAccessToken, ANY_ROLE. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-034 - GET /api/docs/deleted
Handler: listDeletedDocs. Source: backend/src/routes/docsRoutes.js:64.

Declared guards: verifyAccessToken, ADMIN. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-035 - GET /api/docs/:id
Handler: getDocById. Source: backend/src/routes/docsRoutes.js:67.

Declared guards: verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-036 - GET /api/docs/:id/files
Handler: listFiles. Source: backend/src/routes/docsRoutes.js:68.

Declared guards: verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-037 - GET /api/docs/:id/files/:fileId/download
Handler: downloadFile. Source: backend/src/routes/docsRoutes.js:69.

Declared guards: verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-038 - GET /api/docs/:id/version/:version
Handler: getVersion. Source: backend/src/routes/docsRoutes.js:70.

Declared guards: verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-039 - GET /api/docs/:id/history
Handler: getVersionHistory. Source: backend/src/routes/docsRoutes.js:71.

Declared guards: verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-040 - GET /api/docs/:id/compare
Handler: compareVersions. Source: backend/src/routes/docsRoutes.js:72.

Declared guards: verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-041 - GET /api/docs/:id/revisions
Handler: revisions. Source: backend/src/routes/docsRoutes.js:73.

Declared guards: verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-042 - GET /api/docs/:id/audit
Handler: documentAudit. Source: backend/src/routes/docsRoutes.js:76.

Declared guards: verifyAccessToken, ANY_ROLE, requireDocumentAccess("audit"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-043 - PUT /api/docs/:id
Handler: updateDoc. Source: backend/src/routes/docsRoutes.js:79.

Declared guards: verifyAccessToken, EDITOR, requireDocumentAccess("edit"), withUpload(uploadMid.none()). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-044 - POST /api/docs/:id/upload
Handler: uploadVersion. Source: backend/src/routes/docsRoutes.js:80.

Declared guards: verifyAccessToken, EDITOR, requireDocumentAccess("edit"), documentUpload("file"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-045 - PUT /api/docs/:id/review
Handler: markDocAsReviewed. Source: backend/src/routes/docsRoutes.js:81.

Declared guards: verifyAccessToken, EDITOR, requireDocumentAccess("edit"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-046 - POST /api/docs/:id/versions/:version/approve
Handler: approve. Source: backend/src/routes/docsRoutes.js:84.

Declared guards: verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-047 - POST /api/docs/:id/versions/:version/reject
Handler: reject. Source: backend/src/routes/docsRoutes.js:85.

Declared guards: verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-048 - POST /api/docs/:id/versions/:version/withdraw
Handler: withdraw. Source: backend/src/routes/docsRoutes.js:86.

Declared guards: verifyAccessToken, ANY_ROLE, requireDocumentAccess("read"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-049 - DELETE /api/docs/:id
Handler: deleteDoc. Source: backend/src/routes/docsRoutes.js:89.

Declared guards: verifyAccessToken, ADMIN, requireDocumentAccess("read"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-050 - POST /api/docs/:id/restore
Handler: restoreDoc. Source: backend/src/routes/docsRoutes.js:90.

Declared guards: verifyAccessToken, ADMIN, requireDocumentAccess("read", { includeDeleted: true }). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-051 - GET /api/categories
Handler: getAllCategories. Source: backend/src/routes/categoriesRoutes.js:24.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-052 - POST /api/categories
Handler: createCategory. Source: backend/src/routes/categoriesRoutes.js:27.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-053 - PUT /api/categories/:id
Handler: updateCategory. Source: backend/src/routes/categoriesRoutes.js:30.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-054 - DELETE /api/categories/:id
Handler: deleteCategory. Source: backend/src/routes/categoriesRoutes.js:33.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-055 - GET /api/books
Handler: getAllBooks. Source: backend/src/routes/booksRoutes.js:38.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-056 - GET /api/books/:id
Handler: getBookById. Source: backend/src/routes/booksRoutes.js:41.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-057 - POST /api/books
Handler: createBook. Source: backend/src/routes/booksRoutes.js:44.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-058 - PUT /api/books/:id
Handler: updateBook. Source: backend/src/routes/booksRoutes.js:47.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-059 - DELETE /api/books/:id
Handler: deleteBook. Source: backend/src/routes/booksRoutes.js:50.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-060 - POST /api/books/:id/documents
Handler: addDocumentToBook. Source: backend/src/routes/booksRoutes.js:53.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-061 - DELETE /api/books/:id/documents/:documentId
Handler: removeDocumentFromBook. Source: backend/src/routes/booksRoutes.js:56.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-062 - GET /api/teams/my-teams
Handler: getUserTeams. Source: backend/src/routes/teamsRoutes.js:63.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-063 - GET /api/teams
Handler: getAllTeams. Source: backend/src/routes/teamsRoutes.js:66.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-064 - GET /api/teams/:id
Handler: getTeamById. Source: backend/src/routes/teamsRoutes.js:69.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-065 - POST /api/teams
Handler: createTeam. Source: backend/src/routes/teamsRoutes.js:72.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-066 - PUT /api/teams/:id
Handler: updateTeam. Source: backend/src/routes/teamsRoutes.js:75.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-067 - DELETE /api/teams/:id
Handler: deleteTeam. Source: backend/src/routes/teamsRoutes.js:78.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-068 - POST /api/teams/:id/invite
Handler: inviteToTeam. Source: backend/src/routes/teamsRoutes.js:81.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-069 - POST /api/teams/:id/members
Handler: addMemberToTeam. Source: backend/src/routes/teamsRoutes.js:82.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-070 - POST /api/teams/accept/:token
Handler: acceptInvitation. Source: backend/src/routes/teamsRoutes.js:83.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-071 - DELETE /api/teams/:id/members/:userId
Handler: removeMember. Source: backend/src/routes/teamsRoutes.js:84.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-072 - PUT /api/teams/:id/members/:userId/role
Handler: updateMemberRole. Source: backend/src/routes/teamsRoutes.js:85.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-073 - GET /api/teams/:id/projects
Handler: getTeamProjects. Source: backend/src/routes/teamsRoutes.js:88.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-074 - GET /api/teams/:id/available-projects
Handler: getAvailableProjects. Source: backend/src/routes/teamsRoutes.js:89.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-075 - POST /api/teams/:id/projects
Handler: addProjectsToTeam. Source: backend/src/routes/teamsRoutes.js:90.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-076 - DELETE /api/teams/:id/projects
Handler: removeProjectsFromTeam. Source: backend/src/routes/teamsRoutes.js:91.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-077 - GET /api/teams/:id/books
Handler: getTeamBooks. Source: backend/src/routes/teamsRoutes.js:94.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-078 - GET /api/teams/:id/available-books
Handler: getAvailableBooks. Source: backend/src/routes/teamsRoutes.js:95.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-079 - POST /api/teams/:id/books
Handler: addBooksToTeam. Source: backend/src/routes/teamsRoutes.js:96.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-080 - DELETE /api/teams/:id/books
Handler: removeBooksFromTeam. Source: backend/src/routes/teamsRoutes.js:97.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-081 - GET /api/teams/:id/documents
Handler: getTeamDocuments. Source: backend/src/routes/teamsRoutes.js:100.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-082 - GET /api/teams/:id/available-documents
Handler: getAvailableDocuments. Source: backend/src/routes/teamsRoutes.js:101.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-083 - POST /api/teams/:id/documents
Handler: addDocumentsToTeam. Source: backend/src/routes/teamsRoutes.js:102.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-084 - DELETE /api/teams/:id/documents
Handler: removeDocumentsFromTeam. Source: backend/src/routes/teamsRoutes.js:103.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-085 - PUT /api/projects/:id/collaborators/:userId/role
Handler: updateCollaboratorRole. Source: backend/src/routes/projectsRoutes.js:50.

Declared guards: verifyAccessToken, requireRole('editor','admin','superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-086 - GET /api/projects
Handler: getAllProjects. Source: backend/src/routes/projectsRoutes.js:53.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-087 - GET /api/projects/my-projects
Handler: getUserProjects. Source: backend/src/routes/projectsRoutes.js:56.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-088 - GET /api/projects/team/:teamId
Handler: getTeamProjects. Source: backend/src/routes/projectsRoutes.js:59.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-089 - GET /api/projects/:id
Handler: getProjectById. Source: backend/src/routes/projectsRoutes.js:62.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-090 - POST /api/projects
Handler: createProject. Source: backend/src/routes/projectsRoutes.js:65.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-091 - PUT /api/projects/:id
Handler: updateProject. Source: backend/src/routes/projectsRoutes.js:68.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-092 - DELETE /api/projects/:id
Handler: deleteProject. Source: backend/src/routes/projectsRoutes.js:71.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-093 - POST /api/projects/:id/collaborators
Handler: addCollaborator. Source: backend/src/routes/projectsRoutes.js:74.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-094 - DELETE /api/projects/:id/collaborators/:userId
Handler: removeCollaborator. Source: backend/src/routes/projectsRoutes.js:75.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-095 - GET /api/projects/:id/collaborators
Handler: getProjectCollaborators. Source: backend/src/routes/projectsRoutes.js:78.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-096 - GET /api/projects/:id/available-collaborators
Handler: getAvailableCollaborators. Source: backend/src/routes/projectsRoutes.js:79.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-097 - GET /api/projects/:id/books
Handler: getProjectBooks. Source: backend/src/routes/projectsRoutes.js:82.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-098 - GET /api/projects/:id/available-books
Handler: getAvailableProjectBooks. Source: backend/src/routes/projectsRoutes.js:83.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-099 - POST /api/projects/:id/books
Handler: addBooksToProject. Source: backend/src/routes/projectsRoutes.js:84.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-100 - DELETE /api/projects/:id/books
Handler: removeBooksFromProject. Source: backend/src/routes/projectsRoutes.js:85.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-101 - GET /api/projects/:id/documents
Handler: getProjectDocuments. Source: backend/src/routes/projectsRoutes.js:88.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-102 - GET /api/projects/:id/available-documents
Handler: getAvailableProjectDocuments. Source: backend/src/routes/projectsRoutes.js:89.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-103 - POST /api/projects/:id/documents
Handler: addDocumentsToProject. Source: backend/src/routes/projectsRoutes.js:90.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-104 - DELETE /api/projects/:id/documents
Handler: removeDocumentsFromProject. Source: backend/src/routes/projectsRoutes.js:91.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-105 - DELETE /api/projects/:id/documents/:documentId
Handler: removeDocument. Source: backend/src/routes/projectsRoutes.js:94.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-106 - GET /api/system/public-sharing
Handler: readPublicSharingPolicy. Source: backend/src/routes/systemRoutes.js:40.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-107 - PUT /api/system/public-sharing
Handler: savePublicSharingPolicy. Source: backend/src/routes/systemRoutes.js:41.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-108 - GET /api/system/notifications
Handler: readNotificationSettings. Source: backend/src/routes/systemRoutes.js:42.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-109 - PUT /api/system/notifications
Handler: saveNotificationSettings. Source: backend/src/routes/systemRoutes.js:43.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-110 - POST /api/system/notifications/retry
Handler: retryNotifications. Source: backend/src/routes/systemRoutes.js:44.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-111 - GET /api/system/accounts
Handler: readPolicy. Source: backend/src/routes/systemRoutes.js:45.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-112 - PUT /api/system/accounts
Handler: savePolicy. Source: backend/src/routes/systemRoutes.js:46.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-113 - GET /api/system/storage
Handler: getStorageSettingsHandler. Source: backend/src/routes/systemRoutes.js:48.

Declared guards: verifyAccessToken, requireRole('viewer', 'editor', 'admin', 'superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-114 - PUT /api/system/storage
Handler: updateStorageSettingsHandler. Source: backend/src/routes/systemRoutes.js:49.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-115 - GET /api/system/email
Handler: getEmailSettings. Source: backend/src/routes/systemRoutes.js:50.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-116 - PUT /api/system/email
Handler: updateEmailSettings. Source: backend/src/routes/systemRoutes.js:51.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-117 - POST /api/system/email/test
Handler: testEmailSettings. Source: backend/src/routes/systemRoutes.js:52.

Declared guards: verifyAccessToken, requireRole('superadmin'). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-118 - GET /api/system/redis
Handler: getRedisSettings. Source: backend/src/routes/systemRoutes.js:75.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-119 - PUT /api/system/redis
Handler: updateRedisSettings. Source: backend/src/routes/systemRoutes.js:76.

Declared guards: verifyAccessToken, requireRole("superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-120 - GET /api/system/info
Handler: getSystemInfo. Source: backend/src/routes/systemRoutes.js:78.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-121 - GET /api/system/performance
Handler: getPerformanceMetrics. Source: backend/src/routes/systemRoutes.js:81.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-122 - POST /api/system/clear/:collection
Handler: clearCollection. Source: backend/src/routes/systemRoutes.js:84.

Declared guards: verifyAccessToken, requireRole("superadmin"), guardDestructiveTool. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-123 - POST /api/system/restore/:collection
Handler: restoreCollection. Source: backend/src/routes/systemRoutes.js:87.

Declared guards: verifyAccessToken, requireRole("superadmin"), guardDestructiveTool. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-124 - POST /api/system/archive-files
Handler: archiveFiles. Source: backend/src/routes/systemRoutes.js:90.

Declared guards: verifyAccessToken, requireRole("superadmin"), guardDestructiveTool. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-125 - POST /api/system/restore-files
Handler: restoreFiles. Source: backend/src/routes/systemRoutes.js:93.

Declared guards: verifyAccessToken, requireRole("superadmin"), guardDestructiveTool. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-126 - POST /api/system/generate-dummy-data
Handler: generateDummyData. Source: backend/src/routes/systemRoutes.js:96.

Declared guards: verifyAccessToken, requireRole("superadmin"), guardDestructiveTool. Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-127 - GET /api/software-updates/releases
Handler: handle(() => updaterRequest({action:'releases'})). Source: backend/src/routes/softwareUpdateRoutes.js:20.

Declared guards: verifyAccessToken, requireRole('superadmin') (router-wide); . Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-128 - GET /api/software-updates/helper
Handler: handle(() => updaterHelperStatus()). Source: backend/src/routes/softwareUpdateRoutes.js:21.

Declared guards: verifyAccessToken, requireRole('superadmin') (router-wide); . Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-129 - GET /api/software-updates/status
Handler: handle(() => updaterRequest({action:'status'})). Source: backend/src/routes/softwareUpdateRoutes.js:22.

Declared guards: verifyAccessToken, requireRole('superadmin') (router-wide); . Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-130 - POST /api/software-updates/start
Handler: handle(async req => {. Source: backend/src/routes/softwareUpdateRoutes.js:23.

Declared guards: verifyAccessToken, requireRole('superadmin') (router-wide); . Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-131 - POST /api/software-updates/answer
Handler: handle(req => {. Source: backend/src/routes/softwareUpdateRoutes.js:33.

Declared guards: verifyAccessToken, requireRole('superadmin') (router-wide); . Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-132 - POST /api/software-updates/cancel
Handler: handle(() => updaterRequest({action:'cancel'})). Source: backend/src/routes/softwareUpdateRoutes.js:41.

Declared guards: verifyAccessToken, requireRole('superadmin') (router-wide); . Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-133 - GET /api/analytics
Handler: getAnalyticsData. Source: backend/src/routes/analyticsRoutes.js:24.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-134 - GET /api/analytics/export
Handler: getAnalyticsExport. Source: backend/src/routes/analyticsRoutes.js:27.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-135 - GET /api/custom-charts
Handler: getAllCustomCharts. Source: backend/src/routes/customChartsRoutes.js:31.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-136 - GET /api/custom-charts/:id
Handler: getCustomChartById. Source: backend/src/routes/customChartsRoutes.js:34.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-137 - GET /api/custom-charts/:id/data
Handler: getChartData. Source: backend/src/routes/customChartsRoutes.js:37.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-138 - POST /api/custom-charts
Handler: createCustomChart. Source: backend/src/routes/customChartsRoutes.js:40.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-139 - PUT /api/custom-charts/:id
Handler: updateCustomChart. Source: backend/src/routes/customChartsRoutes.js:43.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-140 - DELETE /api/custom-charts/:id
Handler: deleteCustomChart. Source: backend/src/routes/customChartsRoutes.js:46.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-141 - POST /api/reviews
Handler: createReviewAssignments. Source: backend/src/routes/reviewRoutes.js:31.

Declared guards: verifyAccessToken, requireRole("editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-142 - GET /api/reviews/document/:documentId
Handler: getDocumentReviewAssignments. Source: backend/src/routes/reviewRoutes.js:34.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-143 - GET /api/reviews/user/:userId
Handler: getUserReviewAssignments. Source: backend/src/routes/reviewRoutes.js:37.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-144 - PUT /api/reviews/:id
Handler: updateReviewAssignment. Source: backend/src/routes/reviewRoutes.js:40.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-145 - GET /api/reviews/overdue
Handler: getOverdueReviewAssignments. Source: backend/src/routes/reviewRoutes.js:43.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-146 - POST /api/reviews/document/:documentId/cleanup
Handler: cleanupDocumentReviewAssignments. Source: backend/src/routes/reviewRoutes.js:46.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-147 - GET /api/external-contacts/types
Handler: getAllExternalContactTypes. Source: backend/src/routes/externalContactsRoutes.js:34.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-148 - POST /api/external-contacts/types
Handler: createExternalContactType. Source: backend/src/routes/externalContactsRoutes.js:37.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-149 - PUT /api/external-contacts/types/:id
Handler: updateExternalContactType. Source: backend/src/routes/externalContactsRoutes.js:40.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-150 - DELETE /api/external-contacts/types/:id
Handler: deleteExternalContactType. Source: backend/src/routes/externalContactsRoutes.js:43.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-151 - GET /api/external-contacts
Handler: getAllExternalContacts. Source: backend/src/routes/externalContactsRoutes.js:46.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-152 - POST /api/external-contacts
Handler: createExternalContact. Source: backend/src/routes/externalContactsRoutes.js:49.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-153 - GET /api/external-contacts/document/:id
Handler: getExternalContactsByDocument. Source: backend/src/routes/externalContactsRoutes.js:52.

Declared guards: verifyAccessToken, requireRole("viewer", "editor", "admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-154 - PUT /api/external-contacts/:id
Handler: updateExternalContact. Source: backend/src/routes/externalContactsRoutes.js:55.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-155 - DELETE /api/external-contacts/:id
Handler: deleteExternalContact. Source: backend/src/routes/externalContactsRoutes.js:58.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-156 - GET /api/notifications
Handler: getUserNotifications. Source: backend/src/routes/notificationsRoutes.js:32.

Declared guards: verifyAccessToken (router-wide); . Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-157 - GET /api/notifications/unread-count
Handler: getUnreadNotificationsCount. Source: backend/src/routes/notificationsRoutes.js:35.

Declared guards: verifyAccessToken (router-wide); . Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-158 - PATCH /api/notifications/:id/read
Handler: markAsRead. Source: backend/src/routes/notificationsRoutes.js:38.

Declared guards: verifyAccessToken (router-wide); . Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-159 - PATCH /api/notifications/read-all
Handler: markAllAsRead. Source: backend/src/routes/notificationsRoutes.js:41.

Declared guards: verifyAccessToken (router-wide); . Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-160 - DELETE /api/notifications/:id
Handler: deleteNotification. Source: backend/src/routes/notificationsRoutes.js:44.

Declared guards: verifyAccessToken (router-wide); . Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-161 - GET /api/audit
Handler: listAuditEntries. Source: backend/src/routes/auditRoutes.js:17.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-162 - GET /api/audit/export
Handler: exportAuditEntries. Source: backend/src/routes/auditRoutes.js:18.

Declared guards: verifyAccessToken, requireRole("admin", "superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-163 - GET /api/audit/verify
Handler: verifyAuditChain. Source: backend/src/routes/auditRoutes.js:19.

Declared guards: verifyAccessToken, requireRole("superadmin"). Execute steps 1-5 above and record the authorized plus negative actor variants.

### API-164 - GET /uploads/:filename
Handler: inline handler. Source: backend/src/routes/mediaRoutes.js:24.

Declared guards: No route-level auth; inspect handler/global middleware. Execute steps 1-5 above and record the authorized plus negative actor variants.
