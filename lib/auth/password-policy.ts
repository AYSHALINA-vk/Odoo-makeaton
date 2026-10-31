export interface PasswordPolicyResult {
  isValid: boolean;
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasSpecial: boolean;
  };
  errors: string[];
}

export function validatePassword(password: string): PasswordPolicyResult {
  const minLength = password.length > 8; // "more than 8 characters" -> length >= 9
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const errors: string[] = [];
  if (!minLength) {
    errors.push("Password must be more than 8 characters long (at least 9 characters)");
  }
  if (!hasUpper) {
    errors.push("Password must contain at least one uppercase letter (A-Z)");
  }
  if (!hasLower) {
    errors.push("Password must contain at least one lowercase letter (a-z)");
  }
  if (!hasSpecial) {
    errors.push("Password must contain at least one special character (!@#$%^&*...)");
  }

  return {
    isValid: minLength && hasUpper && hasLower && hasSpecial,
    checks: {
      minLength,
      hasUpper,
      hasLower,
      hasSpecial,
    },
    errors,
  };
}
