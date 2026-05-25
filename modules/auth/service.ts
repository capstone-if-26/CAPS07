import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { Resend } from "resend";
import { generateAuthEmailHTML } from "./constants";

const getResend = () => new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications,
        }
    }),
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url, token }, request) => {
            await getResend().emails.send({
                from: "ojkchatbot@gmail.com",
                to: user.email,
                subject: "Instruksi Reset Password",
                html: generateAuthEmailHTML('RESET_PASSWORD', url, user.email),
            });
        },
    },
    emailVerification: {
        sendVerificationEmail: async ({ user, url, token }, request) => {
            await getResend().emails.send({
                from: "ojkchatbot@gmail.com",
                to: user.email,
                subject: "Verifikasi Alamat Email",
                html: generateAuthEmailHTML('VERIFY_EMAIL', url, user.email),
            });
        },
    },
});