# DocMan

DocMan hopes to be the most comprehensive piece of software to manage all of your documentation. You can schedule your documentation for review between stakeholders, the original authors, contributors, relevant tech leads, etc... Categorize, analyze, version repositories, and basically everything you would need to keep your documentation well organized, maintained, analyzed, and backed up.

## Feature Upgrades

A list of features I plan on implementing into the application.

1. File Uploads
   1. The ability to upload documentation in many formats, including:
      1. DOC/DOCX
      2. PDF
      3. HTML
      4. XML
      5. RTF
      6. TXT
      7. MD
      8. XLS/XLSX
      9. CSV
      10. PPTX
2. User system, authentication and security
   1. JWT authentication system
      1. Add email format validation
      2. Limit username length
      3. Add regex validation
   2. Email notifications
      1. User can chose to be notified on certain things. Some things are mandatory based on their association with the documentation.
   3. User profiles
      1. Users can add information about themselves that will be available to other users of the system and they can customize the UI in a limited fashion.
   4. Restrict rate-limiting per IP/User
   5. Inactivity timeout
3. Scheduling
   1. Authors, contributors, and stake-holders can be scheduled to review documentation.
   2. Can set review deadlines
   3. If review determines updates are needed, can assign to authors and contributors.
4. Update color scheme to go with the RD brand
5. Work on UI in general
6. Add the navbar to all pages
7. Add a footer
8. Create a sidebar menu
9. Delineate between when the entry in the system has been updated (review date, stakeholders, etc) and when the actual document has been updated

## Authentication System Suggestions & Improvements

### Backend Suggestions

1. **Password Hashing**
   - Use bcrypt and a proper pre-save hook.
2. **JWT Secret**
   - Store `TOKEN_KEY` in `.env` and never hardcode.
3. **Error Handling**
   - Return clear, consistent error messages and status codes.
   - Avoid exposing internal errors to the client.
4. **Validation**
   - Add extra validation for email format and password strength in your model or controller.
   - Consider using a library like `validator` for email.
5. **Rate Limiting**
   - Protect registration and login endpoints with rate limiting to prevent brute-force attacks.
6. **HTTPS**
   - Always use HTTPS in production to protect tokens in transit.
7. **Email Sending**
   - Use a real email service (like SendGrid, Mailgun, or Nodemailer) for password resets.
   - Make sure reset tokens expire and are single-use.
8. **Token Expiry**
   - Set reasonable JWT expiry (e.g., 1-3 days).
   - Consider implementing refresh tokens for longer sessions.
9. **User Data Exposure**
   - Never send the password field in API responses.
   - Only expose necessary user info.
10. **Logout**
    - On the backend, consider implementing token blacklisting for logout (optional, more advanced).

---

### Frontend Suggestions

1. **Authentication State**
   - Use React context or a global state manager for auth state instead of reading directly from localStorage.
2. **Protected Routes**
   - Use a route guard (e.g., a PrivateRoute component) to restrict access to authenticated pages.
3. **Error Feedback**
   - Show clear error messages for failed login/registration.
   - Disable submit buttons while loading.
4. **Password Reset**
   - Make sure reset links expire and show appropriate messages if expired.
5. **Logout**
   - After logout, redirect to login or home page.
6. **Security**
   - Never store sensitive user info in localStorage—only the JWT.

---

### General Suggestions

- **Testing:** Add unit and integration tests for your auth endpoints.
- **Documentation:** Document your API endpoints and authentication flow for future reference.
- **Accessibility:** Ensure your forms and navigation are accessible (labels, focus states,

