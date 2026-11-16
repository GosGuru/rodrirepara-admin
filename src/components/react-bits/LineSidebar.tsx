// Adapted from React Bits LineSidebar-TS-CSS; see LICENSE.md and project README.
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import './LineSidebar.css';

type Item = { label: string; icon: ReactNode; group?: string };
type Props = { items: Item[]; active: string; onItemClick: (label: string) => void };

// Upstream's smooth falloff and frame-rate independent exponential smoothing,
// adapted to run only during fine-pointer interaction and never on selection.
export default function LineSidebar({ items, active, onItemClick }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const targetsRef = useRef<number[]>([]);
  const currentRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const allowedRef = useRef(false);

  const clear = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    targetsRef.current = [];
    currentRef.current = [];
    itemRefs.current.forEach(el => el?.style.removeProperty('--effect'));
  }, []);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => {
      allowedRef.current = !motion.matches && pointer.matches;
      if (!allowedRef.current) clear();
    };
    update();
    motion.addEventListener('change', update);
    pointer.addEventListener('change', update);
    return () => { motion.removeEventListener('change', update); pointer.removeEventListener('change', update); clear(); };
  }, [clear]);

  const runFrame = useCallback((now: number) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05);
    lastRef.current = now;
    const k = 1 - Math.exp(-dt / 0.1);
    let moving = false;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const target = targetsRef.current[i] || 0;
      const cur = currentRef.current[i] || 0;
      const next = cur + (target - cur) * k;
      const settled = Math.abs(target - next) < 0.0015;
      const value = settled ? target : next;
      currentRef.current[i] = value;
      el.style.setProperty('--effect', value.toFixed(4));
      if (!settled) moving = true;
    });
    rafRef.current = moving ? requestAnimationFrame(runFrame) : null;
  }, []);
  const startLoop = useCallback(() => {
    if (!allowedRef.current) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);
  const move = (e: React.PointerEvent<HTMLUListElement>) => {
    if (!allowedRef.current || e.pointerType !== 'mouse' || !listRef.current) return;
    const rect = listRef.current.getBoundingClientRect();
    const pointerY = e.clientY - rect.top;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const distance = Math.abs(pointerY - (el.offsetTop + el.offsetHeight / 2));
      const p = Math.max(0, 1 - distance / 100);
      targetsRef.current[i] = p * p * (3 - 2 * p);
    });
    startLoop();
  };
  const leave = () => {
    if (!allowedRef.current) return;
    targetsRef.current = targetsRef.current.map(() => 0);
    startLoop();
  };
  return <nav className="line-sidebar" aria-label="Navegación principal">
    <ul ref={listRef} className="line-sidebar__list" onPointerMove={move} onPointerLeave={leave}>
      {items.map((item, index) => <li key={item.label} ref={el => { itemRefs.current[index] = el; }} className="line-sidebar__item">
        {item.group && <div className="line-sidebar__group">{item.group}</div>}
        <button type="button" className="line-sidebar__button" aria-current={active === item.label ? 'page' : undefined} onClick={() => onItemClick(item.label)}>
          <span className="line-sidebar__label">{item.icon}<span className="line-sidebar__text">{item.label}</span></span>
        </button>
      </li>)}
    </ul>
  </nav>;
}
