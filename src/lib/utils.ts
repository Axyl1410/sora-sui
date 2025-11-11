import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const assertValue = <T>(
  value: T | undefined,
  errorMessage: string
): T => {
  if (value === undefined) {
    throw new Error(errorMessage);
  }

  return value;
};
