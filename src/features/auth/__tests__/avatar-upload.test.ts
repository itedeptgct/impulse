import * as authApi from "../api";

export function testAvatarUploadSignature() {
	if (typeof (authApi as any).uploadAvatar !== "function") {
		throw new Error("uploadAvatar is not exported from auth api");
	}
	console.log("Avatar upload signature test passed!");
}
