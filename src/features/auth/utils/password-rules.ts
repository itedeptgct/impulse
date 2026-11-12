export interface PasswordRequirements {
	hasMinLength: boolean;
	hasLetter: boolean;
	hasNumber: boolean;
	hasSpecial: boolean;
	isValid: boolean;
}

export function checkPasswordRequirements(
	password: string,
): PasswordRequirements {
	const trimmed = password || "";
	const hasMinLength = trimmed.length >= 8;
	const hasLetter = /[a-zA-Z]/.test(trimmed);
	const hasNumber = /[0-9]/.test(trimmed);
	const hasSpecial = /[^a-zA-Z0-9]/.test(trimmed);

	return {
		hasMinLength,
		hasLetter,
		hasNumber,
		hasSpecial,
		isValid: hasMinLength && hasLetter && hasNumber && hasSpecial,
	};
}
