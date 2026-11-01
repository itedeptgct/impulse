import { checkPasswordRequirements } from "../utils/password-rules.ts";

export function testPasswordRequirements() {
	const weak = checkPasswordRequirements("weak");
	if (
		weak.hasMinLength ||
		weak.hasNumber ||
		weak.hasSpecial ||
		weak.isValid
	) {
		throw new Error("Weak password incorrectly marked valid");
	}
	const strong = checkPasswordRequirements("SecureP@ss123");
	if (
		!strong.hasMinLength ||
		!strong.hasLetter ||
		!strong.hasNumber ||
		!strong.hasSpecial ||
		!strong.isValid
	) {
		throw new Error("Strong password failed check");
	}
	console.log("Password rules test passed!");
}

testPasswordRequirements();
