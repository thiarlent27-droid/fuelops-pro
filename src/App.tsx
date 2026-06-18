import { useState } from "react";
import { Users, Fuel, Package, DollarSign, Shield, Target, Wrench, Headphones, Settings, Droplets, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import GestaoOperacoes from "./pages/GestaoOperacoes";
import ControleEstoque from "./pages/ControleEstoque";
import Financeiro from "./pages/Financeiro";
import GestaoEquipe from "./pages/GestaoEquipe";
import Regulamentacao from "./pages/Regulamentacao";
import EstrategiaVendas from "./pages/EstrategiaVendas";
import Manutencao from "./pages/Manutencao";
import AtendimentoCliente from "./pages/AtendimentoCliente";
import Configuracoes from "./pages/Configuracoes";
import TrocaOleoLubrificacao from "./pages/TrocaOleoLubrificacao";

type Tab = "gestao" | "estoque" | "financeiro" | "equipe" | "regulamentacao" | "estrategia" | "manutencao" | "atendimento" | "configuracoes" | "lubrificacao";

function App() {
  const { session, loading, signIn, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("estoque");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#10131a] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#00a572]" />
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={signIn} />;
  }

  return (
    <div className="min-h-screen bg-[#10131a] text-[#e1e2ec] font-['Inter',sans-serif]">
      {/* Top Bar */}
      <header className="bg-[#10131a] border-b border-[#262a31] sticky top-0 z-50">
        {/* Linha 1: logo + info + logout */}
        <div className="flex items-center justify-between px-4 h-[42px]">
          <div className="flex items-center gap-1 shrink-0">
            <span className="font-extrabold text-[14px] text-white tracking-[-0.4px]">FuelOps</span>
            <span className="font-semibold text-[14px] text-[#00a572] tracking-[-0.4px]">Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-['JetBrains_Mono',monospace] text-[#6b7280] hidden sm:block">
              {new Date().toLocaleDateString("pt-BR")}
            </span>
            <span className="text-[10px] text-[#4b5563] hidden md:block truncate max-w-[160px]">
              {session.user.email}
            </span>
            <button
              onClick={signOut}
              title="Sair"
              className="flex items-center gap-1 text-[#6b7280] hover:text-[#f87171] transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>

        {/* Linha 2: abas com scroll horizontal */}
        <nav className="flex items-center h-[36px] overflow-x-auto scrollbar-hide border-t border-[#1a1d24]"
             style={{ scrollbarWidth: "none" }}>
          {([
            { id: "gestao",         label: "Gestão de Op.",  icon: <Fuel       size={12} strokeWidth={2} /> },
            { id: "estoque",        label: "Estoque",         icon: <Package    size={12} strokeWidth={2} /> },
            { id: "financeiro",     label: "Financeiro",      icon: <DollarSign size={12} strokeWidth={2} /> },
            { id: "equipe",         label: "Equipe",          icon: <Users      size={12} strokeWidth={2} /> },
            { id: "regulamentacao", label: "Regulamentação",  icon: <Shield     size={12} strokeWidth={2} /> },
            { id: "estrategia",     label: "Estratégia",      icon: <Target     size={12} strokeWidth={2} /> },
            { id: "manutencao",     label: "Manutenção",      icon: <Wrench     size={12} strokeWidth={2} /> },
            { id: "atendimento",    label: "Atendimento",     icon: <Headphones size={12} strokeWidth={2} /> },
            { id: "configuracoes",  label: "Config",          icon: <Settings   size={12} strokeWidth={2} /> },
            { id: "lubrificacao",   label: "Óleo/Lub",        icon: <Droplets   size={12} strokeWidth={2} /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold tracking-[0.04em] uppercase border-b-2 transition-all duration-200 whitespace-nowrap shrink-0 ${
                activeTab === id
                  ? "border-[#00a572] text-white"
                  : "border-transparent text-[#6b7280] hover:text-[#9ca3af]"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Tab Content */}
      <div className="w-full">
        {activeTab === "gestao" && <GestaoOperacoes />}
        {activeTab === "estoque" && <ControleEstoque />}
        {activeTab === "financeiro" && <Financeiro />}
        {activeTab === "equipe" && <GestaoEquipe />}
        {activeTab === "regulamentacao" && <Regulamentacao />}
        {activeTab === "estrategia" && <EstrategiaVendas />}
        {activeTab === "manutencao" && <Manutencao />}
        {activeTab === "atendimento" && <AtendimentoCliente />}
        {activeTab === "configuracoes" && <Configuracoes />}
        {activeTab === "lubrificacao" && <TrocaOleoLubrificacao />}
      </div>
    </div>
  );
}

export default App;
