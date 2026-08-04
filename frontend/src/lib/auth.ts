export interface CurrentUser {
  id: number;
  loginId: string;
  name: string;
  phone: string;
  birthOn: string;
  rankName: string | null;
  titleName: string | null;
  orgName: string | null;
  roleCode: string;
}

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) throw new Error("UNAUTHORIZED");

  const response = await fetch("http://localhost:8080/api/v1/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    localStorage.removeItem("accessToken");
    throw new Error("UNAUTHORIZED");
  }

  const result = (await response.json()) as ApiResponse<CurrentUser>;
  if (!response.ok) throw new Error(result.message ?? "내 정보를 불러오지 못했습니다.");
  return result.data;
}
