import React from "react";
import { Check, X } from "lucide-react";
import { validatePassword } from "@/lib/auth/password-policy";

interface PasswordChecklistProps {
  password: string;
}

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  const result = validatePassword(password);
  const items = [
    { label: "More than 8 characters (at least 9)", valid: result.checks.minLength },
    { label: "At least one uppercase letter (A-Z)", valid: result.checks.hasUpper },
    { label: "At least one lowercase letter (a-z)", valid: result.checks.hasLower },
    { label: "At least one special character (!@#$%...)", valid: result.checks.hasSpecial },
  ];

  return (
    <div className="p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs space-y-2 mt-2">
      <div className="font-medium text-zinc-400">Password Requirements:</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 transition-colors ${
              item.valid ? "text-emerald-400" : "text-zinc-500"
            }`}
          >
            {item.valid ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
