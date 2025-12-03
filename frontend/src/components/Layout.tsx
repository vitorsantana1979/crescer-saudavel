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
  BarChart3,
  Sparkles,
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
      { path: "/alimentos/analytics", label: "Analytics Alimentos", icon: BarChart3 },
      { path: "/chat-ia", label: "Chat IA Clínico", icon: Sparkles },
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
          sidebarOpen ? "w-auto min-w-[200px]" : "w-20"
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className={`h-16 border-b border-gray-200 ${
          sidebarOpen ? "flex items-center justify-between px-4" : "flex items-center justify-center"
        }`}>
          {sidebarOpen ? (
            <>
              <img 
                src="/logo_crescer_saudavel_completa_800.png" 
                alt="Crescer Saudável" 
                className="h-10 object-contain"
              />
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col items-center justify-center h-full gap-1">
              <img 
                src="/logo_crescer_saudavel_simbolo.png" 
                alt="Crescer Saudável" 
                className="h-10 w-10 object-contain"
              />
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                             (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
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
            {menuItems.find((item) => 
              item.path === location.pathname || 
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path))
            )?.label || "Dashboard"}
          </h2>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-800">
                {auth?.nome ?? "Usuário"}
              </p>
              <p className="text-xs text-gray-500">{auth?.email ?? "-"}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
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
            <span className="text-slate-700 font-medium">Unidade ativa:</span>
            <select
              className="px-3 py-1 border border-slate-400 rounded-lg text-sm bg-white text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20"
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

        {/* Footer com informações de versão */}
        <footer className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>© 2024 Crescer Saudável</span>
              <VersionInfo />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">•</span>
              <a
                href="#"
                className="hover:text-primary transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  window.open('/docs', '_blank');
                }}
              >
                Documentação
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Componente de informações de versão
function VersionInfo() {
  const [buildInfo, setBuildInfo] = useState<{
    version: string;
    gitCommit: string;
    gitBranch: string;
    buildDate: string;
    environment: string;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Importar dinamicamente as informações de build
    import('@/generated/build-info')
      .then((module) => {
        setBuildInfo(module.BUILD_INFO);
      })
      .catch(() => {
        // Se não conseguir importar, usar valores padrão
        setBuildInfo({
          version: '1.1.0',
          gitCommit: 'dev',
          gitBranch: 'dev',
          buildDate: new Date().toISOString(),
          environment: 'development'
        });
      });
  }, []);

  if (!buildInfo) return null;

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="hover:text-primary transition-colors font-mono"
        title="Clique para ver detalhes da versão"
      >
        v{buildInfo.version} ({buildInfo.gitCommit})
      </button>

      {showDetails && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetails(false)}
          />
          
          {/* Card de detalhes */}
          <div className="absolute bottom-full left-0 mb-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[300px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h4 className="font-semibold text-gray-900 text-sm">
                  Informações da Build
                </h4>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Versão:</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {buildInfo.version}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Commit:</span>
                  <span className="font-mono text-gray-900">
                    {buildInfo.gitCommit}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Branch:</span>
                  <span className="font-mono text-gray-900">
                    {buildInfo.gitBranch}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Build:</span>
                  <span className="text-gray-900">
                    {formatDate(buildInfo.buildDate)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Ambiente:</span>
                  <span className={`font-semibold ${
                    buildInfo.environment === 'production' 
                      ? 'text-green-600' 
                      : 'text-yellow-600'
                  }`}>
                    {buildInfo.environment}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `v${buildInfo.version} (${buildInfo.gitCommit})`
                    );
                    alert('Versão copiada para área de transferência!');
                  }}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  📋 Copiar versão
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
