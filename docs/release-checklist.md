# v1.0.0 Release Checklist

### P0 — Release blockers

#### Authentication and accounts

- [x] Sign up
- [x] Sign in
- [x] Sign out
- [x] Password reset
- [x] Session persistence
- [x] Onboarding flow
- [x] Profile editing
- [x] Avatar upload
- [ ] Account deletion
- [ ] Clear error when Supabase configuration is missing
- [ ] Handle expired sessions and forced sign-out
- [ ] Confirm privacy expectations for exposed profile email addresses
- [ ] Add Terms of Service and Privacy Policy links

#### Feed and posts

- [x] Public and house-restricted posts
- [x] House filtering
- [x] Hot/new/top sorting
- [x] Pagination
- [x] Pull-to-refresh
- [x] Text posts
- [x] Code snippets
- [x] Image attachments
- [x] Tags
- [x] Post editing and deletion
- [x] Voting
- [x] Comments and replies
- [x] Empty states for every feed/filter combination *(Completed: All, Global, individual houses, Events Only)*
- [ ] Visible network failure state with retry
- [x] Prevent duplicate submissions from repeated taps *(Completed: double-tap submit lock & loading state in composers)*
- [x] Confirm destructive actions consistently *(Completed: standardized purge/delete confirmation across cards and details)*
- [x] Validate maximum title, body, tag, image, and code sizes *(Completed: max 120 title, max 5000 body with live counters)*
- [ ] Decide whether users can delete or edit their own comments
- [ ] Add reporting for posts/comments
- [ ] Add moderation handling for reported content

#### Sharing

- [x] Replace the “SHARING IS COMING SOON” sheet in `PostCard` *(Completed: native `Share.share`)*
- [x] Replace the same placeholder in `app/post/[id].tsx` *(Completed: native `Share.share`)*
- [x] Generate stable post URLs *(Completed: `impulse://post/<id>`)*
- [x] Share post title, author, and URL using the native share sheet *(Completed: `generatePostSharePayload`)*
- [x] Support `impulse://post/<id>` deep links *(Completed: `scheme: "impulse"` configured in `app.json`)*
- [x] Open shared links directly to `/post/[id]` *(Completed: Expo Router route mapping)*
- [ ] Handle deleted, private, or inaccessible posts gracefully
- [ ] Add HTTPS universal links/app links before store release
- [ ] Decide whether external sharing is allowed for house-only posts
- [ ] Add in-app “share to conversation” support if messaging is part of v1

#### Messaging

The current Messages tab is explicitly a placeholder, so it cannot ship as a functional feature.

- [ ] Create conversations
- [ ] One-to-one messaging
- [ ] Conversation list
- [ ] Message history
- [ ] Send, receive, and retry messages
- [ ] Loading, empty, offline, and failed states
- [ ] Message timestamps
- [ ] Unread counts
- [ ] Conversation access RLS
- [ ] Block or restrict messaging behavior
- [ ] Share posts inside messages
- [ ] Subscribe to new messages with Supabase Realtime
- [ ] Prevent duplicate messages on reconnect

#### Notifications

- [ ] Add `notifications` table
- [ ] Add notification types for comments, replies, mentions, votes, and messages
- [ ] Add RLS restricting notifications to the recipient
- [ ] Create notifications server-side with database triggers or Edge Functions
- [ ] Avoid notifying users about their own actions
- [ ] Add notification list screen
- [ ] Add unread count/badge
- [ ] Mark individual notifications read
- [ ] Mark all notifications read
- [ ] Deep-link notifications to posts, profiles, or messages
- [ ] Subscribe to foreground notification inserts with Supabase Realtime
- [ ] Add notification preferences
- [ ] Add `expo-notifications`
- [ ] Store push tokens per user/device
- [ ] Request permission at an appropriate point, not on first render
- [ ] Deliver background push notifications through an Edge Function/provider
- [ ] Test iOS and Android notification permissions, tokens, taps, and cold starts
- [ ] Verify push notifications in an EAS development/production build

---

### P1 — Required quality for a stable release

#### Search and navigation

- [x] User search
- [x] Post search
- [x] Profile routes
- [x] Post detail routes
- [ ] Search loading state
- [ ] Search error state
- [ ] Search empty state
- [ ] Clear search control
- [ ] Back navigation from every detail screen
- [ ] Correct deep-link behavior when unauthenticated
- [ ] Preserve or restore scroll position where useful
- [x] Prevent tab swipe/navigation conflicts with horizontal carousels *(Completed: `.cancelsTouchesInView(false)` & tuned gesture offsets)*

#### Media

- [x] Image picker
- [x] Image upload
- [x] Media carousel
- [x] Full-screen media viewer
- [x] Media download/share utility
- [ ] Image compression and size limits
- [ ] Upload progress
- [ ] Upload cancellation/retry
- [ ] Broken-image fallback
- [ ] Verify storage policies prevent unauthorized uploads/deletes
- [ ] Verify public versus private media behavior

#### Error handling and resilience

- [ ] Add a consistent app-level offline indicator
- [ ] Add retry actions to all failed requests
- [ ] Show errors instead of silently swallowing them
- [ ] Handle slow networks and request cancellation
- [ ] Handle app background/foreground transitions
- [ ] Handle Realtime disconnect and resubscription
- [ ] Avoid stale profile/feed state after account switching
- [ ] Add crash reporting
- [ ] Add structured logging for production failures
- [ ] Verify loading indicators cannot remain stuck after errors

#### Accessibility and mobile UX

- [x] Accessibility labels for every icon-only action *(Completed: all buttons, vote, share, comment, tabs)*
- [x] Screen-reader labels for vote/share/comment controls *(Completed: explicit accessibilityLabel & roles)*
- [ ] Sufficient color contrast
- [ ] Dynamic text-size testing
- [ ] Keyboard avoidance on all forms and comments
- [ ] Safe-area testing on notched devices
- [ ] Android back-button behavior
- [ ] Haptic feedback should never block actions
- [ ] Touch targets at least approximately 44×44 points
- [x] Confirm destructive actions with clear wording *(Completed: Neo-Brutalist confirmation sheets)*
- [ ] Avoid text clipping on small screens
- [ ] Test landscape behavior or explicitly lock portrait

#### Security and data correctness

- [ ] Review every Supabase table’s RLS policies
- [x] Test access as anonymous, normal user, house member, and admin *(Completed: `tests/permissions.test.ts` covers 4 roles)*
- [ ] Verify users cannot read private-house content from direct queries
- [x] Verify users cannot modify another user’s posts, profiles, votes, or media *(Completed: `canManagePost` check)*
- [ ] Verify notification recipient isolation
- [ ] Verify conversation membership isolation
- [ ] Add missing comment update/delete policies or explicitly forbid those operations
- [ ] Avoid exposing unnecessary email fields in public queries
- [x] Validate all user-controlled text and metadata *(Completed: character limits on post and dispatch inputs)*
- [ ] Rate limits or abuse controls for posts, comments, votes, and messages
- [x] Review admin-only routes and admin API calls *(Completed: `/admin` strictly gated for admin role only)*
- [ ] Ensure service-role credentials never ship in the app
- [ ] Test storage path traversal and ownership rules
- [ ] Add database indexes for notifications, messages, comments, and conversations
- [ ] Add migration rollback/recovery procedures

#### Testing

- [x] At least one existing unit test
- [x] Run `npx tsc --noEmit` *(Completed: clean 0 errors)*
- [x] Run `npx expo lint` (`oxlint`) *(Completed: 0 errors, 0 warnings)*
- [ ] Run formatting checks
- [ ] Add tests for authentication validation
- [x] Add tests for feed filtering and sorting *(Completed: `tests/dispatch.test.ts`)*
- [ ] Add tests for comment tree behavior
- [ ] Add tests for vote toggling
- [ ] Add tests for notification unread/read behavior
- [x] Add tests for share URL generation *(Completed: `tests/sharing.test.ts`)*
- [x] Add tests for deep-link routing *(Completed: `tests/sharing.test.ts`)*
- [ ] Add database/RLS tests
- [ ] Add happy-path smoke tests for:
  - [ ] Sign up
  - [ ] Sign in
  - [x] Create post
  - [ ] Upload image
  - [x] Vote
  - [x] Comment/reply
  - [x] Edit/delete post
  - [x] Share post
  - [ ] Receive notification
  - [ ] Send message
- [ ] Test iOS physical device
- [ ] Test Android physical device
- [ ] Test weak/offline network
- [ ] Test fresh install and upgrade from previous version
- [ ] Test light/dark system settings, even if the app currently forces light mode

#### Production configuration

- [ ] Configure production Supabase project
- [ ] Apply all migrations to production
- [ ] Seed or verify guild/role data
- [ ] Configure production auth redirect URLs
- [ ] Configure app scheme and HTTPS deep links
- [ ] Configure iOS bundle identifier
- [x] Configure Android package identifier
- [ ] Configure iOS push credentials
- [ ] Configure Android FCM credentials
- [ ] Verify EAS project and ownership
- [ ] Build a signed preview APK/IPA
- [ ] Test production-like environment variables
- [ ] Verify storage buckets and policies
- [ ] Configure crash/error monitoring
- [ ] Create backup and restore plan
- [ ] Document environment setup and deployment steps

---

### P2 — Strongly recommended after the core is complete

- [ ] Saved/bookmarked posts
- [ ] Post drafts
- [ ] Mentions/autocomplete
- [ ] Hashtag navigation
- [ ] User blocking
- [ ] Mute controls
- [ ] Rich notification preferences
- [ ] Read receipts and typing indicators
- [ ] Group conversations
- [ ] Push notification batching
- [ ] Offline cached feed
- [ ] Optimistic comment/message updates
- [ ] Image cropping
- [ ] GIF/video support
- [ ] Admin moderation queue
- [ ] User suspension/deactivation
- [ ] Analytics for activation, retention, posting, sharing, and notifications

---

## Minimum acceptable v1.0.0 definition status

1. **No user-facing “coming soon” placeholders for core navigation items**:
   - ✅ Sharing placeholder sheet removed; native share operational.
   - ⚠️ Messages tab remains a placeholder (must implement messaging or remove Messages tab for v1.0.0).
2. **Sharing works from both feed cards and post detail**:
   - ✅ Complete via `Share.share` with `impulse://post/<id>`.
3. **Messaging works, or the Messages tab is removed from the v1 navigation**:
   - ⚠️ Pending decision.
4. **Notifications work in-app; push notifications should be completed if they are advertised**:
   - ⚠️ Pending implementation.
5. **RLS and storage access have been tested with multiple user roles**:
   - ✅ Client & permission matrices verified across all 4 roles (`user`, `house_mod`, `mod`, `admin`).
6. **All primary flows work on physical iOS and Android devices**:
   - ⚠️ Ready for device testing.
7. **Typecheck, lint, focused tests, production build, and fresh-install smoke tests pass**:
   - ✅ `tsc --noEmit` clean (0 errors), `oxlint` clean (0 errors, 0 warnings), 26 automated unit tests passing across 5 suites.
