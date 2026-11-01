import type { Post } from "../types.ts";
import { filterPostsForUser } from "../utils/filter.ts";

export function testUserPostsPrivacy() {
	const user1Public: Partial<Post> = {
		id: "p1",
		author_id: "user-1",
		visibility: "public",
		guild: "octagram",
	};

	const user1HouseOctagram: Partial<Post> = {
		id: "p2",
		author_id: "user-1",
		visibility: "house",
		guild: "octagram",
	};

	const user1HousePastGuild: Partial<Post> = {
		id: "p3",
		author_id: "user-1",
		visibility: "house",
		guild: "chameleon",
	};

	const userPosts = [
		user1Public,
		user1HouseOctagram,
		user1HousePastGuild,
	] as Post[];

	// 1. Viewing as yourself: ALL posts (public AND house-only) must be visible
	const viewingSelfOctagram = filterPostsForUser(
		userPosts,
		"octagram",
		"user-1",
	);
	if (viewingSelfOctagram.length !== 3) {
		throw new Error(
			`Viewing as self should list all 3 posts (including house-only), got: ${viewingSelfOctagram.length}`,
		);
	}

	// 2. Viewing as yourself even if current active guild is null or different: still sees all house posts
	const viewingSelfNoGuild = filterPostsForUser(userPosts, null, "user-1");
	if (viewingSelfNoGuild.length !== 3) {
		throw new Error(
			`Viewing as self with no active house should still see all own house posts, got: ${viewingSelfNoGuild.length}`,
		);
	}

	// 3. Peer in SAME house (octagram) viewing user-1: sees public + octagram house posts, NOT other house
	const viewingSameHousePeer = filterPostsForUser(
		userPosts,
		"octagram",
		"user-2",
	);
	const peerPostIds = viewingSameHousePeer.map((p) => p.id);
	if (
		!peerPostIds.includes("p1") ||
		!peerPostIds.includes("p2") ||
		peerPostIds.includes("p3")
	) {
		throw new Error(
			`Peer in octagram saw unexpected posts: ${JSON.stringify(peerPostIds)}`,
		);
	}

	// 4. Peer in DIFFERENT house (blue-jays) viewing user-1: sees ONLY public posts
	const viewingDifferentHousePeer = filterPostsForUser(
		userPosts,
		"blue-jays",
		"user-3",
	);
	const diffPeerIds = viewingDifferentHousePeer.map((p) => p.id);
	if (
		diffPeerIds.length !== 1 ||
		!diffPeerIds.includes("p1") ||
		diffPeerIds.includes("p2") ||
		diffPeerIds.includes("p3")
	) {
		throw new Error(
			`Peer in different house saw house-only posts: ${JSON.stringify(diffPeerIds)}`,
		);
	}

	// 5. Unauthenticated guest viewing user-1: sees ONLY public posts
	const viewingGuest = filterPostsForUser(userPosts, null, undefined);
	const guestIds = viewingGuest.map((p) => p.id);
	if (
		guestIds.length !== 1 ||
		!guestIds.includes("p1") ||
		guestIds.includes("p2") ||
		guestIds.includes("p3")
	) {
		throw new Error(
			`Guest saw house-only posts: ${JSON.stringify(guestIds)}`,
		);
	}

	console.log("User posts privacy test passed!");
}

testUserPostsPrivacy();
