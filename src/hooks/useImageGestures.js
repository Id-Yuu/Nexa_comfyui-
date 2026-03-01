import { useState, useRef } from 'react';
import { PanResponder } from 'react-native';

export const useImageGestures = () => {
  const [imgScale, setImgScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const lastPinchDist = useRef(0);
  const pinchBaseScale = useRef(1);
  const currentScale = useRef(1);
  const panStart = useRef({ x: 0, y: 0 });
  const panBase = useRef({ x: 0, y: 0 });
  const panCurrent = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);

  const pinchResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => currentScale.current > 1,
    onMoveShouldSetPanResponder: (evt) => {
      if (evt.nativeEvent.touches && evt.nativeEvent.touches.length >= 2) return true;
      if (currentScale.current > 1) return true;
      return false;
    },
    onPanResponderGrant: (evt) => {
      if (evt.nativeEvent.touches && evt.nativeEvent.touches.length === 2) {
        isPinching.current = true;
        const [t1, t2] = evt.nativeEvent.touches;
        lastPinchDist.current = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
        pinchBaseScale.current = currentScale.current;
      } else {
        isPinching.current = false;
        panStart.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
        panBase.current = { ...panCurrent.current };
      }
    },
    onPanResponderMove: (evt) => {
      if (evt.nativeEvent.touches && evt.nativeEvent.touches.length === 2) {
        const [t1, t2] = evt.nativeEvent.touches;
        const dist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
        if (!isPinching.current || lastPinchDist.current === 0) {
          isPinching.current = true;
          lastPinchDist.current = dist;
          pinchBaseScale.current = currentScale.current;
        } else {
          const s = Math.min(5, Math.max(0.5, pinchBaseScale.current * (dist / lastPinchDist.current)));
          currentScale.current = s;
          setImgScale(s);
        }
      } else if (currentScale.current > 1 && !isPinching.current) {
        const dx = evt.nativeEvent.pageX - panStart.current.x;
        const dy = evt.nativeEvent.pageY - panStart.current.y;
        const newOffset = { x: panBase.current.x + dx, y: panBase.current.y + dy };
        panCurrent.current = newOffset;
        setPanOffset(newOffset);
      }
    },
    onPanResponderRelease: () => {
      lastPinchDist.current = 0;
      isPinching.current = false;
      if (currentScale.current <= 1) {
        currentScale.current = 1; 
        setImgScale(1);
        panCurrent.current = { x: 0, y: 0 };
        setPanOffset({ x: 0, y: 0 });
        panBase.current = { x: 0, y: 0 };
      }
    }
  })).current;

  return { imgScale, setImgScale, panOffset, setPanOffset, pinchResponder, currentScale, panCurrent, panBase };
};