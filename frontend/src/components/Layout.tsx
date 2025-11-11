import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Home,
  Baby,
  UserPlus,
  Apple,
  LogOut,
  ChevronLeft,
  Users,
  Building2,
  Building,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

type UnidadeOption = {
  id: string;
  nome: string;
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unidades, setUnidades] = useState<UnidadeOption[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, logout, activeTenantId, setActiveTenantId } = useAuth();
  const roles = auth?.roles ?? [];

  useEffect(() => {
    const fetchUnidades = async () => {
      if (!auth?.token) {
        setUnidades([]);
        return;
      }

      try {
        const res = await api.get("/unidades");
        setUnidades(
          res.data.map((u: any) => ({
            id: u.id,
            nome: u.nome,
          }))
        );
      } catch (error) {
        console.error("Erro ao carregar unidades", error);
      }
    };

    fetchUnidades();
  }, [auth?.token]);

  useEffect(() => {
    if (!activeTenantId && unidades.length > 0) {
      setActiveTenantId(unidades[0].id);
    }
  }, [activeTenantId, unidades, setActiveTenantId]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItems = useMemo(() => {
    const items = [
      { path: "/dashboard", label: "Dashboard", icon: Home },
      { path: "/criancas", label: "Crianças", icon: Baby },
      { path: "/pacientes", label: "Prontuários", icon: Users },
      { path: "/profissionais", label: "Profissionais", icon: UserPlus },
      { path: "/alimentos", label: "Alimentos", icon: Apple },
    ];

    if (roles.includes("AdminGrupo") || roles.includes("SuperAdmin")) {
      items.push({ path: "/unidades", label: "Unidades", icon: Building2 });
    }

    if (roles.includes("SuperAdmin")) {
      items.push({ path: "/grupos-saude", label: "Grupos", icon: Building });
    }

    return items;
  }, [roles]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-green-700">
              Crescer Saudável
            </h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-green-50 text-green-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold text-gray-800">
            {menuItems.find((item) => item.path === location.pathname)?.label ||
              "Dashboard"}
          </h2>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">
                {auth?.nome ?? "Usuário"}
              </p>
              <p className="text-xs text-gray-500">{auth?.email ?? "-"}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
              {(auth?.nome || "U").charAt(0)}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {unidades.length > 0 && (
          <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center gap-3 text-sm">
            <span className="text-slate-600">Unidade ativa:</span>
            <select
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
              value={activeTenantId || unidades[0]?.id}
              onChange={(e) => setActiveTenantId(e.target.value)}
            >
              {unidades.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
