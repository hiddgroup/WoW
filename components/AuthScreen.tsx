"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";

const SAVED_ID_KEY = "hidd-wow-saved-id";

function readSavedId(): string {
  try {
    return localStorage.getItem(SAVED_ID_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function writeSavedId(email: string) {
  try {
    const value = email.trim();
    if (value) localStorage.setItem(SAVED_ID_KEY, value);
    else localStorage.removeItem(SAVED_ID_KEY);
  } catch {
    /* ignore */
  }
}

interface AuthScreenProps {
  authView: "login" | "signup";
  authForm: { name: string; email: string; password: string; error: string };
  authLoading?: boolean;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onLogin: () => void;
  onSignup: () => void;
  onGoLogin: () => void;
  onGoSignup: () => void;
}

export function AuthScreen({
  authView,
  authForm,
  authLoading = false,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onLogin,
  onSignup,
  onGoLogin,
  onGoSignup,
}: AuthScreenProps) {
  const [rememberId, setRememberId] = useState(false);
  const inputClass =
    "w-full border border-hub-border rounded-[10px] px-3.5 py-2.5 text-sm outline-none bg-white";
  const isSuccessNotice =
    authForm.error.includes("완료되었습니다") || authForm.error.includes("인증 후");

  useEffect(() => {
    if (readSavedId()) setRememberId(true);
  }, []);

  useEffect(() => {
    if (authView !== "login" || !rememberId) return;
    const saved = readSavedId();
    if (saved && saved !== authForm.email) onEmailChange(saved);
  }, [authView, rememberId, authForm.email, onEmailChange]);

  const handleEmailChange = (value: string) => {
    onEmailChange(value);
    if (rememberId) writeSavedId(value);
  };

  const handleRememberChange = (checked: boolean) => {
    setRememberId(checked);
    if (checked) writeSavedId(authForm.email);
    else writeSavedId("");
  };

  const handleLogin = () => {
    if (rememberId) writeSavedId(authForm.email);
    else writeSavedId("");
    onLogin();
  };

  return (
    <div className="min-h-screen bg-hub-bg flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-[20px] p-6 sm:p-10 w-full max-w-[400px] shadow-[0_8px_40px_rgba(26,46,30,0.12)]">
        <div className="flex flex-col items-center mb-8">
          <BrandLogo variant="auth" className="mb-4" />
          <div className="text-[21px] font-bold text-hub-text tracking-tight">
            HiDD WoW
          </div>
          <div className="text-[13px] text-hub-muted mt-1">소규모 팀 협업 대시보드</div>
        </div>

        {authView === "login" ? (
          <div>
            <div className="text-[17px] font-bold text-hub-text mb-4">로그인</div>
            <div className="flex flex-col gap-3 mb-3.5">
              <div>
                <label className="text-xs font-semibold text-hub-secondary block mb-1.5">
                  이메일
                </label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="이메일 주소 입력"
                  autoComplete="username"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-hub-secondary block mb-1.5">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="비밀번호 입력"
                  autoComplete="current-password"
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-[13px] text-hub-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberId}
                  onChange={(e) => handleRememberChange(e.target.checked)}
                  className="h-4 w-4 accent-[#1a2e1e]"
                />
                아이디 저장
              </label>
            </div>
            {authForm.error && (
              <div
                className={`text-[13px] rounded-lg px-3 py-2 mb-3.5 ${
                  isSuccessNotice
                    ? "text-green-800 bg-green-100"
                    : "text-red-700 bg-red-100"
                }`}
              >
                {authForm.error}
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={authLoading}
              className="w-full bg-hub-primary text-hub-primary-foreground rounded-[10px] py-3.5 text-[15px] font-semibold disabled:opacity-60"
            >
              {authLoading ? "처리 중..." : "로그인"}
            </button>
            <div className="text-center mt-4 text-[13px] text-hub-muted">
              계정이 없으신가요?
              <button
                onClick={onGoSignup}
                className="text-hub-primary font-semibold text-[13px] ml-1"
              >
                가입 신청 →
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[17px] font-bold text-hub-text mb-4">가입 신청</div>
            <div className="flex flex-col gap-3 mb-3.5">
              <div>
                <label className="text-xs font-semibold text-hub-secondary block mb-1.5">
                  이름
                </label>
                <input
                  value={authForm.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="이름 입력"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-hub-secondary block mb-1.5">
                  이메일
                </label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => onEmailChange(e.target.value)}
                  placeholder="이메일 주소 입력"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-hub-secondary block mb-1.5">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  placeholder="비밀번호 (6자 이상)"
                  className={inputClass}
                />
              </div>
            </div>
            {authForm.error && (
              <div
                className={`text-[13px] rounded-lg px-3 py-2 mb-3.5 ${
                  isSuccessNotice
                    ? "text-green-800 bg-green-100"
                    : "text-red-700 bg-red-100"
                }`}
              >
                {authForm.error}
              </div>
            )}
            <button
              onClick={onSignup}
              disabled={authLoading}
              className="w-full bg-hub-primary text-hub-primary-foreground rounded-[10px] py-3.5 text-[15px] font-semibold disabled:opacity-60"
            >
              {authLoading ? "처리 중..." : "가입 신청"}
            </button>
            <div className="text-center mt-4 text-[13px] text-hub-muted">
              이미 계정이 있으신가요?
              <button
                onClick={onGoLogin}
                className="text-hub-primary font-semibold text-[13px] ml-1"
              >
                로그인 →
              </button>
            </div>
            <div className="mt-4 bg-hub-bg rounded-lg px-3.5 py-3 text-xs text-hub-secondary leading-relaxed text-center">
              💡 첫 번째 가입자는 자동으로 관리자가 됩니다
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PendingScreen({
  userName,
  onLogout,
}: {
  userName: string;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-hub-bg flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-[20px] py-10 sm:py-[52px] px-6 sm:px-10 w-full max-w-[440px] text-center shadow-[0_8px_40px_rgba(26,46,30,0.12)]">
        <div className="w-[68px] h-[68px] bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <circle cx="15" cy="15" r="12.5" stroke="#E8A838" strokeWidth="2" />
            <path
              d="M15 7v8l4.5 4.5"
              stroke="#E8A838"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h2 className="text-[21px] font-bold text-hub-text mb-2.5">승인 대기 중</h2>
        <p className="text-sm text-hub-secondary font-medium mb-1.5">
          {userName}님, 가입 신청이 완료되었습니다.
        </p>
        <p className="text-[13px] text-hub-muted leading-relaxed mb-8">
          관리자가 검토 후 승인하면
          <br />
          대시보드에 접속할 수 있습니다.
        </p>
        <button
          onClick={onLogout}
          className="bg-hub-surface text-hub-primary rounded-[10px] px-7 py-2.5 text-sm font-semibold"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
