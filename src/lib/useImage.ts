"use client";
import { useEffect, useState } from "react";

export function useImage(url: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) return;
    const i = new Image();
    i.crossOrigin = "anonymous"; // 🔥 clave para exportPng
    i.src = url;
    i.onload = () => setImg(i);
  }, [url]);

  return img;
}
