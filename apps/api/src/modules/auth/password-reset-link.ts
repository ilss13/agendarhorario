export const buildPasswordResetUrl = (firebaseLink: string, webOrigin: string): string => {
  let oobCode: string | null = null;
  try {
    oobCode = new URL(firebaseLink).searchParams.get('oobCode');
  } catch {
    oobCode = null;
  }
  if (!oobCode) {
    throw new Error('Link de redefinição sem código');
  }
  const url = new URL('/redefinir-senha', webOrigin);
  url.searchParams.set('oobCode', oobCode);
  return url.toString();
};
