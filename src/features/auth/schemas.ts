import { z } from "zod";

export const signInSchema = z.object({
	email: z
		.string()
		.trim()
		.min(1, "Please enter your email address.")
		.email("Please enter a valid email address."),
	password: z.string().min(1, "Please enter your password."),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpCredentialsSchema = z
	.object({
		username: z
			.string()
			.trim()
			.min(2, "Name or username must be at least 2 characters."),
		email: z
			.string()
			.trim()
			.min(1, "Please enter your email address.")
			.email("Please enter a valid email address."),
		password: z
			.string()
			.trim()
			.min(8, "Password must be at least 8 characters long.")
			.regex(/[a-zA-Z]/, "Password must contain at least one letter.")
			.regex(/[0-9]/, "Password must contain at least one number.")
			.regex(
				/[^a-zA-Z0-9]/,
				"Password must contain at least one special character.",
			),
		confirmPassword: z.string().trim().min(1, "Please confirm your password."),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match.",
		path: ["confirmPassword"],
	});

export type SignUpCredentialsInput = z.infer<typeof signUpCredentialsSchema>;

export const idDocumentSchema = z.object({
	uri: z.string().min(1, "Document image URI is required."),
	width: z.number().optional(),
	height: z.number().optional(),
	fileName: z.string().nullable().optional(),
	fileSize: z.number().optional(),
});

export type IdDocumentInput = z.infer<typeof idDocumentSchema>;

export const forgotPasswordSchema = z.object({
	email: z
		.string()
		.trim()
		.min(1, "Please enter your email address.")
		.email("Please enter a valid email address."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
