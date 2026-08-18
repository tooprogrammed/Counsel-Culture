const KEY = "cc-identity";

export function getIdentity(): string | null {
  return localStorage.getItem(KEY);
}

export function setIdentity(name: string) {
  localStorage.setItem(KEY, name);
}
