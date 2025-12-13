import { createContext } from "react";

export interface AuthUser {
  email: string;
  fullName: string | null;
  empresaId: string | null;
  roles: string[];
  permissions: string[];
}

export interface AcceptInviteData {
  token: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  acceptInvite: (data: AcceptInviteData) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Permission keys
export const Permissions = {
  // Users
  USUARIOS_VISUALIZAR: "Usuarios.Visualizar",
  USUARIOS_CRIAR: "Usuarios.Criar",
  USUARIOS_EDITAR: "Usuarios.Editar",
  USUARIOS_EXCLUIR: "Usuarios.Excluir",

  // Invites
  USUARIOS_CONVITES_VISUALIZAR: "Usuarios.Convites.Visualizar",
  USUARIOS_CONVITES_CRIAR: "Usuarios.Convites.Criar",
  USUARIOS_CONVITES_REVOGAR: "Usuarios.Convites.Revogar",

  // Products
  PRODUTOS_VISUALIZAR: "Produtos.Visualizar",
  PRODUTOS_CRIAR: "Produtos.Criar",
  PRODUTOS_EDITAR: "Produtos.Editar",
  PRODUTOS_EXCLUIR: "Produtos.Excluir",

  // Todos
  TODOS_VISUALIZAR: "Todos.Visualizar",
  TODOS_CRIAR: "Todos.Criar",
  TODOS_EDITAR: "Todos.Editar",
  TODOS_EXCLUIR: "Todos.Excluir",

  // Notifications
  NOTIFICACOES_VISUALIZAR: "Notificacoes.Visualizar",
  NOTIFICACOES_CRIAR: "Notificacoes.Criar",
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];
