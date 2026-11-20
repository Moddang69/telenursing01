import { useState, useCallback, useEffect } from 'react';

const KEY = 'telenursing_video_layout';
export const SELF_SIZES = ['s', 'm', 'l']; // เล็ก / กลาง / ใหญ่ (ใช้ในโหมดคู่สนทนาใหญ่)

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      layout: v.layout === 'split' ? 'split' : 'pip',
      size: SELF_SIZES.includes(v.size) ? v.size : 'm',
    };
  } catch (_) {
    return { layout: 'pip', size: 'm' };
  }
}

/**
 * useVideoLayout — รูปแบบหน้าจอวิดีโอคอล (จำค่าที่เลือกไว้ในเครื่อง)
 *  - 'pip'   : คู่สนทนาเต็มจอ + วิดีโอตัวเองเล็กลอยมุมขวาล่าง (ปรับขนาด s/m/l ได้)
 *  - 'split' : หน้าจอคู่ ขนาดเท่ากัน บน-ล่าง
 */
export function useVideoLayout() {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) {
      /* ignore */
    }
  }, [state]);

  const setLayout = useCallback((layout) => setState((s) => ({ ...s, layout })), []);
  const growSelf = useCallback(
    () => setState((s) => ({ ...s, size: SELF_SIZES[Math.min(SELF_SIZES.length - 1, SELF_SIZES.indexOf(s.size) + 1)] })),
    []
  );
  const shrinkSelf = useCallback(
    () => setState((s) => ({ ...s, size: SELF_SIZES[Math.max(0, SELF_SIZES.indexOf(s.size) - 1)] })),
    []
  );

  return {
    layout: state.layout,
    size: state.size,
    setLayout,
    growSelf,
    shrinkSelf,
    canGrow: state.size !== SELF_SIZES[SELF_SIZES.length - 1],
    canShrink: state.size !== SELF_SIZES[0],
  };
}

export default useVideoLayout;
