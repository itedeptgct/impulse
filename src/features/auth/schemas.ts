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
		password: z.string().min(6, "Password must be at least 6 characters long."),
		confirmPassword: z.string().min(1, "Please confirm your password."),
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
