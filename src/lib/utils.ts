import { PositionData } from "@/pages/Dashboard";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getStoredPositions = (): PositionData[] => {
  try {
    const raw = localStorage.getItem("userPositions");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const storePositions = (positions: PositionData[]) => {
  localStorage.setItem("userPositions", JSON.stringify(positions));
};