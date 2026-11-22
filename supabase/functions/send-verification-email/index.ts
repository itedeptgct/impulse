import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
	Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const VERIFICATION_EMAIL_FROM =
	Deno.env.get("VERIFICATION_EMAIL_FROM") ??
	"Impulse <onboarding@resend.dev>";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			...corsHeaders,
			"Content-Type": "application/json",
		},
	});
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function buildVerificationEmail(params: {
	recipientName: string;
	status: "approved" | "rejected";
	rejectionReason?: string | null;
}): { subject: string; html: string; text: string } {
	const safeName = escapeHtml(params.recipientName);
	const trimmedReason = params.rejectionReason?.trim() || "";

	if (params.status === "approved") {
		const subject = "Your Impulse account has been approved!";
		const text = [
			`Hi ${params.recipientName},`,
			"",
			"Good news! Your student ID verification has been approved by our team.",
			"You can now sign in to Impulse and join your campus community.",
			"",
			"— The Impulse Team",
		].join("\n");

		const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background-color:#faf9f5;font-family:'Courier New',Courier,monospace;color:#000000;">
	<div style="max-width:560px;margin:0 auto;background-color:#ffffff;border:2px solid #000000;box-shadow:4px 4px 0 #000000;padding:24px;">
		<div style="display:inline-block;background-color:#00ff66;border:2px solid #000000;padding:4px 10px;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">
			VERIFICATION APPROVED
		</div>
		<h1 style="margin:16px 0 8px;font-size:24px;line-height:1.2;text-transform:uppercase;">
			WELCOME TO IMPULSE, ${safeName}
		</h1>
		<p style="margin:12px 0;font-size:14px;line-height:1.6;">
			Your student ID verification has been approved by our admin team.
		</p>
		<p style="margin:12px 0;font-size:14px;line-height:1.6;">
			You can now open the Impulse app and sign in with your account credentials.
		</p>
		<div style="margin-top:24px;padding-top:16px;border-top:2px solid #000000;font-size:12px;color:#4c4546;">
			IMPULSE CAMPUS NETWORK
		</div>
	</div>
</body>
</html>`.trim();

		return { subject, html, text };
	}

	const subject = "Update on your Impulse student ID verification";
	const textLines = [
		`Hi ${params.recipientName},`,
		"",
		"Unfortunately, your student ID verification could not be approved at this time.",
	];
	if (trimmedReason) {
		textLines.push("", `Reason: ${trimmedReason}`);
	}
	textLines.push(
		"",
		"If you believe this was a mistake, please reach out to an Impulse administrator.",
		"",
		"— The Impulse Team",
	);

	const reasonBlock = trimmedReason
		? `<div style="margin:16px 0;padding:12px 14px;background-color:#f4f4f0;border:2px solid #ff2a00;">
			<div style="font-size:11px;font-weight:bold;color:#ff2a00;text-transform:uppercase;margin-bottom:4px;">REJECTION REASON</div>
			<div style="font-size:13px;line-height:1.5;color:#000000;">${escapeHtml(trimmedReason)}</div>
		</div>`
		: "";

	const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background-color:#faf9f5;font-family:'Courier New',Courier,monospace;color:#000000;">
	<div style="max-width:560px;margin:0 auto;background-color:#ffffff;border:2px solid #000000;box-shadow:4px 4px 0 #000000;padding:24px;">
		<div style="display:inline-block;background-color:#ff2a00;color:#faf9f5;border:2px solid #000000;padding:4px 10px;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">
			VERIFICATION REJECTED
		</div>
		<h1 style="margin:16px 0 8px;font-size:24px;line-height:1.2;text-transform:uppercase;">
			VERIFICATION UPDATE FOR ${safeName}
		</h1>
		<p style="margin:12px 0;font-size:14px;line-height:1.6;">
			Unfortunately, your student ID verification could not be approved at this time.
		</p>
		${reasonBlock}
		<p style="margin:12px 0;font-size:14px;line-height:1.6;">
			If you believe this was a mistake, please reach out to an Impulse administrator.
		</p>
		<div style="margin-top:24px;padding-top:16px;border-top:2px solid #000000;font-size:12px;color:#4c4546;">
			IMPULSE CAMPUS NETWORK
		</div>
	</div>
</body>
</html>`.trim();

	return { subject, html, text: textLines.join("\n") };
}

export async function handleSendVerificationEmail(
	request: Request,
	adminClient = supabaseAdmin,
): Promise<Response> {
	if (request.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method Not Allowed" }, 405);
	}

	const authHeader = request.headers.get("Authorization") ?? "";
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	const jwt = match ? match[1].trim() : "";

	if (!jwt) {
		return jsonResponse(
			{ error: "Unauthorized: Missing bearer token" },
			401,
		);
	}

	const { data: userData, error: userError } =
		await adminClient.auth.getUser(jwt);
	if (userError || !userData?.user?.id) {
		return jsonResponse(
			{ error: "Unauthorized: Invalid or expired token" },
			401,
		);
	}

	const { data: callerProfile, error: profileQueryError } = await adminClient
		.from("profiles")
		.select("role")
		.eq("id", userData.user.id)
		.maybeSingle();

	const isReviewer =
		callerProfile?.role === "admin" || callerProfile?.role === "mod";
	if (profileQueryError || !isReviewer) {
		return jsonResponse(
			{ error: "Forbidden: Admin or moderator privileges required" },
			403,
		);
	}

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return jsonResponse({ error: "Invalid JSON payload" }, 400);
	}

	const verificationId =
		typeof body.verificationId === "string"
			? body.verificationId.trim()
			: "";
	const status = body.status;
	const rejectionReason =
		typeof body.rejectionReason === "string"
			? body.rejectionReason.trim()
			: null;

	if (!verificationId) {
		return jsonResponse({ error: "verificationId is required" }, 400);
	}

	if (status !== "approved" && status !== "rejected") {
		return jsonResponse(
			{ error: "status must be 'approved' or 'rejected'" },
			400,
		);
	}

	if (!RESEND_API_KEY) {
		return jsonResponse(
			{ error: "RESEND_API_KEY secret is not configured" },
			500,
		);
	}

	const { data: verification, error: verifErr } = await adminClient
		.from("id_verifications")
		.select("id, user_id, status, rejection_reason")
		.eq("id", verificationId)
		.maybeSingle();

	if (verifErr || !verification) {
		return jsonResponse({ error: "Verification record not found" }, 404);
	}

	const [authUserRes, profileRes, privateProfileRes] = await Promise.all([
		adminClient.auth.admin.getUserById(verification.user_id),
		adminClient
			.from("profiles")
			.select("display_name, username")
			.eq("id", verification.user_id)
			.maybeSingle(),
		adminClient
			.from("private_profiles")
			.select("email")
			.eq("user_id", verification.user_id)
			.maybeSingle(),
	]);

	const recipientEmail =
		authUserRes.data?.user?.email || privateProfileRes.data?.email || "";
	if (!recipientEmail) {
		return jsonResponse(
			{ error: "No email address found for target user" },
			400,
		);
	}

	const recipientName =
		profileRes.data?.display_name ||
		profileRes.data?.username ||
		recipientEmail.split("@")[0] ||
		"Student";

	const emailPayload = buildVerificationEmail({
		recipientName,
		status,
		rejectionReason: rejectionReason ?? verification.rejection_reason,
	});

	const resendResponse = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${RESEND_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: VERIFICATION_EMAIL_FROM,
			to: [recipientEmail],
			subject: emailPayload.subject,
			html: emailPayload.html,
			text: emailPayload.text,
		}),
	});

	const resendData = await resendResponse.json().catch(() => ({}));
	if (!resendResponse.ok) {
		const errorMessage =
			typeof (resendData as { message?: unknown }).message === "string"
				? (resendData as { message: string }).message
				: "Failed to send verification email";
		return jsonResponse(
			{ error: errorMessage },
			resendResponse.status >= 400 && resendResponse.status < 600
				? resendResponse.status
				: 502,
		);
	}

	return jsonResponse(
		{
			success: true,
			emailId: (resendData as { id?: string }).id ?? null,
		},
		200,
	);
}

Deno.serve(async (request: Request) => {
	try {
		return await handleSendVerificationEmail(request);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Internal Server Error";
		return jsonResponse({ error: message }, 500);
	}
});
