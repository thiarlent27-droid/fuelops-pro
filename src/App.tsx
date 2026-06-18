import { useState } from "react";
import { Users, Fuel, Package, DollarSign, Shield, Target, Wrench, Headphones, Settings, Droplets } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<Tab>("estoque");

  return (
    <div className="min-h-screen bg-[#10131a] text-[#e1e2ec] font-['Inter',sans-serif]">
      {/* Top Bar with Tabs */}
      <header className="h-[50px] bg-[#10131a] border-b border-[#262a31] flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-extrabold text-[14px] text-white tracking-[-0.4px]">
            FuelOps
          </span>
          <span className="font-semibold text-[14px] text-[#00a572] tracking-[-0.4px]">
            Pro
          </span>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-0.5 h-full shrink min-w-0">
          <button
            onClick={() => setActiveTab("gestao")}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold tracking-[0.04em] uppercase border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === "gestao"
                ? "border-[#00a572] text-white"
                : "border-transparent text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <Fuel size={13} strokeWidth={2} />
            Gestão de Op.
          </button>
          <button
            onClick={() => setActiveTab("estoque")}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold tracking-[0.04em] uppercase border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === "estoque"
                ? "border-[#00a572] text-white"
                : "border-transparent text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <Package size={13} strokeWidth={2} />
            Estoque
          </button>
          <button
            onClick={() => setActiveTab("financeiro")}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold tracking-[0.04em] uppercase border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === "financeiro"
                ? "border-[#00a572] text-white"
                : "border-transparent text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <DollarSign size={13} strokeWidth={2} />
            Financeiro
          </button>
          <button
            onClick={() => setActiveTab("equipe")}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold tracking-[0.04em] uppercase border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === "equipe"
                ? "border-[#00a572] text-white"
                : "border-transparent text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <Users size={13} strokeWidth={2} />
            Equipe
          </button>
          <button
            onClick={() => setActiveTab("regulamentacao")}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold tracking-[0.04em] uppercase border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === "regulamentacao"
                ? "border-[#00a572] text-white"
                : "border-transparent text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <Shield size={13} strokeWidth={2} />
            Regulamentação
          </button>
          <button
            onClick={() => setActiveTab("estrategia")}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold tracking-[0.04em] uppercase border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === "estrategia"
                ? "border-[#00a572] text-white"
                : "border-transparent text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <Target size={13} strokeWidth={2} />
            Estratégia
          </button>
          <button
            onClick={() => setActiveTab("manutencao")}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold tracking-[0.04em] uppercase border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === "manutencao"
                ? "border-[#00a572] text-white"
                : "border-transparent text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <Wrench size={13} strokeWidth={2} />
            Manutenção
          </button>
          <button
            onClick={() => setActiveTab("atendimento")}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold tracking-[0.04em] uppercase border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === "atendimento"
                ? "border-[#00a572] text-white"
                : "border-transparent text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <Headphones size={13} strokeWidth={2} />
            Atendimento
          </button>
          <button
            onClick={() => setActiveTab("configuracoes")}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold tracking-[0.04em] uppercase border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === "configuracoes"
                ? "border-[#00a572] text-white"
                : "border-transparent text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <Settings size={13} strokeWidth={2} />
            Config
          </button>
          <button
            onClick={() => setActiveTab("lubrificacao")}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold tracking-[0.04em] uppercase border-b-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === "lubrificacao"
                ? "border-[#00a572] text-white"
                : "border-transparent text-[#6b7280] hover:text-[#9ca3af]"
            }`}
          >
            <Droplets size={13} strokeWidth={2} />
            Óleo/Lub
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-['JetBrains_Mono',monospace] text-[#6b7280]">
            {new Date().toLocaleDateString("pt-BR")}
          </span>
        </div>
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
