// Error code mapping for better user messages
const ERROR_MESSAGES: Record<number, string> = {
  0: "Name must be at least 3 characters",
  1: "Name must be less than 50 characters",
  2: "Bio must be less than 200 characters",
  3: "Title must be at least 1 character",
  4: "Title must be less than 100 characters",
  5: "Content must be at least 1 character",
  6: "Content must be less than 10000 characters",
  7: "Profile already exists for this address",
  8: "Unauthorized: You don't have permission to perform this action",
  9: "Profile not found",
  10: "Profile ID mismatch",
  11: "Profile not found in registry",
  12: "Invalid input: Text cannot be only whitespace",
  13: "Post count desynchronized",
  14: "You have already liked this post",
  15: "You have not liked this post",
  16: "You are already following this user",
  17: "You are not following this user",
  18: "You cannot follow yourself",
  19: "Comment must be at least 1 character",
  20: "Comment must be less than 1000 characters",
  21: "Comment not found",
};

// Regex for extracting error codes from Move error messages
const MOVE_ABORT_REGEX = /MoveAbort\(.*?,\s*(\d+)\)/;

function extractErrorCode(message: string): number | null {
  const match = message.match(MOVE_ABORT_REGEX);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  return null;
}

function getErrorMessageFromCode(code: number): string | null {
  return ERROR_MESSAGES[code] || null;
}

function parseErrorFromString(errorMessage: string): string {
  const code = extractErrorCode(errorMessage);
  if (code !== null) {
    const message = getErrorMessageFromCode(code);
    if (message) {
      return message;
    }
  }
  return errorMessage;
}

function parseErrorFromObject(errorObj: {
  message?: string;
  code?: number;
}): string {
  if (typeof errorObj.code === "number") {
    const message = getErrorMessageFromCode(errorObj.code);
    if (message) {
      return message;
    }
  }

  if (errorObj.message) {
    return parseErrorFromString(errorObj.message);
  }

  return "An error occurred";
}

export function parseMoveError(error: unknown): string {
  if (typeof error === "string") {
    return parseErrorFromString(error);
  }

  if (typeof error !== "object" || error === null) {
    return "An unknown error occurred";
  }

  return parseErrorFromObject(error as { message?: string; code?: number });
}
