# DocMan

DocMan hopes to be the most comprehensive piece of software to manage all of your documentation. You can schedule your documentation for review between stakeholders, the original authors, contributors, relevant tech leads, etc... Categorize, analyze, version repositories, and basically everything you would need to keep your documentation well organized, maintained, analyzed, and backed up.

## Feature Upgrades

A list of features I plan on implementing into the application.

1. Check my authentication and User setup is sound and secure
   1. JWT authentication system
      1. Check that there is email format, username length, password complexity, regex validation, etc...
      2. Check that there are no issues with the inactivity/auto-logout functionality
      3. Check that nothing is interfering with the token expiry
   2. Email notifications
      1. User can chose to be notified on certain things. Some things are mandatory based on their association with the documentation, like if they are a stakeholder, owner, author, etc...
   3. Restrict rate-limiting per IP/User and apply rate-limiting where relevant
2. Enhance CreateDocPage by adding a field for the documents review to be marked as complete
   1. This field should only be visible to the owners and authors of the document
   2. This field should only be visible when the document is open for review
   3. Should include a hidden field that tracks the date the review was completed
   4. Should include a hidden field that tracks who marked the review as complete
   5. In fact, there should be a field in all forms to track who last updated anything
3. Scheduling
   1. Authors, contributors, and stake-holders can be scheduled to review documentation based on when the document becomes open for review. 
      1. They should get notice 1 week prior to it opening for review with a calendar reminder file attached
      2. Setup a weekly alert until the review is marked as complete.
   2. Can set review deadlines
   3. If review determines updates are needed, can assign to authors and contributors.
4. Versioning System
   1. Users should be able to upload new versions of the document
   2. Users should be able to view previous versions of the document
   3. Users should be able to download previous versions of the document
   4. Users should be able to compare previous versions of the document
   5. Users should be able to view the change log for the document
5. Work on UI in general
6. Create a sidebar menu
7. Delineate between when the entry in the system has been updated (review date, stakeholders, etc) and when the actual document has been updated
8. Notification System
9.  IT Contacts in CreateDocPage
10. Universal debugging function(s)
11. Add comments

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

