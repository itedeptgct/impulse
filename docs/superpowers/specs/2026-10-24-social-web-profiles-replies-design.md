# Impulse Social Web, Profiles & Comment Replies Design

## 1. Intent and Context
Impulse is an IT/CS student network and social application built with Expo (React Native & React Native Web), Expo Router, and Supabase. Currently, the web version consists of a monolithic feed screen that lacks a dedicated desktop multi-column structure, lacks public profiles for authors, lacks nested comment replies, and contains broken black icons on native mobile due to styling incompatibilities with `lucide-react-native`.

This project transforms Impulse into a production-grade social web app with:
1. A desktop 3-column responsive shell.
2. Shareable full-page username routes (`/u/[username]`).
3. Viewable and customizable user profiles.
4. Threaded comment replies on both native and web.
5. Removal of unconfigured Google OAuth buttons.
6. Fix for black icons on native platforms.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Production Social Web Layout**: Responsive 3-column layout on web desktop (Left: Persistent Navigation & User summary; Center: Active route `<Slot />`; Right: Faction leaderboard and active students widget).
- **Public Profiles with Username Routing**: Support navigating to any user's profile via full-page route `/u/[username]`, loading their stats, faction badge, verified badge, bio, and post history.
- **Profile Customization**: Enable logged-in users to edit their profile details (display name, avatar, bio, specialization/major) with an `EditProfileModal` available on both Web and Native.
- **Threaded Comment Replies**: Support replying to specific comments with `parent_id` tracking, nested visual indentation, and active "Replying to @username" context bar.
- **Clean Auth**: Disable Google OAuth buttons on onboarding, sign-in, and sign-up flows, relying solely on working email/password and demo guest credentials.
- **Native Icon Fix**: Ensure all `lucide-react-native` icons render with high-contrast, platform-appropriate colors rather than falling back to black SVG strokes on iOS and Android.

### Non-Goals
- Real-time WebSockets push notification infrastructure (polling or optimistic state updates suffice for now).
- Infinite nesting beyond 2 indentation levels for comment replies (1 level of root indentation + flattened direct mentions for deeper replies prevents layout cramping).
- Native-only custom bridges or binary plugins that break Expo Go compatibility.

### Anti-Goals
- Creating two completely detached web and mobile codebases that duplicate business logic.
- Breaking existing feed sorting, voting, and student ID verification functionality.

---

## 3. Constraints
- **Expo SDK 57 & React Native 0.86**: Use standard Expo Router patterns (`Slot`, `router.push`, dynamic segments).
- **Cross-Platform Compatibility**: Code running in shared components must work across Web, iOS, and Android.
- **Data Persistence**: Updates to profiles and comments must persist to Supabase if connected, with resilient fallback to `AsyncStorage` caching.
- **Lucide Icons in React Native**: Must pass explicit `color` props (e.g. `color="#10b981"`, `color="#a1a1aa"`) rather than relying exclusively on Tailwind `className="text-..."`.

---

## 4. Approaches Considered

### Approach 1: Unified Responsive Shell & Expo Router Routes (Selected)
- **Concept**: Convert `app/(tabs)/_layout.web.tsx` into a responsive 3-column desktop shell hosting navigation, the center `<Slot />`, and right discovery widgets. Implement `app/(tabs)/u/[username].tsx` as a shared route for viewing profiles.
- **Trade-offs**: Keeps business logic shared between platforms, minimizes duplicated code, and provides shareable desktop URLs.
- **Decision**: Chosen by user because it satisfies production social web expectations with high code reuse.

### Approach 2: Divergent Web & Native Codebases
- **Concept**: Implement isolated `.web.tsx` screens for every route and separate `.tsx` for native.
- **Trade-offs**: More initial UI freedom, but severe duplication of data fetching, vote state, and comment mutation logic.
- **Decision**: Rejected in favor of Approach 1.

---

## 5. Detailed Architecture & Design

### A. Navigation & Web Shell (`app/(tabs)/_layout.web.tsx`)
On web platforms, `_layout.web.tsx` wraps child routes inside a 3-column container:
1. **Left Column (Navigation Sidebar)**:
   - App Logo & Branding (`impulse`).
   - Links: Feed Stream (`/`), Faction Guilds (`/guilds`), My Profile (`/u/[my-username]`).
   - Action Button: "+ New Post" modal trigger.
   - User Mini Card: Avatar, display name, `@username`, and Sign Out option.
2. **Center Column (`<Slot />`)**:
   - Renders the active child route (`index`, `u/[username]`, `guilds`, `profile`).
   - Maximum width of `max-w-2xl` on desktop for optimal reading line length.
3. **Right Column (Discovery & Widgets)**:
   - Faction Standings leaderboard (Octagram, Chameleon, Blue Jays).
   - Active / Verified Students spotlight with one-click navigation to their `/u/[username]` page.

### B. Username Routing & Public Profiles (`app/(tabs)/u/[username].tsx` and `app/(tabs)/profile.tsx`)
1. **Profile Integration Across Web and Native**:
   - On **Web**: Navigating to `/@username` or `/u/[username]` opens the public profile in the center column. Navigating to own profile shows the customized social profile with "Edit Profile" and account actions.
   - On **Native Mobile**: The bottom bar's **Profile tab** (`app/(tabs)/profile.tsx`) directly displays the user's social profile (avatar, bio, major, faction badge, verified status, published posts, and "Edit Profile" trigger), while housing an account management action sheet/header menu for Student ID verification status, Faction switching, and Sign Out.
   - Public view (`app/(tabs)/u/[username].tsx`) is registered with `href: null` in the native tab navigator, functioning as a stack push screen when tapping on any post or comment author throughout the app.
2. **Data Fetching & Resilient Persistence**:
   - `fetchProfileByUsername(username: string)`: Queries Supabase `profiles` matching username, falling back to cached profiles or synthetic student profiles.
   - `updateUserProfile(userId: string, updates: Partial<Profile>)`: Updates Supabase `profiles` table. If remote columns (`bio`, `major`, `avatar_url`) are not yet migrated in Supabase DB, it gracefully saves them into Supabase Auth `user_metadata` (`supabase.auth.updateUser({ data: ... })`) and local `AsyncStorage`, updating `useAuthStore` synchronously so UI never errors out.
3. **UI Display & Actions**:
   - Header: Large Avatar (or gradient initials fallback), Display Name, `@username`, Guild Badge (Octagram / Chameleon / Blue Jays), Student Verification badge (`Verified Student`), and optional Major/Specialization.
   - Bio & Links: User-defined biography and student info.
   - Metrics: Posts published, reputation points, faction rank.
   - Posts Feed: Reuses `PostCard` to display all author posts with voting and comment actions.
   - Conditional Actions:
     - If viewing own profile (`currentUserId === profile.id`): shows "Edit Profile" button and account settings trigger.
     - If viewing another user's profile: shows "Share Profile" button and back navigation.

### C. Profile Customization (`EditProfileModal.tsx`)
1. **Editable Fields**:
   - `display_name` (string, max 50 chars).
   - `bio` (string, max 200 chars).
   - `avatar_url` (optional image URL or image picker selection).
   - `major` (e.g. "Computer Science", "Information Technology").
2. **API Handler**:
   - `updateUserProfile(userId: string, updates: Partial<Profile>)`: Resilient update handler saving to Supabase, Auth `user_metadata`, and `AsyncStorage`.

### D. Threaded Comment Replies (`PostCommentsModal.tsx` & `features/posts`)
1. **Schema Update**:
   - Extend `Comment`:
     ```typescript
     export interface Comment {
       id: string;
       post_id: string;
       author_id: string;
       author: PostAuthor;
       content: string;
       parent_id?: string | null;
       reply_to_username?: string | null;
       created_at: string;
     }
     ```
2. **Hierarchy & Flattened Direct Mentions**:
   - Top-level comments have `parent_id: null`.
   - Replying to any comment (root or reply) sets `parent_id` to the root comment ID and sets `reply_to_username` to the author being responded to. This delivers clean 1-level indented threads with `@username` direct mentions, preventing narrow UI cramping on mobile screens.
   - Each comment displays a "Reply" button that activates the composer with a `Replying to @username` tag and dismiss button.
   - Supports optimistic UI updates and local comment cache persistence.

### E. Faction Standings & Discovery Widget
- Standings leaderboard derives scores dynamically from active post upvotes and cached member counts, combined with baseline seed stats in `features/guilds/constants.ts` so the widget loads instantly without blocking shell rendering.

### E. Auth Cleanup (Disable Google OAuth)
1. In `app/(onboarding)/onboarding.tsx` and `onboarding.web.tsx`:
   - Remove/hide the "Continue with Google" button.
   - Ensure the direct primary action routes cleanly to Sign In / Sign Up.
2. In `app/(auth)/sign-in.tsx`, `sign-in.web.tsx`, `sign-up.tsx`, `sign-up.web.tsx`:
   - Remove Google SSO buttons and divider ("or continue with").
   - Ensure form submission focuses purely on email & password.

### F. Native Black Icons Fix
1. Audit all files importing from `lucide-react-native`:
   - Replace any icon using solely `className="text-..."` with explicit `color` props:
     - Primary / active icons: `color="#10b981"`
     - Muted / secondary icons: `color="#8d8d8d"` or `color="#a1a1aa"`
     - Accent / alert icons: `color="#f59e0b"` or `color="#ef4444"`
     - Light/contrast icons: `color="#ffffff"`

---

## 6. What's Left to the Builder
- Exact animation timing for reply thread expansion.
- Fallback avatar generator color seeds based on username characters.
- Specific responsive breakpoints (`md:`, `lg:`) for sidebar collapsing on intermediate tablets.
