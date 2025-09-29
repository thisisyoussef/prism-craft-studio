import { Resend } from 'resend';

let resend: Resend | undefined;
function getResend(): Resend {
    if (resend) return resend;
    const key = process.env.RESEND_API_KEY as string | undefined;
    if (!key) throw new Error('Resend not configured');
    resend = new Resend(key);
    return resend;
}

export interface SendEmailParams {
	to: string | string[];
	subject: string;
	text?: string;
	html?: string;
	from?: string;
}

export async function sendEmail(params: SendEmailParams) {
    const client = getResend();
    const primaryFrom = params.from || process.env.EMAIL_FROM || '';
    const fallbackFrom = 'Prism Craft <onboarding@resend.dev>';
    const text = params.text ?? (params.html ? stripHtml(params.html) : '');

    const attempt = async (from: string) => client.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html ?? undefined,
        text,
    });

    // Try primary first (if provided), else fall back immediately
    if (primaryFrom) {
        const { data, error } = await attempt(primaryFrom);
        if (!error) return data;
        console.warn('[email] Primary sender failed:', error);
        // Retry with fallback sender
        const retry = await attempt(fallbackFrom);
        if (retry.error) {
            const message = typeof (retry.error as any)?.message === 'string' ? (retry.error as any).message : JSON.stringify(retry.error);
            throw new Error(`Resend send failed (retry): ${message}`);
        }
        return retry.data;
    }

    // No primaryFrom configured, use fallback
    const { data, error } = await attempt(fallbackFrom);
    if (error) {
        const message = typeof (error as any)?.message === 'string' ? (error as any).message : JSON.stringify(error);
        throw new Error(`Resend send failed: ${message}`);
    }
    return data;
}

function stripHtml(s: string): string {
    try {
        return s.replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
    } catch {
        return '';
    }
}