import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tokens.css의 커스텀 타이포 토큰(--text-*)을 font-size 그룹으로 등록한다.
// 등록하지 않으면 tailwind-merge가 text-btn 등을 색상으로 오인해
// 같은 요소의 text-on-accent(글자색)를 제거해버린다.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display",
        "text-title",
        "text-title-sm",
        "text-body-md",
        "text-body-sm",
        "text-caption",
        "text-data-lg",
        "text-btn",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
