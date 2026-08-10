/** 선택된 행이 리스트 안에서 보이도록 스크롤 — 지도에서 고른 대상이 목록 밖에 있으면 강조가 안 보인다. */
const SCROLL_TOP_PADDING = 16;

export function scrollRowIntoList(list: HTMLElement | null, rowId: string) {
  requestAnimationFrame(() => {
    const row = document.getElementById(rowId);
    if (!list || !row) return;
    const listTop = list.getBoundingClientRect().top;
    const rowTop = row.getBoundingClientRect().top;
    list.scrollTo({
      top: list.scrollTop + rowTop - listTop - SCROLL_TOP_PADDING,
      behavior: "smooth",
    });
  });
}
