# DocMan

DocMan hopes to be the most comprehensive piece of software to manage all of your documentation. You can schedule your documentation for review between stakeholders, the original authors, contributors, relevant tech leads, etc... Categorize, analyze, version repositories, and basically everything you would need to keep your documentation well organized, maintained, analyzed, and backed up.

## Feature Upgrades

A list of features I plan on implementing into the application.

1. ~~Check my authentication and User setup is sound and secure~~
   1. ~~JWT authentication system~~
      1. ~~Check that there is email format, username length, password complexity, regex validation, etc...~~
      2. ~~Check that there are no issues with the inactivity/auto-logout functionality~~
      3. ~~Check that nothing is interfering with the token expiry~~
   2. ~~Email notifications~~
      1. ~~User can chose to be notified on certain things. Some things are mandatory based on their association with the documentation, like if they are a stakeholder, owner, author, etc...~~
   3. ~~Restrict rate-limiting per IP/User and apply rate-limiting where relevant~~
2. Enhance CreateDocPage by adding a field for the documents review to be marked as complete -- NEED TO TEST
   1. This field should only be visible to the owners and authors of the document -- NEED TO TEST
   2. This field should only be visible when the document is open for review -- NEED TO TEST
   3. Should include a hidden field that tracks the date the review was completed -- NEED TO TEST
   4. Should include a hidden field that tracks who marked the review as complete -- NEED TO TEST
   5. In fact, there should be a field in all forms to track who last updated anything
3. Scheduling
   1. Authors, contributors, and stake-holders can be scheduled to review documentation based on when the document becomes open for review.
      1. They should get notice 1 week prior to it opening for review with a calendar reminder file attached
      2. Setup a weekly alert until the review is marked as complete.
   2. Can set review deadlines
   3. If review determines updates are needed, can assign to authors and contributors.
4. ~~Versioning System~~
   1. ~~Users should be able to upload new versions of the document~~
   2. ~~Users should be able to view previous versions of the document~~
   3. ~~Users should be able to download previous versions of the document~~
   4. Users should be able to compare previous versions of the document -- NEED TO TEST
   5. Users should be able to view the change log for the document -- NEED TO TEST
5. ~~On the ViewDocPage, add a download button to download a calendar event for the date that a document is up for review~~
6. External Contacts in CreateDocPage
    1. Ability to add as many external contacts as needed. Each external contact should have a name, email, phone number, and type (which should be a dropdown).
    2. The types should be stored in a collection
    3. There should be an admin page to manage the types of external contacts.
7. ~~Create a theme switcher~~
   1. ~~One theme is the current theme~~
   2. ~~One is a clean business theme~~
   3. ~~And the third is a retro gaming theme~~
   4. ~~Users should be able to select their preferred theme in their profile~~
8. ~~Internal notification and messaging system~~
   1.  ~~Be able to invite members already in the system to teams through it's internal messaging and notification system.~~
   2.  ~~User will get a notification inside the system if a document is assigned to them in any way or if a document that are attached to is coming up for review.~~
9. ~~Universal helper and debugging functions for the frontend and backend~~
 ~~1.  Should be named globalUtils.js~~
 ~~1.  Can be used anywhere~~
 ~~2.  Are made available across the entire project~~
 ~~3.  Can be used for debugging, logging, handling simple yet redundant tasks, etc...~~
 ~~4.  Can turn on or off the debugging with a debug flag~~
 ~~5.  Should be able to log to the console, a file, or a database~~
 ~~6.  Should be able to log errors, warnings, info, debug, etc...~~
10. ~~Add backend unit tests for all endpoints in __tests__ folder, update any existing unit tests~~
11. ~~Add informational and usage comments throughout the frontend code~~
12. ~~Add informational and usage comments throughout the backend code~~
13. ~~Make certain comments dynamic somehow~~
14. Cleanup and compartmentalize the code as much as possible
15. Code audit and security review. Check against OWASP Top 10 and other security best practices.
16. Make it so that when a document is deleted from the collection, it's not actually deleted, but rather move it and all associated data to an archive collection(s). And all files are moved to uploads_archive
17. Create a fork with local storage for data and bundle into an Electron app for desktop use
18. Create another fork with docker and kubernetes for cloud use
19. Create another fork with a mobile app for iOS and Android
20. Create another fork for the purpose of refactoring into a Recipes MERN app

## Authentication System Suggestions & Improvements

### Backend Suggestions

1. **Rate Limiting**
   - Protect registration and login endpoints with rate limiting to prevent brute-force attacks.
2. **HTTPS**
   - Always use HTTPS in production to protect tokens in transit.
3. **Email Sending**
   - Use a real email service (like SendGrid, Mailgun, or Nodemailer) for password resets.
   - Make sure reset tokens expire and are single-use.
4. **Token Expiry**
   - Set reasonable JWT expiry (e.g., 1-3 days).
   - Consider implementing refresh tokens for longer sessions.
5. **User Data Exposure**
   - Never send the password field in API responses.
   - Only expose necessary user info.
6.  **Logout**
    - On the backend, consider implementing token blacklisting for logout (optional, more advanced).

---

### Frontend Suggestions

1. **Error Feedback**
   - Show clear error messages for failed login/registration.
   - Disable submit buttons while loading.
2. **Password Reset**
   - Make sure reset links expire and show appropriate messages if expired.

---

### General Suggestions

- **Testing:** Add unit and integration tests for your auth endpoints.
- **Documentation:** Document your API endpoints and authentication flow for future reference.
- **Accessibility:** Ensure your forms and navigation are accessible (labels, focus states,

