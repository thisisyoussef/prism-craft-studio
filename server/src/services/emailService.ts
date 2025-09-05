import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY as string | undefined;

let resend: Resend | undefined;
if (RESEND_API_KEY) {
	resend = new Resend(RESEND_API_KEY);
}

export interface SendEmailParams {
	to: string | string[];
	subject: string;
	text?: string;
	html?: string;
	from?: string;
}

export async function sendEmail(params: SendEmailParams) {
	if (!resend) throw new Error('Resend not configured');
	const from = params.from || process.env.EMAIL_FROM || 'noreply@example.com';
	return resend.emails.send({
		from,
		to: params.to,
		subject: params.subject,
		text: params.text ?? '',
		html: params.html,
	});
}