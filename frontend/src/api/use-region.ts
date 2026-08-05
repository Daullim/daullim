import { getDongs, getSigungus } from "@/api/queries";
import { useApiQuery } from "@/api/use-api-query";

/**
 * 행정동코드 하나에서 상위 명칭과 도농 구분까지 되짚는다.
 *
 * 코드가 접두사 관계를 갖는 덕에(`dongCd[:5] === sigunguCd`, `[:2] === sidoCd`) 화면 사이에
 * 지역 상태를 들고 다닐 필요가 없다 — URL의 `dongCd` 하나면 브레드크럼까지 복원된다.
 */
export function useRegionNames(dongCd?: string) {
  const sidoCd = dongCd?.slice(0, 2);
  const sigunguCd = dongCd?.slice(0, 5);

  const sigungus = useApiQuery(sidoCd ? `sigungus:${sidoCd}` : null, (s) =>
    getSigungus(sidoCd!, s),
  );
  const dongs = useApiQuery(sigunguCd ? `dongs:${sigunguCd}` : null, (s) =>
    getDongs(sigunguCd!, s),
  );

  const sigungu = sigungus.data?.find((r) => r.sigunguCd === sigunguCd);
  const dong = dongs.data?.find((r) => r.dongCd === dongCd);

  return {
    sidoCd,
    sigunguCd,
    sigunguNm: sigungu?.sigunguNm,
    dongNm: dong?.dongNm,
    /** 대표값 기준 — 격자 단계를 건너뛸지(농촌) 정하는 화면 모드 분기 */
    isRural: sigungu?.regionTypeCd === "RURAL",
    regionTypeCd: sigungu?.regionTypeCd,
    /** 브레드크럼에 "관악구 신림동"을 한 덩어리로 쓰기 위한 조합 */
    label: sigungu && dong ? `${sigungu.sigunguNm} ${dong.dongNm}` : undefined,
    loading: sigungus.loading || dongs.loading,
  };
}
