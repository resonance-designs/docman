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
3. Scheduling -- NEED TO TEST
   1. Authors, contributors, and stake-holders can be scheduled to review documentation based on when the document becomes open for review. -- NEED TO TEST
      1. They should get notice 1 week prior to it opening for review with a calendar reminder file attached -- NEED TO TEST
      2. Setup a weekly alert until the review is marked as complete. -- NEED TO TEST
   2. Can set review deadlines -- NEED TO TEST
   3. If review determines updates are needed, can assign to authors and contributors. -- NEED TO TEST
4. ~~Versioning System~~
   1. ~~Users should be able to upload new versions of the document~~
   2. ~~Users should be able to view previous versions of the document~~
   3. ~~Users should be able to download previous versions of the document~~
   4. Users should be able to compare previous versions of the document -- NEED TO TEST
   5. Users should be able to view the change log for the document -- NEED TO TEST
5. ~~On the ViewDocPage, add a download button to download a calendar event for the date that a document is up for review~~
6. ~~External Contacts in CreateDocPage~~
   1. ~~Ability to add as many external contacts as needed. Each external contact should have a name, email, phone number, and type (which should be a dropdown).~~
   2. ~~The types should be stored in a collection~~
   3. ~~There should be an admin page to manage the types of external contacts.~~
7. ~~Create a theme switcher~~
   1. ~~One theme is the current theme~~
   2. ~~One is a clean business theme~~
   3. ~~And the third is a retro gaming theme~~
   4. ~~Users should be able to select their preferred theme in their profile~~
8. ~~Internal notification and messaging system~~
   1. ~~Be able to invite members already in the system to teams through it's internal messaging and notification system.~~
   2. ~~User will get a notification inside the system if a document is assigned to them in any way or if a document that are attached to is coming up for review.~~
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
14. ~~Add the functionality to add "Books" to the site that contain multiple chapters/documents~~
15. ~~Modify the CreateBooksPage so that the only things collected are title, description, category, documents, owners, lastUpdatedBy, and the timestamps.~~
16. Add a PaginatedBookTable component that uses the same design patterns and styling as used in the PaginatedDocTable component and use it in the ViewBooksPage.
17. Add the FilterBar component to the ViewBooksPage that allows the user to search and filter the books by category, and owners.
18. ~~In Teams and Projects, add the functionality to add Books and Documents:~~
    1. ~~Add a tab to the tab menu of the Teams details page and the Projects details page called "Books".~~
       1. ~~In this tab, there should be a header that says "Team Books" and then present a table of all the books that are currently assigned to the team.~~
          1. ~~This table should have the same design patterns and styling as used in the PaginatedDocTable component but instead of view/delete actions, it should have a checkbox to select books and ungroup them from the current team. There should be a button to ungroup all the selected books from the current team under the table.~~
       2. ~~Below that there should be another header that says "Add Books" and then present a table of all the books that are not currently assigned to the team.~~
          1. ~~This table should have the same design patterns and styling as used in the PaginatedDocTable component but instead of view/delete actions, it should have a checkbox to select books and group them to the current team. There should be a button to group all the selected books to the current team under the table.~~
    2. ~~Add a tab to the tab menu of the Teams details page and the Projects details page called "Documents".~~
       1. ~~In this tab, there should be a header that says "Team Documents" and then present a table of all the documents that are currently assigned to the team.~~
          1. ~~This table should have the same design patterns and styling as used in the PaginatedDocTable component but instead of view/delete actions, it should have a checkbox to select documents and ungroup them from the current team. There should be a button to ungroup all the selected documents from the current team under the table.~~
       2. ~~Below that there should be another header that says "Add Documents" and then present a table of all the documents that are not currently assigned to the team.~~
          1. ~~This table should have the same design patterns and styling as used in the PaginatedDocTable component but instead of view/delete actions, it should have a checkbox to select documents and group them to the current team. There should be a button to group all the selected documents to the current team under the table.~~
19. ~~The Members tab in the tab menu of the Teams details page does not currently function. Create a view for it to display all users in the Team.~~
20. ~~The Projects details page does not have a Collaborators tab in the tab menu. Create one and create a view for it to display all collaborators of the Project.~~
21. ~~In the SystemInfoPage, add a "Danger Zone" section at the bottom that has buttons to clear the following collections:~~
    1. ~~Clear Books~~
       1. ~~Copy all books to a collection called "archives_books". Then delete the books from the main collection.~~
    2. ~~Clear Documents~~
       1. ~~Copy all documents to a collection called "archives_documents". Then delete the documents from the main collection.~~
    3. ~~Clear Charts~~
       1. ~~Copy all charts to a collection called "archives_charts". Then delete the charts from the main collection.~~
    4. ~~Clear External Contacts~~
       1. ~~Copy all external contacts to a collection called "archives_external_contacts". Then delete the external contacts from the main collection.~~
    5. ~~Clear External Contact Types~~
       1. ~~Copy all external contact types to a collection called "archives_external_contact_types". Then delete the external contact types from the main collection.~~
    6. ~~Clear Files~~
       1. ~~Copy all files to a collection called "archives_files". Then delete the files from the main collection.~~
    7. ~~Clear Notifications~~
       1. ~~Copy all notifications to a collection called "archives_notifications". Then delete the notifications from the main collection.~~
    8. ~~Clear Projects~~
       1. ~~Copy all projects to a collection called "archives_projects". Then delete the projects from the main collection.~~
    9. ~~Clear Reviews~~
       1. ~~Copy all reviews to a collection called "archives_reviews". Then delete the reviews from the main collection.~~
    10. ~~Clear Review Assignments~~
    11. ~~Copy all review assignments to a collection called "archives_review_assignments". Then delete the review assignments from the main collection.~~
    12. ~~Clear Reviews~~
    13. ~~Copy all reviews to a collection called "archives_reviews". Then delete the reviews from the main collection.~~
    14. ~~Clear Teams~~
    15. ~~Copy all teams to a collection called "archives_teams". Then delete the teams from the main collection.~~
    16. ~~Clear Users~~
    17. ~~Copy all users to a collection called "archives_users". Then delete the users from the main collection.~~
    18. ~~Add a button to Delete all the files in the uploads directory.~~
        1. ~~Instead of actually deleting the files, move them to an archive directory.~~
    19. ~~Have a confirmation modal before each action.~~
    20. ~~Have a button to restore all the collections from the archive collections back to the main collections.~~
    21. ~~Have a button to restore all the files from the archive directory back to the uploads directory.~~
    22. ~~Have buttons to generate dummy data~~
22. ~~Make it so the token only expires after 5 days of inactivity.~~
23. ~~Use modal confirmations instead of the browser's native alerts, !window.confirm like confirmation of deletions, etc~~
24. ~~A script to rewrite test scripts when to make sure the tests still work correctly with any updates since the tests were written.~~
25. ~~Make it so that the "Manage All Teams", "Team Settings", "Manage All Projects", and "Project Settings" in the Projects and Teams pages actually do something.~~
26. Update user-levels/roles logic. -- NEED TO TEST
    1. We are going to introduce a new role, "Super Admin" (represented as "superadmin" in the Model/DB).
    2. Access/Restrictions to resources in the app, among the currently established roles remains the same, except we are going to take away the following for regular "Admins":
       1. The "Danger Zone" section in the SystemInfoPage.
       2. The ability to edit other users profiles at all.
       3. The ability to delete other users.
       4. The ability to manage all teams and projects.
       5. The ability to mange specific teams and projects, unless they are an owner of the team or project.
       6. Admins can only create new users with roles up to their own, they can not create a "Super Admin" account.
    3. Any authenticated user with any role (even viewer) can edit anything (documents, books, teams, projects, etc...) as long as they are marked as an author, owner, and/or contributor/collaborator of that resource.
    4. Stakeholders and review assignees can only view/download the documents they are assigned to unless they are also marked as an author or owner of the document as well.
    5. Super Admins can do everything we just stripped away from admins above. They have access to absolutely everything the API provides.
    6. ~~Make sure to update the role of the user with resonance.designs.com@gmail.com to superadmin.~~
27. Clean up the whole "review date" thing. Right now there are multiple review date fields and it's confusing.
    1. Ditch the "Review Date" field.
    2. Change the "Opens For Review" field so that the date-picker can not go to the past.
    3. Under the "Opens For Review" field, add a new field called "Review Interval" that is a dropdown of options in periods of time (monthly, quarterly, semiannually, and annually) and also a custom interval option that exposes a number input field. This field should be in days and excepts a number of days. This field should take the value of the "Opens For Review" field and then add the interval to it. So if someone sets the "Opens For Review" field to today and selects monthly, the "Review Interval" field will automatically calculate what the next review date should be.
    4. When creating a new document, the default value for the "Review Interval" field should be quarterly.
    5. When editing a document, the default value for the "Review Interval" field should be whatever is currently set in the DB.
    6. When viewing a document, the "Review Interval" field should be disabled and read-only.
    7. Under the "Review Interval" field, add a new field called "Review Period" that sets the time-frame (one week, two weeks, three weeks, and a month) that review assignees have to review the document. When the review date comes around, the review assignee will receive a notification and an email with a link to the document, a calendar event attachment with the review date and the due-date (calculated by the "Review Period" field) for completing the review.
    8. Under the "Review Period" field, add a new field called "Last Reviewed On" that is disabled and read-only. This field should be populated with the date the review was completed.
    9. Under the "Last Reviewed" field, add a new field called "Next Review Due On" that is disabled and read-only. This field should be populated with the calculated date from the "Review Interval" field.
    10. When creating a new document, the default value for the "Last Reviewed On" field should be null.
    11. When viewing a document, the "Last Reviewed On" and "Next Review Due On" fields should be disabled and read-only.
    12. When editing a document, the "Last Reviewed On" and "Next Review Due On" fields should be disabled and read-only.
    13. When creating a new document, the default value for the "Next Review Due On" field should be null.
    14. When a review is marked as completed, the next review date should be calculated by the "Review Interval" field against the date the review was completed.
28. Make a user registration page that is open to the public but it has no option to select a role. The role anyone registers with on this public page will be a viewer.
29. Add a "Create Document" button on the home page visible to those with roles that allow them to create documents that takes them directly to the CreateDocPage.
30. Come up with a deployment pipeline for continuous delivery/deployment to the server.
    1. The server needs to pull the latest changes from GitHub.
    2. It needs to keep the .env.prod file, and all the node_modules folders intact when it pulls the latest changes.
    3. It needs to rebuild the frontend:

       ```bash
       sudo rsync -a /var/www/docman/frontend/dist/ /var/www/html/docman.resonancedesigns.dev/public_html/
       ```
    4. It needs to run the rsync command as follows:

       ```bash
       cd /var/www/docman
       npm run build
       sudo rsync -a /var/www/docman/frontend/dist/ /var/www/html/docman.resonancedesigns.dev/public_html/
       sudo systemctl restart docman-backend    # if backend changed
       ```
    5. It needs to restart the server.
    6. We need some kind of trigger. Either the server needs some way to monitor the repo for updates or a cronjob to check the repo every X minutes. Perhpaps there is a way to deploy from GitHub to the server. What do you recommend?



31. Document security levels
    1. Public
    2. Private
    3. Restricted
    4. Confidential
    5. Top Secret
32. Check that the app works using MongoDB Atlas
33. Develop a short-code system to embed custom charts built with CustomChartsPage.
34. Add search/filters to ViewCatsPage.
    1. ViewCatsPage should be searchable by name and type.
    2. ViewCatsPage should be filterable by type.
    3. ViewCatsPage should have be able to sort by name, type, and created in the PaginatedCatTable component.
35. Work on the switchable UI themes.
36. Make sure header comments and JSDoc comments are added to all files.
37. Cleanup and compartmentalize the code as much as possible.
38. Code audit and security review. Check against OWASP Top 10 and other security best practices.
39. Make it so that when a document is deleted from the collection, it's not actually deleted, but rather move it and all associated data to a temp_collection(s). And all files are moved to temp_uploads_archive.
40. ~~Create a branch with local storage for data and bundle into an Electron app for desktop use~~
41. Create another fork with docker and kubernetes for cloud use
42. Create another fork with a mobile app for iOS and Android
43. Create another fork for the purpose of refactoring into a Recipes MERN app

## Authentication System Suggestions & Improvements

### Backend Suggestions

1. **HTTPS**
   - Always use HTTPS in production to protect tokens in transit.
2. **Email Sending**
   - Use a real email service (like SendGrid, Mailgun, or Nodemailer) for password resets.
   - Make sure reset tokens expire and are single-use.
3. **User Data Exposure**
   - Never send the password field in API responses.
   - Only expose necessary user info.

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

Email: admin@docman.local
Username: admin (you can use either email or username)
Password: admin123

