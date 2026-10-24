# Impulse Social Web, Profiles & Comment Replies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Impulse into a production-grade social web app with a responsive 3-column shell, full-page username profiles (`/u/[username]`), profile customization, threaded comment replies, disabled Google OAuth, and contrast fixes for native icons.

**Architecture:** 
1. Build a responsive 3-column desktop shell in `app/(tabs)/_layout.web.tsx` wrapping child routes (`<Slot />`) with persistent navigation on the left and faction/student discovery widgets on the right.
2. Implement `/u/[username]` via `app/(tabs)/u/[username].tsx` as a shared route for public profiles, with `PostCard` and `PostCommentsModal` author clicks routed to `router.push("/(tabs)/u/${username}")`.
3. Refactor native `app/(tabs)/profile.tsx` to display the user's social profile with `EditProfileModal`, housing verification and sign out in an account action menu.
4. Add `parent_id` and `reply_to_username` to the comment schema and render 1-level indented threaded replies with active "Replying to @username" state.
5. Remove Google OAuth triggers across all platforms and replace class-based icon colors with explicit `color` props on `lucide-react-native` elements.

**Tech Stack:** React Native 0.86, Expo Router SDK 57, React 19, Lucide React Native, Tailwind CSS / Uniwind, Zustand, Supabase / AsyncStorage.

**Spec:** `docs/superpowers/specs/2026-10-24-social-web-profiles-replies-design.md`

## Global Constraints
- **Platform Parity:** All new features must work across Web, iOS, and Android.
- **Expo Router:** Routes live in `app/`; non-route logic lives in `src/`. Register `u/[username]` with `href: null` in native tabs.
- **Icon Colors:** All `lucide-react-native` icons must specify explicit `color` props (e.g. `color="#10b981"`, `color="#a1a1aa"`) rather than solely relying on Tailwind `className="text-..."`.
- **Resilient Fallback:** Profile edits and comment replies must persist to Supabase when available and fall back gracefully to Supabase Auth `user_metadata` and `AsyncStorage` if DB columns are unmigrated.
- **Quality Gates:** `npx tsc --noEmit` and `npm run lint` must pass with 0 errors.

## Review Focus
1. **Native Tab Navigation with Dynamic Route:** Visiting `/u/[username]` must not append a new tab icon to the native bottom tab bar (`href: null` in `Tabs.Screen`).
2. **Comment Nesting Edge Cases:** Replying to a reply must still link to the root comment's `parent_id` so replies don't nest infinitely off-screen on mobile devices.
3. **Username Route Case-Insensitivity:** Navigating to `/u/JohnDoe` or `/u/johndoe` must resolve the user profile regardless of letter casing.
4. **Unmigrated Remote Schema Protection:** Updating `bio` or `major` on a Supabase instance without these columns must not throw an unhandled PostgREST exception.
5. **No Broken Native Icons:** Native screens must not display black-on-dark icons in buttons, headers, or badges.

---

### Task 1: Native Icon Contrast & Color Fix

**Files:**
- Modify: `src/features/posts/components/PostCard.tsx`
- Modify: `src/features/posts/components/PostCommentsModal.tsx`
- Modify: `src/features/posts/components/PostComposerModal.tsx`
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/profile.tsx`
- Modify: `app/(tabs)/guilds.tsx`

**Interfaces:**
- Consumes: `lucide-react-native` icon components
- Produces: Components that supply explicit `color` props ensuring proper contrast on native dark mode

- [ ] **Step 1: Inspect and identify all icons missing explicit `color`**
Run: `grep -rn "<[A-Z]" src/features/posts/components app/(tabs)` to locate Lucide icon tags that rely on `className="text-..."` without a `color` prop.

- [ ] **Step 2: Update `PostCard.tsx` icons with explicit `color` props**
In `src/features/posts/components/PostCard.tsx`:
- `ArrowUp`: `color={isUpvoted ? "#10b981" : "#a1a1aa"}`
- `ArrowDown`: `color={isDownvoted ? "#ef4444" : "#a1a1aa"}`
- `MessageSquare`: `color="#a1a1aa"`
- `Share2`: `color="#a1a1aa"`
- `CheckCircle2`: `color="#10b981"`

- [ ] **Step 3: Update `PostCommentsModal.tsx` and `PostComposerModal.tsx` with explicit `color` props**
In `PostCommentsModal.tsx`:
- `MessageSquare`: `color="#10b981"`
- `X`: `color="#a1a1aa"`
- `Send`: `color={newCommentText.trim() ? "#ffffff" : "#a1a1aa"}`
In `PostComposerModal.tsx`:
- `Code2`, `Hash`, `Lock`, `AlertCircle`, `X`: `color="#a1a1aa"`
- `Send`: `color="#ffffff"`

- [ ] **Step 4: Update `app/(tabs)/index.tsx`, `profile.tsx`, and `guilds.tsx` icons**
In `app/(tabs)/index.tsx`:
- `Plus`: `color="#ffffff"`
- `Sparkles`: `color="#10b981"`
- `Clock`: `color="#f59e0b"`
- `Flame`: `color={selectedSort === "hot" ? "#10b981" : "#a1a1aa"}`
- `Trophy`: `color={selectedSort === "top" ? "#10b981" : "#a1a1aa"}`
In `app/(tabs)/profile.tsx` & `guilds.tsx`:
- Ensure all Lucide icons have explicit `color` props.

- [ ] **Step 5: Run typecheck and lint to verify**
Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors

- [ ] **Step 6: Commit**
```bash
git add src/features/posts/components/ app/(tabs)/
git commit -m "fix(ui): pass explicit color props to lucide icons for native contrast"
```

---

### Task 2: Auth Cleanup - Disable Google OAuth

**Files:**
- Modify: `app/(onboarding)/onboarding.tsx`
- Modify: `app/(onboarding)/onboarding.web.tsx`
- Modify: `app/(auth)/sign-in.tsx`
- Modify: `app/(auth)/sign-in.web.tsx`
- Modify: `app/(auth)/sign-up.tsx`
- Modify: `app/(auth)/sign-up.web.tsx`
- Modify: `app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: Standard email/password authentication hooks
- Produces: Auth screens without Google OAuth buttons or divider artifacts

- [ ] **Step 1: Remove Google SSO button from onboarding screens**
In `app/(onboarding)/onboarding.tsx` and `app/(onboarding)/onboarding.web.tsx`:
- Remove Google SSO button and unused `useGoogleSignIn` import.
- Ensure the primary CTA ("Get Started" / "Sign in with Email") directly navigates to `/(auth)/sign-in`.

- [ ] **Step 2: Remove Google SSO from Sign In screens**
In `app/(auth)/sign-in.tsx` and `app/(auth)/sign-in.web.tsx`:
- Remove the Google SSO button and the "or continue with" divider.
- Ensure the email/password form remains the central interactive card.

- [ ] **Step 3: Remove Google SSO from Sign Up screens**
In `app/(auth)/sign-up.tsx` and `app/(auth)/sign-up.web.tsx`:
- Remove the Google SSO button and divider.

- [ ] **Step 4: Clean up Profile screen SSO indicator**
In `app/(tabs)/profile.tsx`:
- Remove Google SSO provider badges or references.

- [ ] **Step 5: Run typecheck and lint to verify**
Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors

- [ ] **Step 6: Commit**
```bash
git add app/(onboarding)/ app/(auth)/ app/(tabs)/profile.tsx
git commit -m "refactor(auth): disable Google OAuth on onboarding and auth screens"
```

---

### Task 3: Comment Replies Data Model & API

**Files:**
- Modify: `src/features/posts/types.ts`
- Modify: `src/features/posts/api.ts`
- Test: `src/features/posts/__tests__/comment-replies.test.ts`

**Interfaces:**
- Consumes: `Comment` and `PostAuthor` types
- Produces: `addPostComment(postId: string, author: PostAuthor, content: string, parentId?: string | null, replyToUsername?: string | null): Promise<Comment>`

- [ ] **Step 1: Write test for threaded comment replies**
Create `src/features/posts/__tests__/comment-replies.test.ts`:
```typescript
import { addPostComment, fetchPostComments } from "../api";
import type { PostAuthor } from "../types";

export async function testCommentReplies() {
  const author: PostAuthor = { id: "test-user-1", username: "alex", guild: null };
  const rootComment = await addPostComment("test-post", author, "Root comment");
  if (!rootComment.id) throw new Error("Root comment failed to create");

  const replyAuthor: PostAuthor = { id: "test-user-2", username: "sarah", guild: null };
  const replyComment = await addPostComment(
    "test-post",
    replyAuthor,
    "Replying to root",
    rootComment.id,
    "alex"
  );

  if (replyComment.parent_id !== rootComment.id) {
    throw new Error(`Expected parent_id ${rootComment.id}, got ${replyComment.parent_id}`);
  }
  if (replyComment.reply_to_username !== "alex") {
    throw new Error(`Expected reply_to_username 'alex', got ${replyComment.reply_to_username}`);
  }

  const allComments = await fetchPostComments("test-post");
  const foundReply = allComments.find((c) => c.id === replyComment.id);
  if (!foundReply || foundReply.parent_id !== rootComment.id) {
    throw new Error("Reply not properly persisted in comment cache");
  }

  console.log("Comment replies test passed!");
}
```

- [ ] **Step 2: Update `Comment` type in `src/features/posts/types.ts`**
Add `parent_id?: string | null` and `reply_to_username?: string | null` to `Comment`.

- [ ] **Step 3: Update `addPostComment` in `src/features/posts/api.ts`**
Update function signature:
```typescript
export async function addPostComment(
  postId: string,
  author: PostAuthor,
  content: string,
  parentId?: string | null,
  replyToUsername?: string | null,
): Promise<Comment>
```
Store `parent_id: parentId || null` and `reply_to_username: replyToUsername || null` in the `newComment` object and persist to `AsyncStorage` and Supabase (with fallback if remote table does not have `parent_id` column).

- [ ] **Step 4: Execute test using bun / node**
Run: `bun -e "import { testCommentReplies } from './src/features/posts/__tests__/comment-replies.test.ts'; testCommentReplies()"`
Expected: "Comment replies test passed!"

- [ ] **Step 5: Run typecheck and lint**
Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors

- [ ] **Step 6: Commit**
```bash
git add src/features/posts/
git commit -m "feat(posts): add parent_id and reply_to_username to comment data model and API"
```

---

### Task 4: Threaded Comment Replies UI in `PostCommentsModal`

**Files:**
- Modify: `src/features/posts/components/PostCommentsModal.tsx`

**Interfaces:**
- Consumes: `Comment` with `parent_id` and `reply_to_username`
- Produces: Indented comment reply list, active reply target bar (`Replying to @username`), and direct author navigation

- [ ] **Step 1: Add reply state to `PostCommentsModal`**
In `src/features/posts/components/PostCommentsModal.tsx`:
Add state:
```typescript
const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
```

- [ ] **Step 2: Group comments into threads**
Separate comments into root comments (`!c.parent_id`) and replies keyed by `parent_id`:
```typescript
const rootComments = comments.filter((c) => !c.parent_id);
const repliesByParentId = comments.reduce<Record<string, Comment[]>>((acc, c) => {
  if (c.parent_id) {
    acc[c.parent_id] = acc[c.parent_id] || [];
    acc[c.parent_id].push(c);
  }
  return acc;
}, {});
```

- [ ] **Step 3: Render indented reply threads**
Under each root comment, render any associated replies with an indentation bar (`ml-7 pl-3.5 border-l-2 border-primary/30 mt-2 space-y-2.5`).
Include a "Reply" button on every comment that calls `setReplyingTo({ id: rootComment.id, username: comment.author.username })`.
Add link/pressable on comment author names navigating to `router.push("/(tabs)/u/" + comment.author.username)`.

- [ ] **Step 4: Render active reply chip above input box**
When `replyingTo` is set, render:
```tsx
<View className="flex-row items-center justify-between bg-primary/10 px-3 py-1.5 rounded-lg mb-2">
  <Text className="text-xs text-primary">Replying to @{replyingTo.username}</Text>
  <Pressable onPress={() => setReplyingTo(null)}>
    <X size={14} color="#10b981" />
  </Pressable>
</View>
```

- [ ] **Step 5: Pass `parentId` and `replyToUsername` in `handleSendComment`**
Call `addPostComment(post.id, author, text, replyingTo?.id, replyingTo?.username)` and clear `replyingTo`.

- [ ] **Step 6: Run typecheck and lint**
Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors

- [ ] **Step 7: Commit**
```bash
git add src/features/posts/components/PostCommentsModal.tsx
git commit -m "feat(posts): render threaded replies and active reply bar in comments modal"
```

---

### Task 5: User Profiles Data Layer & Customization API

**Files:**
- Modify: `src/features/auth/types.ts`
- Modify: `src/features/auth/api.ts`
- Test: `src/features/auth/__tests__/profile-customization.test.ts`

**Interfaces:**
- Consumes: `Profile`
- Produces: `fetchProfileByUsername(username: string): Promise<Profile | null>`, `updateUserProfile(userId: string, updates: Partial<Profile>): Promise<Profile>`

- [ ] **Step 1: Write test for profile retrieval by username and profile customization**
Create `src/features/auth/__tests__/profile-customization.test.ts`:
```typescript
import { fetchProfileByUsername, updateUserProfile } from "../api";
import type { Profile } from "../types";

export async function testProfileCustomization() {
  const initialProfile: Profile = {
    id: "user-test-profile",
    username: "coder123",
    email: "coder@test.com",
    role: "user",
    guild: "octagram",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updated = await updateUserProfile("user-test-profile", {
    bio: "Systems architect and open source fan.",
    major: "Computer Science",
    avatar_url: "https://example.com/avatar.png",
  });

  if (updated.bio !== "Systems architect and open source fan.") {
    throw new Error("Bio was not properly updated");
  }
  if (updated.major !== "Computer Science") {
    throw new Error("Major was not properly updated");
  }

  const fetched = await fetchProfileByUsername("CODER123");
  if (!fetched || fetched.bio !== "Systems architect and open source fan.") {
    throw new Error("Case-insensitive fetchProfileByUsername failed");
  }

  console.log("Profile customization test passed!");
}
```

- [ ] **Step 2: Update `Profile` interface in `src/features/auth/types.ts`**
Add:
```typescript
bio?: string | null;
major?: string | null;
avatar_url?: string | null;
display_name?: string | null;
```

- [ ] **Step 3: Implement `fetchProfileByUsername` and `updateUserProfile` in `src/features/auth/api.ts`**
- `fetchProfileByUsername(username: string)`:
  - Normalize username to lowercase.
  - Check Supabase `profiles` where `username.ilike.${normalized}`.
  - Fallback: check `AsyncStorage` cached profile and mock student registry.
- `updateUserProfile(userId: string, updates: Partial<Profile>)`:
  - Attempt updating Supabase `profiles` table.
  - Resilient fallback: update Supabase Auth `user_metadata` (`supabase.auth.updateUser({ data: updates })`).
  - Cache to `AsyncStorage` and update `useAuthStore.getState().setProfile()`.

- [ ] **Step 4: Execute test with bun**
Run: `bun -e "import { testProfileCustomization } from './src/features/auth/__tests__/profile-customization.test.ts'; testProfileCustomization()"`
Expected: "Profile customization test passed!"

- [ ] **Step 5: Run typecheck and lint**
Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors

- [ ] **Step 6: Commit**
```bash
git add src/features/auth/
git commit -m "feat(auth): add profile customization fields and username lookup API"
```

---

### Task 6: Edit Profile Modal (`EditProfileModal.tsx`)

**Files:**
- Create: `src/features/auth/components/EditProfileModal.tsx`

**Interfaces:**
- Consumes: `useAuthStore` and `updateUserProfile`
- Produces: Modal dialog for updating bio, major, display name, and avatar URL on Web and Native

- [ ] **Step 1: Implement `EditProfileModal.tsx`**
Create `src/features/auth/components/EditProfileModal.tsx` using `panelui-native` `Dialog`, `TextInput`, and `Button`:
- Form fields:
  - Display Name (input)
  - Major / Specialization (input, e.g. "Computer Science")
  - Bio (multiline input, max 200 characters)
  - Avatar URL or Preset Selector
- Action buttons: "Cancel" and "Save Changes" (with loading indicator).
- Explicit `color` props on all icons (`User`, `BookOpen`, `FileText`, `X`).

- [ ] **Step 2: Connect form submission to `updateUserProfile`**
On submit:
- Validate input lengths.
- Call `await updateUserProfile(user.id, { display_name, major, bio, avatar_url })`.
- Close modal and display toast or confirmation.

- [ ] **Step 3: Run typecheck and lint**
Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**
```bash
git add src/features/auth/components/EditProfileModal.tsx
git commit -m "feat(auth): create EditProfileModal for cross-platform profile customization"
```

---

### Task 7: Full-Page Username Route (`app/(tabs)/u/[username].tsx`)

**Files:**
- Create: `app/(tabs)/u/[username].tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `src/features/posts/components/PostCard.tsx`

**Interfaces:**
- Consumes: `useLocalSearchParams<{ username: string }>()`, `fetchProfileByUsername`, `fetchUserPosts`
- Produces: Shareable full-page user profile screen for Web and Native

- [ ] **Step 1: Register route in `app/(tabs)/_layout.tsx`**
Add `<Tabs.Screen name="u/[username]" options={{ href: null, headerShown: false }} />` so navigating to a user profile does NOT append an icon to the mobile bottom tab bar.

- [ ] **Step 2: Implement `app/(tabs)/u/[username].tsx`**
- Read `const { username } = useLocalSearchParams<{ username: string }>()`.
- Fetch profile via `fetchProfileByUsername(username)` and user posts via `fetchUserPosts(profile.id)`.
- Render:
  - Top navigation bar with Back button (`ArrowLeft`, `color="#ffffff"`).
  - Profile Header: Large Avatar/Initials, Display Name, `@${profile.username}`, Guild Badge, Student Verified badge, Major.
  - Bio section.
  - Metrics cards: Published posts count, reputation score, guild rank.
  - Author Posts stream: rendered using `PostCard`.
  - Conditional action:
    - If `currentUser?.id === profile.id`: "Edit Profile" button opening `EditProfileModal`.
    - If other user: "Share Profile" button.

- [ ] **Step 3: Connect author clicks in `PostCard.tsx`**
In `src/features/posts/components/PostCard.tsx`:
Wrap the author header in `Pressable onPress={() => router.push("/(tabs)/u/" + post.author.username)}` with active press feedback.

- [ ] **Step 4: Run typecheck and lint**
Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors

- [ ] **Step 5: Commit**
```bash
git add app/(tabs)/u/[username].tsx app/(tabs)/_layout.tsx src/features/posts/components/PostCard.tsx
git commit -m "feat(routes): implement shareable full-page username profile route"
```

---

### Task 8: Production Social Web Layout (`app/(tabs)/_layout.web.tsx`)

**Files:**
- Modify: `app/(tabs)/_layout.web.tsx`
- Modify: `app/(tabs)/index.web.tsx`

**Interfaces:**
- Consumes: Expo Router `<Slot />`, `useAuthStore`, `GUILDS` constants
- Produces: 3-column responsive desktop social shell (Left: Sidebar Navigation, Center: Route `<Slot />`, Right: Factions & Discovery Widgets)

- [ ] **Step 1: Refactor `app/(tabs)/_layout.web.tsx` into 3-column shell**
Transform `TabsWebLayout` in `app/(tabs)/_layout.web.tsx`:
- Desktop Container: `max-w-7xl mx-auto px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-screen bg-background`.
- **Left Column (`col-span-3 hidden md:block`)**:
  - Impulse Logo & branding.
  - Navigation list:
    - Feed Stream (`/` or `/(tabs)`)
    - Faction Guilds (`/(tabs)/guilds`)
    - My Profile (`/(tabs)/u/${profile?.username || 'me'}`)
  - "+ New Post" button opening composer.
  - User mini profile widget with Sign Out trigger.
- **Center Column (`col-span-12 md:col-span-6 max-w-2xl mx-auto w-full`)**:
  - Renders `<Slot />` so all current and future routes (`index`, `u/[username]`, `guilds`, `profile`) appear inside this central social stream.
- **Right Column (`col-span-3 hidden lg:block`)**:
  - Faction Standings Leaderboard: Octagram, Chameleon, Blue Jays with points and active badge.
  - Active Students Directory: spotlight verified students with one-click links to their `/u/[username]` profiles.

- [ ] **Step 2: Streamline `app/(tabs)/index.web.tsx`**
Ensure `index.web.tsx` focuses on rendering the central feed stream (sorting tabs, post list, creation trigger) without duplicating outer layout headers and desktop borders.

- [ ] **Step 3: Run typecheck and lint**
Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**
```bash
git add app/(tabs)/_layout.web.tsx app/(tabs)/index.web.tsx
git commit -m "feat(web): transform web layout into 3-column production social shell"
```

---

### Task 9: Native Profile Social Screen Refactor (`app/(tabs)/profile.tsx`)

**Files:**
- Modify: `app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: `useAuthStore`, `EditProfileModal`, `PostCard`
- Produces: Direct social profile view for logged-in user on mobile with "Edit Profile" and account action menu

- [ ] **Step 1: Refactor `profile.tsx` header into social profile banner**
- Display user's avatar, display name, `@username`, verified badge, faction guild badge, bio, and major.
- Prominent "Edit Profile" button opening `EditProfileModal`.
- Settings icon (`Settings`, `color="#ffffff"`) in top right opening an Account Actions sheet (Student ID Verification status/re-upload, Faction switching, Sign Out).

- [ ] **Step 2: Render user posts in tabbed profile view**
Display user's published posts with `PostCard` in a vertical scroll feed with pull-to-refresh.

- [ ] **Step 3: Run typecheck and lint**
Run: `npx tsc --noEmit && npm run lint`
Expected: 0 errors

- [ ] **Step 4: Commit**
```bash
git add app/(tabs)/profile.tsx
git commit -m "refactor(profile): modernize native profile screen with social details and edit modal"
```

---

### Task 10: End-to-End Verification & Polish

**Files:**
- Modify: (as needed for any lint or styling adjustments)

- [ ] **Step 1: Run comprehensive TypeScript typecheck**
Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run linter**
Run: `npm run lint`
Expected: 0 errors

- [ ] **Step 3: Run formatting check**
Run: `npm run fmt`
Expected: All files formatted

- [ ] **Step 4: Verify test suites**
Run:
```bash
bun -e "import { testCommentReplies } from './src/features/posts/__tests__/comment-replies.test.ts'; testCommentReplies()"
bun -e "import { testProfileCustomization } from './src/features/auth/__tests__/profile-customization.test.ts'; testProfileCustomization()"
```
Expected: All test suites pass

- [ ] **Step 5: Final git status check and commit**
```bash
git status
git commit -m "chore: verify and finalize social web, profile customization, and comment replies"
```
