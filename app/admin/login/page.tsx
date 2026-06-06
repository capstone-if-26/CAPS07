"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type ErrorType = "email" | "password" | "general" | null;

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);

  const getErrorType = (code: string): ErrorType => {
    if (code === "INVALID_EMAIL_OR_PASSWORD") {
      return "general";
    }
    if (code === "USER_NOT_FOUND" || code === "EMAIL_NOT_FOUND") return "email";
    if (code === "INVALID_PASSWORD" || code === "WRONG_PASSWORD")
      return "password";
    return "general";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError(null);
    setErrorType(null);

    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const code = data.code || "";
        const type = getErrorType(code);
        setErrorType(type);

        if (type === "email") {
          setError("Email tidak terdaftar. Periksa kembali email Anda.");
        } else if (type === "password") {
          setError("Password salah. Periksa kembali password Anda.");
        } else {
          // Better Auth mengembalikan INVALID_EMAIL_OR_PASSWORD untuk keduanya (security best practice)
          setError(
            "Email atau password yang Anda masukkan salah. Silakan coba lagi.",
          );
        }
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setErrorType("general");
      setError(
        "Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isEmailError = errorType === "email" || errorType === "general";
  const isPasswordError = errorType === "password" || errorType === "general";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 20% 20%, rgba(180, 10, 10, 0.55) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 80%, rgba(100, 0, 0, 0.6) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 50%, rgba(140, 0, 0, 0.3) 0%, transparent 70%),
            linear-gradient(145deg, #6b0000 0%, #8C0000 30%, #7a0000 60%, #5a0000 100%);
        }

        .login-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.18;
          pointer-events: none;
          z-index: 0;
        }

        .glow-top-left {
          position: absolute;
          top: -80px; left: -80px;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,80,80,0.13) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .glow-bottom-right {
          position: absolute;
          bottom: -100px; right: -80px;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,120,120,0.10) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        .card {
          position: relative; z-index: 10;
          background: rgba(255, 255, 255, 0.97);
          border-radius: 18px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.12),
            0 8px 40px rgba(0,0,0,0.35),
            0 2px 8px rgba(0,0,0,0.18),
            inset 0 1px 0 rgba(255,255,255,0.9);
          padding: 36px 40px 28px 40px;
          width: 100%; max-width: 420px;
          margin: 0 16px;
        }

        .logo-wrap { display: flex; justify-content: center; margin-bottom: 8px; }

        .subtitle {
          text-align: center;
          color: #6b7280;
          font-size: 12.5px;
          margin-bottom: 24px;
          letter-spacing: 0.01em;
        }

        .field-wrap { margin-bottom: 14px; }

        .field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 5px;
        }

        .field-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }

        .forgot-link {
          font-size: 12.5px;
          font-weight: 600;
          color: #8C0000;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .forgot-link:hover { opacity: 0.75; text-decoration: underline; }

        .input-wrap {
          display: flex; align-items: center;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          padding: 9px 12px;
          gap: 9px;
          background: #fafafa;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .input-wrap:focus-within {
          border-color: #8C0000;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(140,0,0,0.08);
        }
        .input-wrap.input-error {
          border-color: #dc2626;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.08);
        }
        .input-wrap.input-error:focus-within {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.12);
        }

        .input-icon { flex-shrink: 0; color: #9ca3af; display: flex; align-items: center; }
        .input-icon.icon-error { color: #dc2626; }

        .input-wrap input {
          flex: 1; border: none; outline: none;
          font-size: 13.5px; color: #374151;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
        }
        .input-wrap input::placeholder { color: #b0b7c3; }

        .eye-btn {
          background: none; border: none; cursor: pointer;
          padding: 0; color: #9ca3af;
          display: flex; align-items: center;
          transition: color 0.15s;
        }
        .eye-btn:hover { color: #6b7280; }

        .field-error-text {
          font-size: 11.5px;
          color: #dc2626;
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .error-banner {
          font-size: 12.5px;
          color: #dc2626;
          text-align: center;
          margin-bottom: 12px;
          padding: 9px 12px;
          background: #fef2f2;
          border-radius: 8px;
          border: 1px solid #fecaca;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          text-align: left;
        }
        .error-banner svg { flex-shrink: 0; margin-top: 1px; }

        .btn-login {
          width: 100%; border: none; border-radius: 8px;
          padding: 11px; font-size: 14.5px; font-weight: 600;
          cursor: pointer; margin-top: 6px; letter-spacing: 0.01em;
          font-family: 'DM Sans', sans-serif; transition: all 0.2s;
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #a01010 0%, #8C0000 40%, #6e0000 100%);
          color: #fff;
          box-shadow: 0 2px 12px rgba(140,0,0,0.35), 0 1px 3px rgba(0,0,0,0.18);
        }
        .btn-login::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 100%);
          pointer-events: none;
        }
        .btn-login:hover:not(:disabled) {
          background: linear-gradient(135deg, #b01818 0%, #9a0000 40%, #7a0000 100%);
          box-shadow: 0 4px 18px rgba(140,0,0,0.45), 0 1px 3px rgba(0,0,0,0.18);
          transform: translateY(-1px);
        }
        .btn-login:active:not(:disabled) { transform: translateY(0); }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

        .footer-text {
          text-align: center; font-size: 12.5px; color: #9ca3af; margin-top: 20px;
        }
        .footer-text a { color: #8C0000; font-weight: 600; text-decoration: none; }
        .footer-text a:hover { text-decoration: underline; }

        @media (max-width: 480px) {
          .card { padding: 28px 20px 22px 20px; border-radius: 16px; }
        }
      `}</style>

      <div className="login-page">
        <div className="glow-top-left" />
        <div className="glow-bottom-right" />

        <div className="card">
          <div className="logo-wrap">
            <Image
              src="/ojk-logo.png"
              alt="Logo OJK"
              width={130}
              height={46}
              style={{ objectFit: "contain" }}
            />
          </div>

          <p className="subtitle">Akses aman ke data operasional Anda</p>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div className="field-wrap">
              <label className="field-label">Username atau Email</label>
              <div
                className={`input-wrap${isEmailError ? " input-error" : ""}`}
              >
                <span
                  className={`input-icon${isEmailError ? " icon-error" : ""}`}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                    setErrorType(null);
                  }}
                  placeholder="john.doe@example.com"
                  required
                />
              </div>
              {errorType === "email" && (
                <p className="field-error-text">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Email tidak terdaftar
                </p>
              )}
            </div>

            {/* Password */}
            <div className="field-wrap">
              <div className="field-label-row">
                <span className="field-label" style={{ marginBottom: 0 }}>
                  Password
                </span>
                <a href="#" className="forgot-link">
                  Lupa Password?
                </a>
              </div>
              <div
                className={`input-wrap${isPasswordError ? " input-error" : ""}`}
              >
                <span
                  className={`input-icon${isPasswordError ? " icon-error" : ""}`}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                    setErrorType(null);
                  }}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errorType === "password" && (
                <p className="field-error-text">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Password salah
                </p>
              )}
            </div>

            {/* Error banner untuk general error */}
            {error && errorType === "general" && (
              <div className="error-banner">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="btn-login" disabled={isLoading}>
              {isLoading ? "Sedang masuk..." : "Masuk"}
            </button>
          </form>

          <p className="footer-text">
            Butuh bantuan?{" "}
            <a href="mailto:support@ojk.go.id">Hubungi Support</a>
          </p>
        </div>
      </div>
    </>
  );
}
