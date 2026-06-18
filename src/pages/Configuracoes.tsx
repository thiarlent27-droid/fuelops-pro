import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Settings,
  FolderOpen,
  FileText,
  Trash2,
  Download,
  Eye,
  HardDrive,
  Calendar,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  Save,
  Copy,
  Info,
  Shield,
  Zap,
  Database,
  Clock,
  ArrowRight,
} from "lucide-react";
import { loadSimpleData, saveModuleData, MODULE_NAMES } from "../services/supabasePersistence";

/* ══════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════ */

interface EmpresaParams {
  nomeEmpresa: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
}

interface ArquivoSistema {
  id: string;
  nome: string;
  modulo: string;
  registroRelacionado: string;
  dataUpload: string;
  tamanho: number;
  tipo: string;
}

interface ConfigData {
  empresa: EmpresaParams;
  arquivos: ArquivoSistema[];
}

interface ArquivoOrfao extends ArquivoSistema {
  motivo: "orfao" | "duplicado" | "inutilizado";
}

/* ══════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════ */

const STORAGE_KEY = "dadosConfiguracoes";
const MODULO_NAME = MODULE_NAMES.CONFIGURACOES;

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MODULOS_ORIGEM = [
  "Regulamentação",
  "Manutenção",
  "Estratégia Comercial",
  "Atendimento ao Cliente",
];

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */

function makeKey(year: number, monthIdx: number): string {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
}

function getDefaultConfigData(): ConfigData {
  return {
    empresa: {
      nomeEmpresa: "",
      cnpj: "",
      endereco: "",
      cidade: "",
      estado: "",
      telefone: "",
      email: "",
    },
    arquivos: [],
  };
}

function loadFromStorage(): ConfigData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getDefaultConfigData();
  } catch {
    return getDefaultConfigData();
  }
}

function saveToStorage(_data: ConfigData): void {
  /* salvar via Supabase — ver persistência no componente */
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 KB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */

export default function Configuracoes() {
  /* ── Period (Date Selector) ── */
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const monthSelectorRef = useRef<HTMLDivElement>(null);

  /* ── Persistence ── */
  const [configData, setConfigData] = useState<ConfigData>(getDefaultConfigData);
  const [loaded, setLoaded] = useState(false);
  const currentKey = makeKey(selectedYear, selectedMonth);

  // Carregar dados do Supabase ao montar
  useEffect(() => {
    loadSimpleData<ConfigData>(MODULO_NAME, "empresa", getDefaultConfigData()).then((data) => {
      setConfigData(data);
      setEmpresa(data.empresa);
      setLoaded(true);
    }).catch(() => {
      setConfigData(loadFromStorage());
      setLoaded(true);
    });
  }, []);

  /* ── View State ── */
  const [activeView, setActiveView] = useState<"menu" | "parametros" | "arquivos">("menu");

  /* ── Parametros State ── */
  const [empresa, setEmpresa] = useState<EmpresaParams>(configData.empresa);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  /* ── Arquivos State ── */
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroModulo, setFiltroModulo] = useState("Todos");
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; arquivo: ArquivoSistema | null }>({
    show: false,
    arquivo: null,
  });

  /* ── Auto-save ── */
  useEffect(() => {
    if (!loaded) return;
    const updated: ConfigData = { ...configData, empresa };
    setConfigData(updated);
    saveModuleData(MODULO_NAME, "empresa", updated);
  }, [empresa]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Month selector ── */
  const monthLabel = `${MONTH_LABELS[selectedMonth]} ${selectedYear}`;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthSelectorRef.current && !monthSelectorRef.current.contains(e.target as Node)) {
        setShowMonthMenu(false);
      }
    };
    if (showMonthMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMonthMenu]);

  const handleMonthSelect = useCallback((monthIdx: number) => {
    setSelectedMonth(monthIdx);
    setShowMonthMenu(false);
  }, []);

  const handleYearChange = useCallback((newYear: number) => {
    setSelectedYear(newYear);
  }, []);

  /* ── Arquivos Calculations ── */
  const arquivos = configData.arquivos;

  const totalArquivos = arquivos.length;

  const espacoUtilizado = useMemo(() => {
    const totalBytes = arquivos.reduce((sum, a) => sum + a.tamanho, 0);
    return formatFileSize(totalBytes);
  }, [arquivos]);

  const espacoTotal = "512 MB";

  const arquivosMesAtual = useMemo(() => {
    const mesAtual = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    return arquivos.filter((a) => a.dataUpload.startsWith(mesAtual)).length;
  }, [arquivos, selectedYear, selectedMonth]);

  const arquivosFiltrados = useMemo(() => {
    let result = [...arquivos];
    if (filtroModulo !== "Todos") {
      result = result.filter((a) => a.modulo === filtroModulo);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.nome.toLowerCase().includes(term) ||
          a.registroRelacionado.toLowerCase().includes(term) ||
          a.modulo.toLowerCase().includes(term)
      );
    }
    return result;
  }, [arquivos, filtroModulo, searchTerm]);

  /* ── Arquivos Órfãos ── */
  const arquivosOrfaos = useMemo(() => {
    const orfaos: ArquivoOrfao[] = [];
    const nameCount: Record<string, number> = {};
    arquivos.forEach((a) => {
      nameCount[a.nome] = (nameCount[a.nome] || 0) + 1;
    });
    arquivos.forEach((a) => {
      // Simular órfãos: registros sem vínculo (ex: sem registroRelacionado)
      if (!a.registroRelacionado || a.registroRelacionado.trim() === "") {
        orfaos.push({ ...a, motivo: "orfao" });
      }
      // Duplicados
      if (nameCount[a.nome] > 1) {
        orfaos.push({ ...a, motivo: "duplicado" });
      }
    });
    // Deduplicate by id
    const seen = new Set<string>();
    return orfaos.filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
  }, [arquivos]);

  /* ── Handlers ── */
  const handleEmpresaChange = useCallback((field: keyof EmpresaParams, value: string) => {
    setEmpresa((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveParametros = useCallback(() => {
    const updated: ConfigData = { ...configData, empresa };
    setConfigData(updated);
    saveModuleData(MODULO_NAME, "empresa", updated);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  }, [configData, empresa]);

  const handleDeleteArquivo = useCallback((arquivo: ArquivoSistema) => {
    setDeleteModal({ show: true, arquivo });
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteModal.arquivo) return;
    const updated = {
      ...configData,
      arquivos: configData.arquivos.filter((a) => a.id !== deleteModal.arquivo!.id),
    };
    setConfigData(updated);
    saveModuleData(MODULO_NAME, "empresa", updated);
    setDeleteModal({ show: false, arquivo: null });
  }, [configData, deleteModal]);

  const handleLimparOrfaos = useCallback(() => {
    const orfaoIds = new Set(arquivosOrfaos.map((o) => o.id));
    const updated = {
      ...configData,
      arquivos: configData.arquivos.filter((a) => !orfaoIds.has(a.id)),
    };
    setConfigData(updated);
    saveModuleData(MODULO_NAME, "empresa", updated);
  }, [configData, arquivosOrfaos]);

  const handleDownload = useCallback((arquivo: ArquivoSistema) => {
    // Simular download
    alert(`Download simulado: ${arquivo.nome}\nTamanho: ${formatFileSize(arquivo.tamanho)}`);
  }, []);

  const handleVerOrigem = useCallback((arquivo: ArquivoSistema) => {
    alert(`Origem: ${arquivo.modulo}\nRegistro: ${arquivo.registroRelacionado}\nData: ${formatDateBR(arquivo.dataUpload)}`);
  }, []);

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-[#12141c] p-6">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1d2027] border border-[#262a31] flex items-center justify-center">
            <Settings size={20} className="text-[#00a572]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Configurações</h1>
            <p className="text-xs text-[#6b7280]">Central de Governança do Sistema</p>
          </div>
        </div>

        {/* ── Date Selector ── */}
        <div className="relative" ref={monthSelectorRef}>
          <button
            onClick={() => setShowMonthMenu(!showMonthMenu)}
            className="flex items-center gap-2 bg-[#1d2027] border border-[#262a31] rounded-md px-3 py-2 cursor-pointer hover:border-[#00a572] transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-[#00a572]" />
            <span className="text-[11px] font-semibold font-['JetBrains_Mono',monospace] text-white uppercase tracking-wider">
              {monthLabel}
            </span>
            <span
              className="text-[10px] text-[#6b7280] transition-transform duration-200"
              style={{ transform: showMonthMenu ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▾
            </span>
          </button>

          {showMonthMenu && (
            <div className="absolute top-[calc(100%+6px)] right-0 w-[280px] bg-[#1d2027] border border-[#262a31] rounded-lg overflow-hidden z-30 shadow-[0_8px_32px_rgba(0,0,0,.5)]">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#262a31]">
                <button
                  onClick={() => handleYearChange(selectedYear - 1)}
                  className="text-xs text-[#9ca3af] hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#262a31]"
                >
                  ◀ Anterior
                </button>
                <span className="text-sm font-bold text-white font-['JetBrains_Mono',monospace]">
                  {selectedYear}
                </span>
                <button
                  onClick={() => handleYearChange(selectedYear + 1)}
                  className="text-xs text-[#9ca3af] hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#262a31]"
                >
                  Próximo ▶
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-3">
                {MONTH_LABELS.map((label, idx) => (
                  <button
                    key={label}
                    onClick={() => handleMonthSelect(idx)}
                    className={`py-2 px-1 rounded text-[11px] font-medium transition-colors ${
                      idx === selectedMonth
                        ? "bg-[rgba(0,165,114,.15)] text-[#00a572] border border-[rgba(0,165,114,.3)]"
                        : "text-[#9ca3af] hover:bg-[#262a31] hover:text-white border border-transparent"
                    }`}
                  >
                    {label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         MENU PRINCIPAL (Cards Clicáveis)
         ═══════════════════════════════════════════════════════ */}
      {activeView === "menu" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
          {/* Card 1: Parâmetros do Sistema */}
          <button
            onClick={() => setActiveView("parametros")}
            className="group bg-[#1d2027] border border-[#262a31] rounded-xl p-8 text-left hover:border-[#00a572] hover:shadow-[0_0_30px_rgba(0,165,114,.1)] transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-xl bg-[rgba(0,165,114,.1)] border border-[rgba(0,165,114,.2)] flex items-center justify-center group-hover:bg-[rgba(0,165,114,.2)] transition-colors">
                <Building2 size={26} className="text-[#00a572]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Parâmetros do Sistema</h2>
                <p className="text-xs text-[#6b7280]">Configurações cadastrais da empresa</p>
              </div>
            </div>
            <div className="space-y-2.5 text-[12px] text-[#9ca3af]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00a572]" />
                <span>Dados do Posto</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00a572]" />
                <span>CNPJ e Endereço</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00a572]" />
                <span>Contato e E-mail</span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[#00a572] text-[12px] font-semibold group-hover:gap-3 transition-all">
              Acessar <ArrowRight size={14} />
            </div>
          </button>

          {/* Card 2: Central de Arquivos */}
          <button
            onClick={() => setActiveView("arquivos")}
            className="group bg-[#1d2027] border border-[#262a31] rounded-xl p-8 text-left hover:border-[#00a572] hover:shadow-[0_0_30px_rgba(0,165,114,.1)] transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-xl bg-[rgba(96,212,247,.1)] border border-[rgba(96,212,247,.2)] flex items-center justify-center group-hover:bg-[rgba(96,212,247,.2)] transition-colors">
                <FolderOpen size={26} className="text-[#60d4f7]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Central de Arquivos</h2>
                <p className="text-xs text-[#6b7280]">Gerenciamento de armazenamento global</p>
              </div>
            </div>
            <div className="space-y-2.5 text-[12px] text-[#9ca3af]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#60d4f7]" />
                <span>Inventário de todos os módulos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#60d4f7]" />
                <span>Visualizar e excluir arquivos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#60d4f7]" />
                <span>Detectar órfãos e duplicados</span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[#60d4f7] text-[12px] font-semibold group-hover:gap-3 transition-all">
              Acessar <ArrowRight size={14} />
            </div>
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
         PARÂMETROS DO SISTEMA
         ═══════════════════════════════════════════════════════ */}
      {activeView === "parametros" && (
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => setActiveView("menu")}
            className="flex items-center gap-2 text-[#6b7280] hover:text-white text-sm mb-6 transition-colors"
          >
            ← Voltar ao Menu
          </button>

          <div className="bg-[#1d2027] border border-[#262a31] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#262a31]">
              <Building2 size={20} className="text-[#00a572]" />
              <div>
                <h2 className="text-base font-bold text-white">Parâmetros do Sistema</h2>
                <p className="text-xs text-[#6b7280]">Cadastro corporativo do posto de combustível</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nome da Empresa */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
                  <Building2 size={12} />
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  value={empresa.nomeEmpresa}
                  onChange={(e) => handleEmpresaChange("nomeEmpresa", e.target.value)}
                  placeholder="Ex: Posto Carga Pesada"
                  className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-4 py-3 text-sm text-white placeholder-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors font-['JetBrains_Mono',monospace]"
                />
              </div>

              {/* CNPJ */}
              <div>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
                  <Shield size={12} />
                  CNPJ
                </label>
                <input
                  type="text"
                  value={empresa.cnpj}
                  onChange={(e) => handleEmpresaChange("cnpj", e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-4 py-3 text-sm text-white placeholder-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors font-['JetBrains_Mono',monospace]"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
                  <Phone size={12} />
                  Telefone
                </label>
                <input
                  type="text"
                  value={empresa.telefone}
                  onChange={(e) => handleEmpresaChange("telefone", e.target.value)}
                  placeholder="(34) 3222-0000"
                  className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-4 py-3 text-sm text-white placeholder-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors font-['JetBrains_Mono',monospace]"
                />
              </div>

              {/* Endereço */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
                  <MapPin size={12} />
                  Endereço
                </label>
                <input
                  type="text"
                  value={empresa.endereco}
                  onChange={(e) => handleEmpresaChange("endereco", e.target.value)}
                  placeholder="Rua Exemplo, 123 - Centro"
                  className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-4 py-3 text-sm text-white placeholder-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors font-['JetBrains_Mono',monospace]"
                />
              </div>

              {/* Cidade */}
              <div>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
                  <MapPin size={12} />
                  Cidade
                </label>
                <input
                  type="text"
                  value={empresa.cidade}
                  onChange={(e) => handleEmpresaChange("cidade", e.target.value)}
                  placeholder="Ex: Uberlândia"
                  className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-4 py-3 text-sm text-white placeholder-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors font-['JetBrains_Mono',monospace]"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
                  <MapPin size={12} />
                  Estado
                </label>
                <input
                  type="text"
                  value={empresa.estado}
                  onChange={(e) => handleEmpresaChange("estado", e.target.value)}
                  placeholder="MG"
                  className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-4 py-3 text-sm text-white placeholder-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors font-['JetBrains_Mono',monospace]"
                />
              </div>

              {/* E-mail */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">
                  <Mail size={12} />
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  value={empresa.email}
                  onChange={(e) => handleEmpresaChange("email", e.target.value)}
                  placeholder="contato@posto.com.br"
                  className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-4 py-3 text-sm text-white placeholder-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors font-['JetBrains_Mono',monospace]"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSaveParametros}
                className="flex items-center gap-2 bg-[#00a572] hover:bg-[#00c487] text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
              >
                <Save size={16} />
                Salvar Configurações
              </button>
            </div>
          </div>

          {/* Success Toast */}
          {showSuccessToast && (
            <div className="fixed bottom-6 right-6 bg-[#1d2027] border border-[rgba(0,165,114,.3)] rounded-lg px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,.4)] flex items-center gap-3 z-50 animate-[fadeIn_0.2s_ease]">
              <CheckCircle2 size={18} className="text-[#00a572]" />
              <span className="text-sm text-white font-medium">Configurações salvas com sucesso!</span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
         CENTRAL DE ARQUIVOS
         ═══════════════════════════════════════════════════════ */}
      {activeView === "arquivos" && (
        <div>
          {/* Back Button */}
          <button
            onClick={() => setActiveView("menu")}
            className="flex items-center gap-2 text-[#6b7280] hover:text-white text-sm mb-6 transition-colors"
          >
            ← Voltar ao Menu
          </button>

          <div className="flex items-center gap-3 mb-6">
            <FolderOpen size={20} className="text-[#60d4f7]" />
            <div>
              <h2 className="text-base font-bold text-white">Central de Arquivos</h2>
              <p className="text-xs text-[#6b7280]">Gerenciamento de armazenamento global do sistema</p>
            </div>
          </div>

          {/* ── Mini Cards de Métricas ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1d2027] border border-[#262a31] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(0,165,114,.1)] flex items-center justify-center">
                  <Database size={18} className="text-[#00a572]" />
                </div>
                <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Total de Arquivos</span>
              </div>
              <div className="text-2xl font-bold text-white font-['JetBrains_Mono',monospace]">
                {totalArquivos}
              </div>
              <div className="text-[11px] text-[#6b7280] mt-1">cadastrados no sistema</div>
            </div>

            <div className="bg-[#1d2027] border border-[#262a31] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(96,212,247,.1)] flex items-center justify-center">
                  <HardDrive size={18} className="text-[#60d4f7]" />
                </div>
                <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Espaço Utilizado</span>
              </div>
              <div className="text-2xl font-bold text-white font-['JetBrains_Mono',monospace]">
                {espacoUtilizado}
              </div>
              <div className="text-[11px] text-[#6b7280] mt-1">/ {espacoTotal}</div>
            </div>

            <div className="bg-[#1d2027] border border-[#262a31] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(250,204,21,.1)] flex items-center justify-center">
                  <Calendar size={18} className="text-[#facc15]" />
                </div>
                <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Enviados no Mês</span>
              </div>
              <div className="text-2xl font-bold text-white font-['JetBrains_Mono',monospace]">
                {arquivosMesAtual}
              </div>
              <div className="text-[11px] text-[#6b7280] mt-1">{MONTH_LABELS[selectedMonth]} {selectedYear}</div>
            </div>
          </div>

          {/* ── Filtros e Busca ── */}
          <div className="bg-[#1d2027] border border-[#262a31] rounded-xl p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar arquivo, registro ou módulo..."
                  className="w-full bg-[#12141c] border border-[#262a31] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {["Todos", ...MODULOS_ORIGEM].map((mod) => (
                  <button
                    key={mod}
                    onClick={() => setFiltroModulo(mod)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                      filtroModulo === mod
                        ? "bg-[rgba(0,165,114,.15)] text-[#00a572] border border-[rgba(0,165,114,.3)]"
                        : "bg-[#12141c] text-[#9ca3af] border border-[#262a31] hover:border-[#3a3f4b]"
                    }`}
                  >
                    {mod}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Tabela Global de Arquivos ── */}
          <div className="bg-[#1d2027] border border-[#262a31] rounded-xl overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-[#262a31]">
              <h3 className="text-sm font-bold text-white">Tabela Global de Arquivos</h3>
              <p className="text-[11px] text-[#6b7280] mt-1">
                {arquivosFiltrados.length} arquivo(s) encontrado(s)
              </p>
            </div>

            {arquivosFiltrados.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <FolderOpen size={40} className="text-[#3a3f4b] mx-auto mb-3" />
                <p className="text-sm text-[#6b7280]">Nenhum arquivo encontrado</p>
                <p className="text-[11px] text-[#3a3f4b] mt-1">
                  {arquivos.length === 0
                    ? "Os arquivos das outras abas aparecerão aqui automaticamente"
                    : "Tente ajustar os filtros de busca"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#262a31]">
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                        Nome do Arquivo
                      </th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                        Módulo de Origem
                      </th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                        Registro Relacionado
                      </th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                        Data Upload
                      </th>
                      <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                        Tamanho
                      </th>
                      <th className="text-center px-5 py-3 text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {arquivosFiltrados.map((arquivo) => (
                      <tr
                        key={arquivo.id}
                        className="border-b border-[#262a31]/50 hover:bg-[#12141c]/50 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-[#60d4f7]" />
                            <span className="text-sm text-white font-medium">{arquivo.nome}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                            arquivo.modulo === "Regulamentação"
                              ? "bg-[rgba(168,85,247,.1)] text-[#a855f7]"
                              : arquivo.modulo === "Manutenção"
                              ? "bg-[rgba(251,146,60,.1)] text-[#fb923c]"
                              : arquivo.modulo === "Estratégia Comercial"
                              ? "bg-[rgba(96,212,247,.1)] text-[#60d4f7]"
                              : "bg-[rgba(78,222,163,.1)] text-[#4edea3]"
                          }`}>
                            {arquivo.modulo}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm text-[#9ca3af]">{arquivo.registroRelacionado || "—"}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[12px] text-[#6b7280] font-['JetBrains_Mono',monospace]">
                            {formatDateBR(arquivo.dataUpload)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[12px] text-[#9ca3af] font-['JetBrains_Mono',monospace]">
                            {formatFileSize(arquivo.tamanho)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDownload(arquivo)}
                              className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#00a572] hover:bg-[rgba(0,165,114,.1)] transition-colors"
                              title="Baixar"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              onClick={() => handleVerOrigem(arquivo)}
                              className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#60d4f7] hover:bg-[rgba(96,212,247,.1)] transition-colors"
                              title="Ver Origem"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteArquivo(arquivo)}
                              className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#f87171] hover:bg-[rgba(248,113,113,.1)] transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Painel de Arquivos Órfãos/Duplicados ── */}
          {arquivosOrfaos.length > 0 && (
            <div className="bg-[#1d2027] border border-[rgba(250,204,21,.2)] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[rgba(250,204,21,.2)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-[#facc15]" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Arquivos Órfãos / Duplicados</h3>
                    <p className="text-[11px] text-[#facc15]">
                      {arquivosOrfaos.length} arquivo(s) com possível problema detectado
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLimparOrfaos}
                  className="flex items-center gap-2 bg-[rgba(248,113,113,.1)] border border-[rgba(248,113,113,.3)] text-[#f87171] px-4 py-2 rounded-lg text-[12px] font-semibold hover:bg-[rgba(248,113,113,.2)] transition-colors"
                >
                  <Trash2 size={14} />
                  Exclusão Rápida / Limpar Cache
                </button>
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  {arquivosOrfaos.map((arquivo) => (
                    <div
                      key={arquivo.id}
                      className="flex items-center justify-between p-3 bg-[#12141c] border border-[#262a31] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          arquivo.motivo === "orfao"
                            ? "bg-[rgba(250,204,21,.1)]"
                            : "bg-[rgba(248,113,113,.1)]"
                        }`}>
                          {arquivo.motivo === "orfao" ? (
                            <Info size={14} className="text-[#facc15]" />
                          ) : (
                            <Copy size={14} className="text-[#f87171]" />
                          )}
                        </div>
                        <div>
                          <span className="text-sm text-white font-medium">{arquivo.nome}</span>
                          <div className="text-[11px] text-[#6b7280]">
                            {arquivo.motivo === "orfao" ? "Sem vínculo com registro" : "Arquivo duplicado"} • {arquivo.modulo}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-[#9ca3af] font-['JetBrains_Mono',monospace]">
                        {formatFileSize(arquivo.tamanho)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
         MODAL DE EXCLUSÃO SEGURA
         ═══════════════════════════════════════════════════════ */}
      {deleteModal.show && deleteModal.arquivo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1d2027] border border-[rgba(248,113,113,.3)] rounded-xl max-w-md w-full shadow-[0_16px_64px_rgba(0,0,0,.5)]">
            <div className="p-6 border-b border-[#262a31]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[rgba(248,113,113,.1)] flex items-center justify-center">
                  <AlertTriangle size={20} className="text-[#f87171]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Confirmar Exclusão</h3>
                  <p className="text-[11px] text-[#f87171]">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <div className="bg-[#12141c] border border-[#262a31] rounded-lg p-4 space-y-2.5">
                <p className="text-sm text-[#9ca3af]">
                  Você realmente deseja excluir este arquivo?
                </p>
                <div className="space-y-1.5 mt-3">
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-[#6b7280]">Nome:</span>
                    <span className="text-white font-semibold font-['JetBrains_Mono',monospace]">{deleteModal.arquivo.nome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-[#6b7280]">Módulo:</span>
                    <span className="text-white font-medium">{deleteModal.arquivo.modulo}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-[#6b7280]">Registro:</span>
                    <span className="text-white font-medium">{deleteModal.arquivo.registroRelacionado || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ show: false, arquivo: null })}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#9ca3af] hover:text-white bg-[#262a31] hover:bg-[#3a3f4b] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#f87171] hover:bg-[#ef4444] transition-colors"
              >
                Excluir Arquivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
