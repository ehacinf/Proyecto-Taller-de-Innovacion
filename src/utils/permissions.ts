import type {
  ActivePage,
  PermissionKey,
  PermissionSet,
  RoleDefinition,
  RoleKey,
} from "../types";

const fullAccessPermissions: PermissionSet = {
  viewInventory: true,
  editInventory: true,
  viewSales: true,
  createSales: true,
  viewFinance: true,
  manageTransactions: true,
  manageUsers: true,
};

const readOnlyFinance: PermissionSet = {
  viewInventory: false,
  editInventory: false,
  viewSales: false,
  createSales: false,
  viewFinance: true,
  manageTransactions: false,
  manageUsers: false,
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: "admin",
    name: "Administrador",
    description: "Acceso total a todas las funciones",
    permissions: fullAccessPermissions,
  },
  {
    key: "vendedor",
    name: "Vendedor",
    description: "Puede vender y ver inventario, sin modificarlo",
    permissions: {
      viewInventory: true,
      editInventory: false,
      viewSales: true,
      createSales: true,
      viewFinance: false,
      manageTransactions: false,
      manageUsers: false,
    },
  },
  {
    key: "contador",
    name: "Contador",
    description: "Acceso a reportes financieros y estadísticas",
    permissions: readOnlyFinance,
  },
  {
    key: "bodeguero",
    name: "Bodeguero",
    description: "Gestiona inventario sin editar ventas ni finanzas",
    permissions: {
      viewInventory: true,
      editInventory: true,
      viewSales: false,
      createSales: false,
      viewFinance: false,
      manageTransactions: false,
      manageUsers: false,
    },
  },
  {
    key: "personalizado",
    name: "Personalizado",
    description: "Configura permisos según tu operación",
    permissions: {
      viewInventory: true,
      editInventory: true,
      viewSales: true,
      createSales: true,
      viewFinance: true,
      manageTransactions: false,
      manageUsers: false,
    },
  },
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  viewInventory: "Ver inventario",
  editInventory: "Crear/editar inventario",
  viewSales: "Ver ventas",
  createSales: "Registrar ventas",
  viewFinance: "Ver finanzas y reportes",
  manageTransactions: "Registrar movimientos y facturas",
  manageUsers: "Asignar roles y permisos",
};

export function getRoleDefinition(role: RoleKey): RoleDefinition {
  return ROLE_DEFINITIONS.find((item) => item.key === role) || ROLE_DEFINITIONS[0];
}

export function mergePermissions(
  role: RoleKey,
  overrides?: Partial<PermissionSet>
): PermissionSet {
  const base = { ...getRoleDefinition(role).permissions };
  return { ...base, ...(overrides || {}) };
}

export function getAllowedPagesFromPermissions(permissions: PermissionSet): Set<ActivePage> {
  const allowed: Set<ActivePage> = new Set([
    "inicio",
    "dashboard",
    "configuracion",
  ]);

  if (permissions.viewInventory || permissions.editInventory) {
    allowed.add("inventario");
  }

  if (permissions.viewFinance) {
    allowed.add("finanzas");
    allowed.add("reportes");
  }

  return allowed;
}
