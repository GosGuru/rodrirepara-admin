import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

type FloatingOptions = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  floatingRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  matchWidth?: boolean;
  minWidth?: number;
  maxWidth?: number;
  align?: 'start' | 'end';
  offset?: number;
  estimatedHeight?: number;
  repositionKey?: string | number | boolean;
};

export type FloatingResult = {
  style: CSSProperties;
  placement: 'bottom' | 'top';
  portalTarget: HTMLElement | null;
};

export function useFloatingPopover({
  open,
  anchorRef,
  floatingRef,
  onClose,
  matchWidth = false,
  minWidth = 220,
  maxWidth = 360,
  align = 'start',
  offset = 6,
  estimatedHeight = 280,
  repositionKey,
}: FloatingOptions): FloatingResult {
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    top: -9999,
    left: -9999,
    visibility: 'hidden',
  });
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const floating = floatingRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;

    const measuredWidth = floating?.offsetWidth || 0;
    const measuredHeight = floating
      ? Math.max(floating.offsetHeight, floating.scrollHeight) || estimatedHeight
      : estimatedHeight;

    const targetWidth = matchWidth
      ? Math.max(rect.width, Math.min(minWidth, vw - margin * 2))
      : Math.min(Math.max(measuredWidth, minWidth), Math.min(maxWidth, vw - margin * 2));

    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const shouldFlipTop = spaceBelow < measuredHeight && spaceAbove > spaceBelow;

    let top = shouldFlipTop
      ? Math.max(margin, rect.top - measuredHeight - offset)
      : rect.bottom + offset;

    if (!shouldFlipTop && top + measuredHeight > vh - margin) {
      top = Math.max(margin, vh - margin - measuredHeight);
    }

    let left = align === 'end' ? rect.right - targetWidth : rect.left;
    if (left + targetWidth > vw - margin) {
      left = vw - margin - targetWidth;
    }
    if (left < margin) {
      left = margin;
    }

    const availableMaxHeight = shouldFlipTop
      ? Math.max(160, rect.top - offset - margin)
      : Math.max(160, vh - top - margin);

    const dialogHost = anchor.closest('dialog') as HTMLElement | null;
    let offsetLeft = 0;
    let offsetTop = 0;
    if (dialogHost && typeof window.getComputedStyle === 'function') {
      const hostStyle = window.getComputedStyle(dialogHost);
      const createsContainingBlock =
        (hostStyle.transform && hostStyle.transform !== 'none') ||
        (hostStyle.filter && hostStyle.filter !== 'none') ||
        (hostStyle.perspective && hostStyle.perspective !== 'none');
      if (createsContainingBlock) {
        const hostRect = dialogHost.getBoundingClientRect();
        offsetLeft = hostRect.left;
        offsetTop = hostRect.top;
      }
    }

    setPlacement(shouldFlipTop ? 'top' : 'bottom');
    setStyle({
      position: 'fixed',
      top: Math.round(top - offsetTop),
      left: Math.round(left - offsetLeft),
      width: matchWidth ? Math.round(targetWidth) : undefined,
      minWidth: matchWidth ? undefined : Math.round(Math.min(minWidth, vw - margin * 2)),
      maxWidth: Math.round(vw - margin * 2),
      maxHeight: Math.round(availableMaxHeight),
      visibility: 'visible',
    });
  }, [align, anchorRef, estimatedHeight, floatingRef, matchWidth, maxWidth, minWidth, offset]);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const dialogHost = anchor?.closest('dialog');
    setPortalTarget((dialogHost as HTMLElement | null) ?? document.body);
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(raf);
  }, [open, anchorRef, updatePosition, repositionKey]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (anchorRef.current?.contains(target)) return;
      if (floatingRef.current?.contains(target)) return;
      onClose();
    }

    function handleReposition(event: Event) {
      const target = event.target as Node | null;
      if (target && floatingRef.current?.contains(target)) return;
      updatePosition();
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', handleReposition, true);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && floatingRef.current) {
      observer = new ResizeObserver(() => updatePosition());
      observer.observe(floatingRef.current);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleReposition, true);
      observer?.disconnect();
    };
  }, [open, anchorRef, floatingRef, onClose, updatePosition]);

  return { style, placement, portalTarget };
}
