export type PostAccessStatus =
	| "accessible"
	| "restricted"
	| "unauthenticated"
	| "not_found";

export function resolvePostAccessState(
	remoteStatus: PostAccessStatus,
	isAuthenticated: boolean,
): PostAccessStatus {
	if (remoteStatus === "not_found") {
		return "not_found";
	}
	if (remoteStatus === "restricted" && !isAuthenticated) {
		return "unauthenticated";
	}
	return remoteStatus;
}
