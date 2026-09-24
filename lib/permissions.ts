export function checkUserPermission(userPermissionsJson: string, moduleKey: string): boolean {
  try {
    const perms = JSON.parse(userPermissionsJson || '{}');
    // Si el permiso no está definido explícitamente, por defecto podemos asumirlo falso o verdadero según prefieras
    return !!perms[moduleKey];
  } catch (e) {
    return false;
  }
}
