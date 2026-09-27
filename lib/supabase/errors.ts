export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다";
  }
  if (lower.includes("user already registered")) {
    return "이미 가입된 이메일입니다";
  }
  if (lower.includes("password should be at least")) {
    return "비밀번호는 6자 이상이어야 합니다";
  }
  if (lower.includes("unable to validate email")) {
    return "올바른 이메일 주소를 입력해주세요";
  }
  if (lower.includes("email not confirmed")) {
    return "이메일 인증이 필요합니다. 메일함을 확인해주세요";
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("err_name_not_resolved")
  ) {
    return "서버에 연결할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요";
  }
  return message;
}
