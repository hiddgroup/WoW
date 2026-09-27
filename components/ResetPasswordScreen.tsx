"use client";

import { useState } from "react";
import type { RecoveryParams } from "@/lib/auth/recovery";
import { resetPassword } from "@/lib/supabase/api";
import { BrandLogo } from "./BrandLogo";

export function ResetPasswordScreen({
  recovery,
  onDone,
}: {
  recovery: RecoveryParams;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputClass =
    "w-full border border-hub-border rounded-[10px] px-3.5 py-2.5 text-sm outline-none bg-white";

  const submit = async () => {
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 서로 다릅니다");
      return;
    }
    setLoading(true);
    setError("");
    const result = await resetPassword(recovery, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  };

  return (
    <div className="min-h-screen bg-hub-bg flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-[20px] p-6 sm:p-10 w-full max-w-[400px] shadow-[0_8px_40px_rgba(26,46,30,0.12)]">
        <div className="flex flex-col items-center mb-8">
          <BrandLogo variant="auth" className="mb-4" />
          <div className="text-[21px] font-bold text-hub-text tracking-tight">HiDD WoW</div>
          <div className="text-[13px] text-hub-muted mt-1">비밀번호 재설정</div>
        </div>
        <div className="flex flex-col gap-3 mb-3.5">
          <div>
            <label className="text-xs font-semibold text-hub-secondary block mb-1.5">
              새 비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-hub-secondary block mb-1.5">
              새 비밀번호 확인
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="비밀번호를 다시 입력"
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </div>
        {error && (
          <div className="text-[13px] text-red-700 bg-red-100 rounded-lg px-3 py-2 mb-3.5">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          className="w-full bg-hub-primary text-hub-primary-foreground rounded-[10px] py-3.5 text-[15px] font-semibold disabled:opacity-60"
        >
          {loading ? "변경 중..." : "비밀번호 변경"}
        </button>
      </div>
    </div>
  );
}
