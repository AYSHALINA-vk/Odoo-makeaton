export function isAdmin(role?: string): boolean {
  return role === "admin";
}

export function isStaff(role?: string): boolean {
  return role === "admin" || role === "staff";
}

export function isCustomer(role?: string): boolean {
  return role === "customer";
}

export function canCreateStaff(role?: string): boolean {
  return role === "admin";
}

export function canCreateDiscount(role?: string): boolean {
  return role === "admin";
}

export function canManageCatalog(role?: string): boolean {
  return role === "admin";
}
