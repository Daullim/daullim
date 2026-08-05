import { useEffect, useRef, useState, type ReactNode } from "react";
import { ErrorInline } from "@/components/core/system-states";
import {
  DEFAULT_CENTER,
  authFailureMessage,
  loadNaverMaps,
  onAuthFailure,
  toMapTypeId,
} from "@/lib/naver-maps";
import { loadMapType } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export interface MapCenter {
  lat: number;
  lng: number;
}

/**
 * 지도 캔버스 — 네 화면(`/control`·B1·B2·B3)이 공유하는 유일한 지도 컨테이너.
 *
 * 크기는 **레이아웃이 정한다**(CLS 0, DESIGN.md). 다만 SDK가 초기화 시점의 컨테이너 크기로
 * 지도 크기를 고정하므로, 사이드 패널 드래그·접기·창 리사이즈를 `ResizeObserver`로 받아
 * `setSize()`로 따라가야 한다 — 없으면 패널을 끌 때마다 지도가 잘리거나 회색 여백이 생긴다.
 *
 * 오버레이(범례·줌·현재 위치·세대 패널)는 `children`으로 받아 지도 **바깥** 래퍼에 얹는다.
 * 지도 div 안에 넣으면 SDK가 제 마음대로 다루고, 둥근 모서리 클리핑에 잘린다.
 */
export function MapCanvas({
  ariaLabel,
  center,
  zoom = 15,
  onMapReady,
  children,
  className,
}: {
  /** 화면 낭독용 — 지도는 시각 정보라 어느 지역인지 텍스트로 알려야 한다 */
  ariaLabel: string;
  /** 데이터가 있는 화면은 실제 좌표를, 없으면 시연 유니버스 중심으로 첫 프레임을 잡는다 */
  center?: MapCenter;
  zoom?: number;
  /**
   * 레이어를 얹을 화면에 지도 인스턴스를 넘긴다. 지도가 사라질 때 `null`로 다시 부른다 —
   * 받은 쪽이 정리 시점을 알 수 있어야 죽은 지도에 레이어를 그리지 않는다.
   */
  onMapReady?: (map: naver.maps.Map | null) => void;
  children?: ReactNode;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  /**
   * 화면에는 일반 문구만 띄운다(DESIGN.md — 기술 용어 노출 금지). 점검원은 키 설정이나 도메인 등록으로
   * 조치할 수 없다. 조치할 수 있는 사람(개발자)에게는 콘솔로 정확한 사유를 남긴다.
   */
  const fail = (reason: string) => {
    console.error(`[지도] ${reason}`);
    setFailed(true);
  };

  /* 콜백이 매 렌더 새로 만들어져도 지도를 다시 만들지 않도록 ref로 받는다 */
  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;

  /* SDK 로드 + 지도 생성 — 마운트당 한 번. center 변경은 아래에서 따로 반영한다 */
  useEffect(() => {
    let cancelled = false;

    loadNaverMaps().then(
      () => {
        if (cancelled || !containerRef.current) return;
        const start = center ?? DEFAULT_CENTER;
        mapRef.current = new naver.maps.Map(containerRef.current, {
          center: new naver.maps.LatLng(start.lat, start.lng),
          zoom,
          mapTypeId: toMapTypeId(loadMapType()),
          // 기본 UI는 전부 끈다 — 줌·현재 위치는 우리 플로팅 컨트롤이 맡는다(DESIGN.md)
          zoomControl: false,
          logoControl: false,
          mapDataControl: false,
          scaleControl: false,
        });
        setFailed(false);
        setReady(true);
        onMapReadyRef.current?.(mapRef.current);
      },
      (e: unknown) => {
        if (!cancelled) fail(e instanceof Error ? e.message : "지도를 불러오지 못했습니다.");
      },
    );

    return () => {
      cancelled = true;
      // 레이어를 얹은 화면이 먼저 정리하도록 파괴 전에 알린다
      onMapReadyRef.current?.(null);
      mapRef.current?.destroy();
      mapRef.current = null;
      setReady(false);
    };
    // center·zoom은 초기값으로만 쓴다 — 매번 지도를 새로 만들면 사용자의 이동·확대가 날아간다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  /* 화면이 새 좌표를 주면 시점만 옮긴다.
     좌표를 숫자로 풀어 의존성에 넣는다 — 객체를 그대로 두면 부모가 매 렌더 새로 만들어
     사용자가 지도를 끌 때마다 시점이 되돌아간다. */
  const lat = center?.lat;
  const lng = center?.lng;
  useEffect(() => {
    if (!ready || lat === undefined || lng === undefined) return;
    mapRef.current?.setCenter(new naver.maps.LatLng(lat, lng));
  }, [ready, lat, lng]);

  /* 인증 실패는 로드 성공 뒤에 따로 온다 — 구독하지 않으면 빈 지도만 남는다 */
  useEffect(() => onAuthFailure(() => fail(authFailureMessage())), []);

  /* 래퍼 크기 추적 — 패널 드래그·접기·창 리사이즈를 지도에 전달한다.
     초기 관찰에서도 한 번 발화하므로, 초기화 시점 크기가 어긋났어도 여기서 바로잡힌다. */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !ready) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        mapRef.current?.setSize(new naver.maps.Size(width, height));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready]);

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative min-h-0 flex-1 rounded-md border border-hairline bg-surface",
        className,
      )}
    >
      {/*
        지도 본체. `absolute inset-0`을 쓰지 않는다
      */}
      <div
        ref={containerRef}
        aria-label={ariaLabel}
        className="size-full overflow-hidden rounded-md"
      />

      {failed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface p-4">
          <ErrorInline onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      )}
      {!ready && !failed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface">
          <span className="text-body-sm text-subtle">지도를 불러오는 중…</span>
        </div>
      )}

      {children}
    </div>
  );
}
