export type EmailType = 'VERIFY_EMAIL' | 'RESET_PASSWORD';

export const generateAuthEmailHTML = (type: EmailType, url: string, userEmail: string): string => {
    const config = {
        VERIFY_EMAIL: {
            title: "Verifikasi Alamat Email",
            message: "Terima kasih telah bergabung. Untuk memastikan keamanan akun Anda dan mengaktifkan semua fitur, silakan verifikasi alamat email ini.",
            buttonText: "Verifikasi Email Saya",
            warning: "Tautan ini akan kedaluwarsa dalam 24 jam."
        },
        RESET_PASSWORD: {
            title: "Instruksi Reset Password",
            message: "Kami menerima permintaan untuk mereset kata sandi akun Anda. Jika Anda merasa tidak melakukan permintaan ini, Anda dapat mengabaikan email ini dengan aman.",
            buttonText: "Reset Kata Sandi",
            warning: "Tautan ini hanya berlaku selama 1 jam demi alasan keamanan."
        }
    };

    const content = config[type];

    // Menggunakan palet #0B1120 (Deep Space/Slate) alih-alih #000000 murni untuk kenyamanan visual
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!-- Dukungan Dark Mode Klien Email (Apple Mail, Outlook, dll) -->
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0B1120; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B1120; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <!-- Main Card Container -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #1E293B; border-radius: 12px; border: 1px solid #334155; overflow: hidden;">
                        
                        <!-- Header -->
                        <tr>
                            <td align="center" style="padding: 40px 0 20px 0;">
                                <h1 style="color: #F8FAFC; font-size: 24px; margin: 0; font-weight: 600;">${content.title}</h1>
                            </td>
                        </tr>
                        
                        <!-- Body Content -->
                        <tr>
                            <td style="padding: 0 40px 30px 40px;">
                                <p style="color: #CBD5E1; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                                    Halo <strong>${userEmail}</strong>,<br><br>
                                    ${content.message}
                                </p>
                                
                                <!-- CTA Button Layout dengan Table untuk kompatibilitas Outlook -->
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center">
                                            <a href="${url}" style="display: inline-block; background-color: #3B82F6; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; border: 1px solid #2563EB;">
                                                ${content.buttonText}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer / Fallback -->
                        <tr>
                            <td style="padding: 30px 40px; background-color: #0F172A; border-top: 1px solid #334155;">
                                <p style="color: #94A3B8; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
                                    ${content.warning}
                                </p>
                                <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin: 0;">
                                    Jika tombol tidak berfungsi, salin dan tempel URL berikut ke dalam browser Anda:<br>
                                    <a href="${url}" style="color: #60A5FA; word-break: break-all; text-decoration: underline;">
                                        ${url}
                                    </a>
                                </p>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};