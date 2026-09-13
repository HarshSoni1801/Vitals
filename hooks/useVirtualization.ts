"use client";

import { useMemo, useState, useCallback, UIEvent } from "react";

export interface UseVirtualizationOptions {
  itemCount: number;
  itemHeight: number;
  viewportHeight: number;
  overscan?: number;
}

export function useVirtualization({ itemCount, itemHeight, viewportHeight, overscan = 6 }: UseVirtualizationOptions) {
  const [scrollTop, setScrollTop] = useState(0);

  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(itemCount, start + visibleCount);
    return {
      startIndex: start,
      endIndex: end,
      totalHeight: itemCount * itemHeight,
      offsetY: start * itemHeight,
    };
  }, [scrollTop, itemCount, itemHeight, viewportHeight, overscan]);

  const onScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return { startIndex, endIndex, totalHeight, offsetY, onScroll };
}
