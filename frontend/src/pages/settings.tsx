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
import { ChoiceGroup, InfoNote } from "@/components/inspection/form-controls";
import { MAP_TYPE, type MapType } from "@/config/domain";
import { loadMapType, saveMapType } from "@/lib/prefs";
import { clearToken } from "@/api/token";
import { INSPECTOR } from "@/mock/sample";

/** 설정 카드 — 제목 + 내용 */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-hairline bg-surface p-6">
      <h2 className="mb-4 text-title text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** 계정 정보 한 줄 — 읽기 전용 */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-hairline last:border-b-0">
      <span className="text-body-sm text-subtle">{label}</span>
      <span className="text-body-md text-ink">{value}</span>
    </div>
  );
}

/** 설정 — 계정 조회 · 지도 유형 · 계정 관리. 드로어의 '설정' 메뉴로 진입한다. */
export default function SettingsPage() {
  const navigate = useNavigate();
  const [mapType, setMapType] = useState<MapType>(loadMapType);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar mode="control" />

      <main className="min-h-0 flex-1 overflow-y-auto p-6">
        {/* max-w-2xl 금지 — tokens.css의 --spacing-2xl(32px)이 Tailwind 컨테이너 스케일을 가려서
            32px로 찌그러진다. 숫자 스케일(N×4px)만 쓴다. */}
        <div className="mx-auto max-w-160 space-y-6">
          <h1 className="text-display text-ink">설정</h1>

          <Card title="계정">
            <Row label="이름" value={`${INSPECTOR.name} ${INSPECTOR.title}`} />
            <Row label="소속" value={INSPECTOR.org} />
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
            <InfoNote className="mt-4">
              선택은 저장되지만 지도에는 아직 반영되지 않습니다 — 네이버 지도 연동 후 적용됩니다.
            </InfoNote>
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

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        {/* 기본 X 버튼은 끈다 — sr-only 라벨이 영문("Close")이고 아래 '취소'와 중복된다 */}
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-title text-ink">회원탈퇴</DialogTitle>
            <DialogDescription className="text-body-md text-body">
              탈퇴하면 계정과 점검 이력 접근 권한이 사라지며 되돌릴 수 없습니다. 계속하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setWithdrawOpen(false)}>
              취소
            </Button>
            {/* 서버 탈퇴(DELETE /auth/me)는 미구현이라 지금은 이 기기의 세션만 끊는다 */}
            <Button
              variant="danger"
              onClick={() => {
                clearToken();
                navigate("/login", { replace: true });
              }}
            >
              탈퇴하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
