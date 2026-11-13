export interface LegalSection {
	id: string;
	title: string;
	clauses: string[];
}

export interface LegalDocument {
	title: string;
	badge: string;
	lastUpdated: string;
	version: string;
	subtitle: string;
	sections: LegalSection[];
}

export const TERMS_OF_SERVICE: LegalDocument = {
	title: "TERMS OF SERVICE",
	badge: "[ EFFECTIVE COPY ]",
	lastUpdated: "NOVEMBER 2026",
	version: "v1.0",
	subtitle:
		"OPERATIONAL CODE OF CONDUCT AND PLATFORM GOVERNANCE PROTOCOLS FOR IMPULSE USERS.",
	sections: [
		{
			id: "01",
			title: "01 // ACCEPTANCE OF TERMS & MEMBERSHIP ELIGIBILITY",
			clauses: [
				"Impulse is a campus network for verified members of the community. You must give us information that is accurate enough to confirm who you are and which guild or house you belong to.",
				"Do not make an account for someone else, pretend to be another member, or share your login. You are responsible for what happens through your account.",
				"Some areas of Impulse are limited by guild, role, or verification status. Having an account does not automatically give you access to every area.",
			],
		},
		{
			id: "02",
			title: "02 // ACADEMIC INTEGRITY & USER CONDUCT",
			clauses: [
				"Impulse is not a place to cheat, impersonate, harass, scam, or sabotage other members. Do not use the app to:",
				"- submit or request work meant to be passed off as your own;\n- leak exams, private class material, answer keys, or another student's work;\n- bully, threaten, target, or expose another person;\n- spam, manipulate votes, scrape the app, or create fake accounts;\n- try to break into accounts, houses, or systems;\n- post private information without permission; or\n- evade a restriction, moderation action, or account suspension.",
				"Use your judgment. If something would get someone in trouble at school or put another member at risk, do not post it.",
			],
		},
		{
			id: "03",
			title: "03 // CONTENT OWNERSHIP & DISPATCH PROTOCOLS",
			clauses: [
				"You own the posts, Dispatches, comments, images, code, and other material you submit. You give Impulse permission to store, display, format, and deliver that material so the app can work.",
				"Only post material you have the right to share. Do not upload someone else's work, image, personal information, or private conversation without permission.",
				"Public posts can be seen and shared by other people. House-restricted posts are intended for their house or guild, but you should still treat the internet as permanent. Do not post anything that must stay secret.",
				"Dispatches may be used for announcements, events, alerts, and other community information. Moderators may correct, hide, archive, or remove Dispatches that are inaccurate, outdated, unsafe, or outside the Dispatch purpose.",
				"Impulse does not promise that user posts or Dispatches are accurate. Check important information before acting on it.",
			],
		},
		{
			id: "04",
			title: "04 // ACCOUNT TERMINATION & SYSTEM GOVERNANCE",
			clauses: [
				"You can stop using Impulse at any time. We can restrict, suspend, or remove an account or post when it breaks these rules, threatens the community, misuses the system, or creates a security or legal problem.",
				"Moderators and administrators may manage guild access, role assignments, house restrictions, Dispatches, and reported content. Their decisions may be reviewed through the available moderation process, but access is not guaranteed.",
				"We may change, pause, or remove features. This includes messaging, sharing, Dispatches, feeds, and any feature that is still being tested.",
				"We may keep limited records after an account or post is removed when needed for security, moderation, backups, disputes, or legal requirements.",
			],
		},
		{
			id: "05",
			title: "05 // THIRD-PARTY SERVICES",
			clauses: [
				"Impulse uses outside services for authentication, hosting, storage, app delivery, and related infrastructure. Those services may have their own rules. We are not responsible for an outage or decision made by a service we do not control.",
			],
		},
		{
			id: "06",
			title: "06 // CHANGES & CONTACT",
			clauses: [
				"We may update these rules as Impulse changes. The current version will be posted in the app or repository. Continued use after an update means you accept the updated rules.",
				"Questions or reports can be sent to impulse.app.psits@gmail.com.",
			],
		},
	],
};

export const PRIVACY_POLICY: LegalDocument = {
	title: "PRIVACY POLICY",
	badge: "[ EFFECTIVE COPY ]",
	lastUpdated: "NOVEMBER 2026",
	version: "v1.0",
	subtitle:
		"TELEMETRY DISCLOSURE, STUDENT DATA PRIVACY, AND RECORD RETENTION STANDARDS.",
	sections: [
		{
			id: "01",
			title: "01 // DATA COLLECTION & VERIFICATION ARTIFACTS",
			clauses: [
				"When you create or use an account, Impulse may collect:",
				"- email address, username, display name, avatar, course, year level, and guild or house;\n- verification status, assigned role, badges, and moderation history;\n- posts, Dispatches, comments, replies, tags, code, images, votes, and reports;\n- account session details and information needed to reset or secure your account; and\n- messages or other content if those features are enabled later.",
				"Verification artifacts are the details used to confirm that an account belongs in the community. We use them to approve access, apply house or guild restrictions, and assign roles. They are not meant to be a public profile or a school record.",
				"Please do not put passwords, government IDs, grades, medical details, or other sensitive information into a post, comment, image, or Dispatch.",
			],
		},
		{
			id: "02",
			title: "02 // GUILD TELEMETRY & NETWORK ACTIVITY",
			clauses: [
				"Impulse records basic activity needed to run a social app, including:",
				"- which feeds, guilds, profiles, posts, and Dispatches you open;\n- searches, votes, comments, shares, timestamps, and account actions;\n- device, app-version, operating-system, and crash information; and\n- security events such as failed sign-ins, unusual activity, or repeated requests.",
				"We use this information to keep the network working, show the right guild content, prevent abuse, investigate reports, fix bugs, and understand which features need attention. We do not use it to grade you or make academic decisions.",
				"Some information is visible to other users. Depending on the feature, this may include your username, display name, avatar, badges, guild or house, posts, Dispatches, comments, and votes. Do not assume that house-restricted content is completely secret.",
			],
		},
		{
			id: "03",
			title: "03 // THIRD-PARTY STORAGE & ENCRYPTION PROTOCOLS",
			clauses: [
				"Impulse relies on third-party infrastructure, including Supabase for authentication and database services, Cloudflare R2 for media and document storage, plus Expo and app-store services for delivering the app.",
				"Information may be stored or processed outside the Philippines by these providers. We use platform access controls, authentication, and encrypted connections where supported to protect data while it moves between the app and our services. Passwords should be handled by the authentication provider rather than stored as readable text by Impulse.",
				"No system is impossible to break. Do not send sensitive information through a post, comment, image, or Dispatch just because it is inside a restricted guild.",
				"We may share limited information with moderators, service providers, or authorities when needed to operate the app, investigate abuse, protect someone, or comply with law. We do not sell your personal information.",
			],
		},
		{
			id: "04",
			title: "04 // DATA SUBJECT RIGHTS & DELETION REQUESTS",
			clauses: [
				"You can ask us to:",
				"- tell you what personal information we hold about you;\n- correct information that is wrong;\n- explain how your information is being used;\n- delete or block information where the law allows it; or\n- close your account and remove its associated content where reasonably possible.",
				"Some records may remain in backups, moderation logs, security records, or legal files for a limited time. Public or shared content may also have been copied by other users before deletion.",
				"Send requests to [PRIVACY CONTACT EMAIL]. We may ask for enough information to confirm that the request is really yours.",
				"If you are not satisfied with how a request is handled, you may contact the Philippine National Privacy Commission at https://privacy.gov.ph/.",
			],
		},
		{
			id: "05",
			title: "05 // CHANGES TO THIS POLICY",
			clauses: [
				"We may update this Policy when the app or its data practices change. We will update the date and post the new version.",
				"Privacy questions and security reports can be sent to impulse.app.psits@gmail.com.",
			],
		},
	],
};
