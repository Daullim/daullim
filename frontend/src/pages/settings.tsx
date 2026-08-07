import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/core/button";
import { ErrorInline, RowSkeleton } from "@/components/core/system-states";
import { ChoiceGroup } from "@/components/inspection/form-controls";
import { MAP_TYPE, type MapType } from "@/config/domain";
import { loadMapType, saveMapType } from "@/lib/prefs";
import { useFieldExit } from "@/lib/use-field-exit";
import { displayName } from "@/lib/user";
import { ApiError } from "@/api/client";
import { getCurrentUser, withdraw } from "@/api/queries";
import { clearToken } from "@/api/token";
import { useApiQuery, type QueryResult } from "@/api/use-api-query";
import type { CurrentUser } from "@/api/types";

/** 설정 카드 — 제목 + 내용 */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-hairline bg-surface p-6">
      <h2 className="mb-4 text-title text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** 계정 정보 한 줄 — 읽기 전용. 값이 없으면 행 자체를 그리지 않는다(빈 칸을 남기지 않는다). */
function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-hairline last:border-b-0">
      <span className="text-body-sm text-subtle">{label}</span>
      <span className="text-body-md text-ink">{value}</span>
    </div>
  );
}

/** 계정 카드 본문 — 조회 중·실패도 카드 안에서 처리해 레이아웃이 흔들리지 않는다 */
function AccountRows({ query }: { query: QueryResult<CurrentUser> }) {
  if (query.error) {
    return <ErrorInline onRetry={query.reload} />;
  }
  if (!query.data) {
    return <RowSkeleton rows={2} />;
  }
  return (
    <>
      <Row label="이름" value={displayName(query.data)} />
      <Row label="소속" value={query.data.orgName} />
      <Row label="아이디" value={query.data.loginId} />
    </>
  );
}

/** 설정 — 계정 조회 · 지도 유형 · 계정 관리. 드로어의 '설정' 메뉴로 진입한다. */
export default function SettingsPage() {
  const navigate = useNavigate();
  const [mapType, setMapType] = useState<MapType>(loadMapType);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string>();
  const me = useApiQuery("auth:me", (s) => getCurrentUser(s));
  const exitToField = useFieldExit();

  /** 서버가 계정을 비활성화한 뒤에만 세션을 끊는다 — 실패하면 화면에 남아 사유를 본다. */
  async function confirmWithdraw() {
    setWithdrawing(true);
    setWithdrawError(undefined);
    try {
      await withdraw();
      clearToken();
      navigate("/login", { replace: true });
    } catch (e) {
      setWithdrawError(
        e instanceof ApiError ? e.message : "탈퇴하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="control" onExit={exitToField} />

      <main className="min-h-0 flex-1 overflow-y-auto p-6">
        {/* max-w-2xl 금지 — tokens.css의 --spacing-2xl(32px)이 Tailwind 컨테이너 스케일을 가려서
            32px로 찌그러진다. 숫자 스케일(N×4px)만 쓴다. */}
        <div className="mx-auto max-w-160 space-y-6">
          <h1 className="text-display text-ink">설정</h1>

          <Card title="계정">
            <AccountRows query={me} />
          </Card>

          <Card title="지도 설정">
            <fieldset>
              <legend className="mb-2 text-body-md text-ink">네이버 지도 유형</legend>
              <ChoiceGroup
                options={MAP_TYPE}
                value={mapType}
                onChange={(v) => {
                  setMapType(v);
                  saveMapType(v);
                }}
                columns={3}
                ariaPrefix="지도 유형"
              />
            </fieldset>
          </Card>

          <Card title="계정 관리">
            <div className="flex flex-wrap gap-3">
              {/* 토큰을 지우지 않으면 /control로 직접 들어갈 때 세션이 그대로 살아 있다 */}
              <Button
                variant="secondary"
                size="field-lg"
                onClick={() => {
                  clearToken();
                  navigate("/login", { replace: true });
                }}
              >
                로그아웃
              </Button>
              {/* 비가역 행동 — 원탭 금지, 확인 다이얼로그를 거친다 */}
              <Button variant="danger" size="field-lg" onClick={() => setWithdrawOpen(true)}>
                회원탈퇴
              </Button>
            </div>
          </Card>
        </div>
      </main>

      <Dialog
        open={withdrawOpen}
        onOpenChange={(o) => {
          if (withdrawing) return;
          setWithdrawOpen(o);
          if (!o) setWithdrawError(undefined);
        }}
      >
        {/* 기본 X 버튼은 끈다 — sr-only 라벨이 영문("Close")이고 아래 '취소'와 중복된다 */}
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-title text-ink">회원탈퇴</DialogTitle>
            <DialogDescription className="text-body-md text-body">
              탈퇴하면 계정과 점검 이력 접근 권한이 사라지며 되돌릴 수 없습니다. 계속하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          {withdrawError && (
            <p role="alert" className="px-6 text-body-sm text-risk-danger">
              {withdrawError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={withdrawing}
              onClick={() => setWithdrawOpen(false)}
            >
              취소
            </Button>
            <Button variant="danger" disabled={withdrawing} onClick={confirmWithdraw}>
              {withdrawing ? "처리 중..." : "탈퇴하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
