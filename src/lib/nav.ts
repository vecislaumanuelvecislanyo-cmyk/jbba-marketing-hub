import {
  LayoutDashboard, UserCheck, Users, Target, Building2, MapPin, BellRing, Megaphone, Trophy,
  FileText, FileSignature, CalendarDays, BarChart3, Bell, ShieldCheck, Settings, Activity, ClipboardList,
} from "lucide-react";
import type { Access } from "./rbac";

export const NAV: { title: string; url: string; icon: typeof LayoutDashboard; access: Access; group: string }[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, access: "all", group: "Visão geral" },
  { title: "Minha Atividade", url: "/minha-atividade", icon: UserCheck, access: "all", group: "Visão geral" },
  { title: "Equipa", url: "/equipa", icon: Users, access: "all", group: "Visão geral" },
  { title: "Leads", url: "/leads", icon: Target, access: "all", group: "Comercial" },
  { title: "Clientes", url: "/clientes", icon: Building2, access: "all", group: "Comercial" },
  { title: "Visitas", url: "/visitas", icon: MapPin, access: "all", group: "Comercial" },
  { title: "Follow-ups", url: "/followups", icon: BellRing, access: "all", group: "Comercial" },
  { title: "Atividades", url: "/atividades", icon: Activity, access: "all", group: "Comercial" },
  { title: "Relatórios de Campo", url: "/relatorios-campo", icon: ClipboardList, access: "all", group: "Comercial" },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone, access: "all", group: "Marketing" },
  { title: "Metas", url: "/metas", icon: Trophy, access: "all", group: "Marketing" },
  { title: "Propostas", url: "/propostas", icon: FileText, access: "all", group: "Marketing" },
  { title: "Contratos", url: "/contratos", icon: FileSignature, access: "all", group: "Marketing" },
  { title: "Calendário", url: "/calendario", icon: CalendarDays, access: "all", group: "Gestão" },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, access: "all", group: "Gestão" },
  { title: "Notificações", url: "/notificacoes", icon: Bell, access: "all", group: "Gestão" },
  { title: "Auditoria", url: "/auditoria", icon: ShieldCheck, access: "audit", group: "Sistema" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, access: "admin", group: "Sistema" },
];
