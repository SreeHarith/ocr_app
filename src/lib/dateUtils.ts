import { format, isValid, parseISO, parse } from 'date-fns';

/**
 * Normalizes a date string from various formats into 'yyyy-MM-dd'.
 * It now explicitly handles formats like dd-MM-yyyy and dd/MM/yyyy.
 * @param dateInput The date string to normalize.
 * @returns A string in 'yyyy-MM-dd' format, or null if the input is invalid or empty.
 */
export function normalizeDateString(dateInput: string | null | undefined): string | null {
  if (!dateInput || typeof dateInput !== 'string' || dateInput.trim() === '') {
    return null;
  }

  const trimmedInput = dateInput.trim();
  
  // List of common formats to try parsing, with the most likely ones first.
  const formatsToTry = [
    'dd-MM-yyyy',
    'dd/MM/yyyy',
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'M-d-yyyy',
    'M/d/yyyy',
  ];

  for (const fmt of formatsToTry) {
    const parsedDate = parse(trimmedInput, fmt, new Date());
    if (isValid(parsedDate)) {
      return format(parsedDate, 'yyyy-MM-dd');
    }
  }

  // Fallback for other formats like ISO strings ("2025-09-18T...")
  // or text dates ("September 18, 2025") that the native constructor can handle.
  const fallbackDate = new Date(trimmedInput);
  if (isValid(fallbackDate)) {
    // Heuristic check to avoid misinterpretations like '10-12-23' becoming year 23.
    if (fallbackDate.getFullYear() < 1900) return null;
    return format(fallbackDate, 'yyyy-MM-dd');
  }

  return null; // Return null if all parsing attempts fail
}