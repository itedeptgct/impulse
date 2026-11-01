import type { Post } from "../types.ts";
import { filterPostsByQuery } from "../utils/search-filter.ts";

export function testSearchFilter() {
	const posts: Partial<Post>[] = [
		{
			id: "1",
			title: "React Native Performance",
			content: "Fast rendering techniques",
			tags: ["#react", "#mobile"],
			visibility: "public",
			guild: "octagram",
		},
		{
			id: "2",
			title: "Octagram Strategy",
			content: "Internal plans",
			tags: ["#strategy"],
			visibility: "house",
			guild: "octagram",
		},
		{
			id: "3",
			title: "Chameleon Secret",
			content: "Internal secret",
			tags: ["#stealth"],
			visibility: "house",
			guild: "chameleon",
		},
	];

	// Search for "React" as an Octagram member
	const reactResults = filterPostsByQuery(
		posts as Post[],
		"react",
		"octagram",
	);
	if (reactResults.length !== 1 || reactResults[0]?.id !== "1") {
		throw new Error("Failed to find public React post");
	}

	// Search for "Strategy" as an Octagram member -> should find #2
	const stratResults = filterPostsByQuery(
		posts as Post[],
		"strategy",
		"octagram",
	);
	if (stratResults.length !== 1 || stratResults[0]?.id !== "2") {
		throw new Error("Failed to find house-only post for member");
	}

	// Search for "Secret" as an Octagram member -> should NOT find Chameleon's house-only post #3!
	const secretResults = filterPostsByQuery(
		posts as Post[],
		"secret",
		"octagram",
	);
	if (secretResults.length !== 0) {
		throw new Error(
			"Leaked other house's house-only post in search results",
		);
	}

	console.log("Search query filter test passed!");
}

testSearchFilter();
