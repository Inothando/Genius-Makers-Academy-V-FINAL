# Genius Makers Academy - Firestore Security Specification

## 1. Data Invariants
- **Users**: A user can only read/write their own profile. Roles (admin) can only be set by other admins (or bootstrapped).
- **Papers**: Publicly readable. Only admins can create/update/delete.
- **Resources**: Publicly readable. Any authenticated user can create. Only the author or an admin can update/delete.
- **Discussions**: Publicly readable. Anyone (including guests) can create. Only the author (if authenticated) or an admin can update/delete.
- **Replies**: Publicly readable. Linked to a discussion.

## 2. The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Spoofing**: Creating a user profile with a different UID than an authenticated session.
2. **Privilege Escalation**: Updating own user document to set `role: 'admin'`.
3. **Orphaned Papers**: Creating a past paper without a valid year (e.g. `year: -500`).
4. **Shadow Fields**: Adding a `secretField: true` to a community resource.
5. **PII Leakage**: Attempting to list all users' emails by a guest.
6. **Illegal Deletion**: A student attempting to delete a paper uploaded by an admin.
7. **Resource Poisoning**: Injecting 1MB of junk into a discussion title.
8. **Recursive Cost Attack**: Listing resources without any filters (enforced query).
9. **Timestamp Spoofing**: Setting `createdAt` to a future date manually.
10. **Immutable Field Change**: Changing `authorId` on a resource after creation.
11. **Guest Hijacking**: Updating a guest post by a logged-in user who isn't the owner.
12. **Status Skipping**: If papers had a 'status' field, trying to set it to 'published' without going through 'review'.

## 3. Test Runner (Draft)
A `firestore.rules.test.ts` would be used to verify these denials using the `@firebase/rules-unit-testing` library.
