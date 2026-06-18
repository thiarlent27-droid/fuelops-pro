import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Target,
  TrendingUp,
  Plus,
  Trash2,
  ChevronRight,
  BarChart3,
  Users,
  Send,
  UserPlus,
  Settings,
  Percent,
  DollarSign,
  Award,
  Calendar,
  Activity,
  Filter,
  ArrowDown,
  X,
  Edit3,
  Eye,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { loadAllModuleData, saveAllModuleData, MODULE_NAMES } from "../services/supabasePersistence";

/* ══════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════ */

interface KpiItem {
  id: string;
  nome: string;
  icon: string;
  resultadoAtual: string;
  meta: string;
}

interface FunilData {
  prospeccao: string;
  propostas: string;
  negociacoesAtual: string;
  negociacoesPerdidas: string;
  negociacoesAndamento: string;
  fechamentos: string;
  onboarding: string;
}

interface Estrategia {
  id: string;
  nome: string;
  objetivo: string;
  descricao: string;
  dataInicio: string;
  dataTermino: string;
  prioridade: "baixa" | "media" | "alta" | "critica";
  resultadoEsperado: string;
  resultadoObtido: string;
  observacoes: string;
}

interface PeriodData {
  kpis: KpiItem[];
  funil: FunilData;
  estrategias: Estrategia[];
}

/* ══════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════ */

const STORAGE_KEY = "dadosEstrategia";
const MODULO_NAME = MODULE_NAMES.ESTRATEGIA;

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const FUNIL_METAS_SUGERIDAS: Record<string, number[]> = {
  prospeccao: [100, 200, 400, 800],
  propostas: [60, 120, 240, 480],
  fechamentos: [12, 25, 50, 100],
  onboarding: [112, 225, 450, 900],
};

const PRIORIDADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  baixa: { label: "Baixa", color: "text-[#4edea3]", bg: "bg-[rgba(78,222,163,.1)]", border: "border-[rgba(78,222,163,.3)]" },
  media: { label: "Média", color: "text-[#facc15]", bg: "bg-[rgba(250,204,21,.1)]", border: "border-[rgba(250,204,21,.3)]" },
  alta: { label: "Alta", color: "text-[#fb923c]", bg: "bg-[rgba(251,146,60,.1)]", border: "border-[rgba(251,146,60,.3)]" },
  critica: { label: "Crítica", color: "text-[#f87171]", bg: "bg-[rgba(248,113,113,.1)]", border: "border-[rgba(248,113,113,.3)]" },
};

const KPI_DEFAULTS: Omit<KpiItem, "id">[] = [
  { nome: "Leads Captados", icon: "users", resultadoAtual: "", meta: "" },
  { nome: "Propostas Enviadas", icon: "send", resultadoAtual: "", meta: "" },
  { nome: "Novos Clientes", icon: "user-plus", resultadoAtual: "", meta: "" },
  { nome: "Atividades de Onboarding", icon: "settings", resultadoAtual: "", meta: "" },
  { nome: "Taxa de Conversão (%)", icon: "percent", resultadoAtual: "", meta: "" },
  { nome: "Taxa de Retenção (%)", icon: "award", resultadoAtual: "", meta: "" },
  { nome: "Valor de Comissão Prevista", icon: "dollar", resultadoAtual: "", meta: "" },
  { nome: "Valor de Comissão Realizada", icon: "dollar", resultadoAtual: "", meta: "" },
];

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */

function parseBR(s: string): number {
  if (!s || !s.trim() || s.trim() === "-") return 0;
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

function fmtBR(n: number, dec = 2): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmtR(n: number): string {
  return "R$ " + fmtBR(n, 2);
}

function makeKey(year: number, monthIdx: number): string {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getDefaultPeriodData(): PeriodData {
  return {
    kpis: KPI_DEFAULTS.map((k) => ({ ...k, id: crypto.randomUUID() })),
    funil: {
      prospeccao: "",
      propostas: "",
      negociacoesAtual: "",
      negociacoesPerdidas: "",
      negociacoesAndamento: "",
      fechamentos: "",
      onboarding: "",
    },
    estrategias: [],
  };
}

function loadFromStorage(): Record<string, PeriodData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(_data: Record<string, PeriodData>): void {
  /* salvar via Supabase — ver persistência no componente */
}

function calcDeltaHtml(currVal: string, prevVal: string | undefined): React.ReactNode {
  const curr = parseBR(currVal);
  const prev = prevVal ? parseBR(prevVal) : 0;
  if (!prevVal || prevVal.trim() === "" || prev === 0) {
    return <span className="text-[10px] text-[#6b7280]">sem comparativo</span>;
  }
  if (curr === 0 && prev === 0) {
    return <span className="text-[10px] text-[#6b7280]">—</span>;
  }
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  const cls = pct >= 0 ? "text-[#4edea3]" : "text-[#f87171]";
  const arrow = pct >= 0 ? "▲" : "▼";
  return (
    <span className={`text-[10px] font-semibold font-['JetBrains_Mono',monospace] ${cls}`}>
      {arrow} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   SECTION CARD (reusable)
   ══════════════════════════════════════════════════════════ */

const SectionCard = ({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-[#1d2027] border border-[#262a31] rounded-lg p-5 ${className}`}>
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-[0.08em]">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════════
   KPI ICON HELPER
   ══════════════════════════════════════════════════════════ */

function getKpiIcon(iconName: string, className = "text-[#00a572]") {
  const size = 16;
  switch (iconName) {
    case "users": return <Users size={size} className={className} />;
    case "send": return <Send size={size} className={className} />;
    case "user-plus": return <UserPlus size={size} className={className} />;
    case "settings": return <Settings size={size} className={className} />;
    case "percent": return <Percent size={size} className={className} />;
    case "award": return <Award size={size} className={className} />;
    case "dollar": return <DollarSign size={size} className={className} />;
    default: return <Target size={size} className={className} />;
  }
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */

export default function EstrategiaVendas() {
  // ── Period ──
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = Janeiro
  const [selectedYear, setSelectedYear] = useState(2026);
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const [selectedCompareMonth, setSelectedCompareMonth] = useState<number | null>(null); // null = no comparison
  const [showCompareMenu, setShowCompareMenu] = useState(false);
  const monthSelectorRef = useRef<HTMLDivElement>(null);
  const compareSelectorRef = useRef<HTMLDivElement>(null);

  // ── Persistence ──
  const allDataRef = useRef<Record<string, PeriodData>>({});
  const [loaded, setLoaded] = useState(false);
  const currentKey = makeKey(selectedYear, selectedMonth);

  // ── Form State (initialized with defaults) ──
  const defaults = getDefaultPeriodData();
  const [kpis, setKpis] = useState<KpiItem[]>(defaults.kpis);
  const [funil, setFunil] = useState<FunilData>(defaults.funil);
  const [estrategias, setEstrategias] = useState<Estrategia[]>(defaults.estrategias);

  // Carregar dados do Supabase ao montar
  useEffect(() => {
    loadAllModuleData<PeriodData>(MODULO_NAME).then((data) => {
      allDataRef.current = data;
      setLoaded(true);
      const initStored = data[currentKey] || getDefaultPeriodData();
      setKpis(initStored.kpis || defaults.kpis);
      setFunil(initStored.funil || defaults.funil);
      setEstrategias(initStored.estrategias || defaults.estrategias);
    }).catch(() => {
      allDataRef.current = loadFromStorage();
      setLoaded(true);
    });
  }, []);

  // ── Auto-save ──
  useEffect(() => {
    if (!loaded) return;
    const data: PeriodData = { kpis, funil, estrategias };
    allDataRef.current[currentKey] = data;
    saveAllModuleData(MODULO_NAME, allDataRef.current);
  }, [kpis, funil, estrategias, currentKey, loaded]);

  // ── Month selector data ──
  const months = useMemo(() => {
    return MONTH_LABELS.map((label, idx) => ({
      label,
      key: makeKey(selectedYear, idx),
      days: String(getDaysInMonth(selectedYear, idx + 1)),
    }));
  }, [selectedYear]);

  const monthLabel = `${MONTH_LABELS[selectedMonth]} ${selectedYear}`;

  // ── Snapshot & Load helpers ──
  const snapshotCurrent = useCallback(() => {
    const data: PeriodData = { kpis, funil, estrategias };
    allDataRef.current[currentKey] = data;
    saveAllModuleData(MODULO_NAME, allDataRef.current);
  }, [kpis, funil, estrategias, currentKey]);

  const loadPeriod = useCallback((key: string) => {
    const stored = allDataRef.current[key];
    const d = getDefaultPeriodData();
    setKpis(stored?.kpis || d.kpis);
    setFunil(stored?.funil || d.funil);
    setEstrategias(stored?.estrategias || d.estrategias);
  }, []);

  const handleMonthSelect = useCallback((monthIdx: number) => {
    snapshotCurrent();
    const newKey = makeKey(selectedYear, monthIdx);
    setSelectedMonth(monthIdx);
    setShowMonthMenu(false);
    loadPeriod(newKey);
  }, [snapshotCurrent, selectedYear, loadPeriod]);

  const handleYearChange = useCallback((newYear: number) => {
    snapshotCurrent();
    const newKey = makeKey(newYear, selectedMonth);
    setSelectedYear(newYear);
    loadPeriod(newKey);
  }, [snapshotCurrent, selectedMonth, loadPeriod]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthSelectorRef.current && !monthSelectorRef.current.contains(e.target as Node)) {
        setShowMonthMenu(false);
      }
      if (compareSelectorRef.current && !compareSelectorRef.current.contains(e.target as Node)) {
        setShowCompareMenu(false);
      }
    };
    if (showMonthMenu || showCompareMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMonthMenu, showCompareMenu]);

  // ── Comparison data ──
  const compareData = useMemo(() => {
    if (selectedCompareMonth === null) return null;
    const key = makeKey(selectedYear, selectedCompareMonth);
    return allDataRef.current[key] || null;
  }, [selectedCompareMonth, selectedYear, kpis]); // eslint-disable-line react-hooks/exhaustive-deps

  const compareLabel = selectedCompareMonth !== null ? MONTH_LABELS[selectedCompareMonth] : null;

  // ═══════════════════════════════════════════════════════
  // KPI HANDLERS
  // ═══════════════════════════════════════════════════════

  const handleKpiChange = useCallback((id: string, field: keyof KpiItem, val: string) => {
    setKpis((prev) => prev.map((k) => (k.id === id ? { ...k, [field]: val } : k)));
  }, []);

  // ═══════════════════════════════════════════════════════
  // FUNIL HANDLERS
  // ═══════════════════════════════════════════════════════

  const handleFunilChange = useCallback((field: keyof FunilData, val: string) => {
    setFunil((prev) => ({ ...prev, [field]: val }));
  }, []);

  // ═══════════════════════════════════════════════════════
  // FUNIL CALCULATIONS
  // ═══════════════════════════════════════════════════════

  const funilCalculos = useMemo(() => {
    const leads = parseBR(funil.prospeccao);
    const propostas = parseBR(funil.propostas);
    const negAtual = parseBR(funil.negociacoesAtual);
    const negPerdidas = parseBR(funil.negociacoesPerdidas);
    const negAndamento = parseBR(funil.negociacoesAndamento);
    const fechamentos = parseBR(funil.fechamentos);
    const onboarding = parseBR(funil.onboarding);

    const totalNegociacoes = negAtual + negPerdidas + negAndamento;

    const taxaLeadsPropostas = leads > 0 ? (propostas / leads) * 100 : 0;
    const taxaPropostasNegociacoes = propostas > 0 ? (totalNegociacoes / propostas) * 100 : 0;
    const taxaNegociacoesFechamentos = totalNegociacoes > 0 ? (fechamentos / totalNegociacoes) * 100 : 0;
    const taxaFechamentosClientes = fechamentos > 0 ? (onboarding / fechamentos) * 100 : 0;

    // Auto-calculate tax conversao in KPIs
    const leadsKpi = leads;
    const novosClientesKpi = onboarding;
    const taxaConversaoAuto = leadsKpi > 0 ? ((novosClientesKpi / leadsKpi) * 100).toFixed(1) : "0.0";

    return {
      taxaLeadsPropostas,
      taxaPropostasNegociacoes,
      taxaNegociacoesFechamentos,
      taxaFechamentosClientes,
      taxaConversaoAuto,
      totalNegociacoes,
    };
  }, [funil]);

  // ═══════════════════════════════════════════════════════
  // AUTO-UPDATE TAXA CONVERSAO KPI
  // ═══════════════════════════════════════════════════════

  useEffect(() => {
    setKpis((prev) => prev.map((k) => {
      if (k.nome === "Taxa de Conversão (%)") {
        return { ...k, resultadoAtual: funilCalculos.taxaConversaoAuto };
      }
      return k;
    }));
  }, [funilCalculos.taxaConversaoAuto]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════
  // ESTRATEGIA HANDLERS
  // ═══════════════════════════════════════════════════════

  const addEstrategia = useCallback(() => {
    setEstrategias((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: "",
        objetivo: "",
        descricao: "",
        dataInicio: "",
        dataTermino: "",
        prioridade: "media",
        resultadoEsperado: "",
        resultadoObtido: "",
        observacoes: "",
      },
    ]);
  }, []);

  const removeEstrategia = useCallback((id: string) => {
    setEstrategias((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleEstrategiaChange = useCallback((id: string, field: keyof Estrategia, val: string) => {
    setEstrategias((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: val } : e)));
  }, []);

  // ═══════════════════════════════════════════════════════
  // FUNNEL PROGRESS BAR HELPER
  // ═══════════════════════════════════════════════════════

  const funnelWidthPct = useMemo(() => {
    const leads = parseBR(funil.prospeccao);
    const propostas = parseBR(funil.propostas);
    const negTotal = parseBR(funil.negociacoesAtual) + parseBR(funil.negociacoesPerdidas) + parseBR(funil.negociacoesAndamento);
    const fechamentos = parseBR(funil.fechamentos);
    const onb = parseBR(funil.onboarding);
    const max = Math.max(leads, propostas, negTotal, fechamentos, onb, 1);
    return [
      Math.max((leads / max) * 100, 8),
      Math.max((propostas / max) * 100, 8),
      Math.max((negTotal / max) * 100, 8),
      Math.max((fechamentos / max) * 100, 8),
      Math.max((onb / max) * 100, 8),
    ];
  }, [funil]);

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-5">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between pb-4 border-b border-[#262a31]">
        <div>
          <h1 className="text-[20px] font-bold text-white tracking-[-0.3px]">
            Estratégia de Vendas
          </h1>
          <p className="text-[11px] text-[#9ca3af] mt-1">
            Central de Estratégia Comercial e Gestão de KPIs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Comparativo badge */}
          <div className="relative" ref={compareSelectorRef}>
            <button
              onClick={() => setShowCompareMenu(!showCompareMenu)}
              className="flex items-center gap-1.5 bg-[#1d2027] border border-[#262a31] rounded-md px-3 py-2 cursor-pointer hover:border-[#00a572] transition-colors"
            >
              <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">vs</span>
              <span className="text-[11px] text-white font-semibold font-['JetBrains_Mono',monospace]">
                {compareLabel || "— sem comparativo —"}
              </span>
              <span className="text-[10px] text-[#6b7280] ml-1 transition-transform" style={{ transform: showCompareMenu ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
            </button>
            {showCompareMenu && (
              <div className="absolute top-[calc(100%+6px)] right-0 w-[260px] bg-[#1d2027] border border-[#262a31] rounded-lg overflow-hidden z-30 shadow-[0_8px_32px_rgba(0,0,0,.5)]">
                <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#6b7280] py-2.5 px-3.5 pb-1 font-['JetBrains_Mono',monospace]">
                  Comparar com mês
                </div>
                <button
                  onClick={() => { setSelectedCompareMonth(null); setShowCompareMenu(false); }}
                  className={`flex items-center w-full px-3.5 py-2.5 text-[12px] border-b border-[rgba(38,42,49,.4)] transition-colors ${
                    selectedCompareMonth === null
                      ? "text-white bg-[rgba(0,165,114,.08)]"
                      : "text-[#9ca3af] hover:bg-[#262a31] hover:text-white"
                  }`}
                >
                  <span className="font-medium">Sem comparativo</span>
                </button>
                {MONTH_LABELS.map((label, idx) => {
                  if (idx === selectedMonth) return null; // Don't compare with self
                  const key = makeKey(selectedYear, idx);
                  const hasData = !!allDataRef.current[key];
                  return (
                    <button
                      key={key}
                      onClick={() => { setSelectedCompareMonth(idx); setShowCompareMenu(false); }}
                      className={`flex items-center justify-between w-full px-3.5 py-2.5 text-[12px] border-b border-[rgba(38,42,49,.4)] last:border-b-0 transition-colors ${
                        idx === selectedCompareMonth
                          ? "text-white bg-[rgba(0,165,114,.08)]"
                          : hasData ? "text-[#9ca3af] hover:bg-[#262a31] hover:text-white" : "text-[#4b5563] hover:bg-[#262a31] hover:text-[#9ca3af]"
                      }`}
                    >
                      <span className="font-medium">{label}</span>
                      <span className="text-[9px] font-['JetBrains_Mono',monospace] text-[#6b7280]">
                        {hasData ? "●" : "○"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative" ref={monthSelectorRef}>
            <button
              onClick={() => setShowMonthMenu(!showMonthMenu)}
              className="flex items-center gap-2 bg-[#1d2027] border border-[#262a31] rounded-md px-3 py-2 cursor-pointer hover:border-[#00a572] transition-colors"
            >
              <span className="w-[7px] h-[7px] rounded-full bg-[#00a572] flex-shrink-0"></span>
              <span className="text-[11px] text-white font-semibold uppercase tracking-[0.06em] font-['JetBrains_Mono',monospace]">
                {monthLabel}
              </span>
              <span
                className="text-[10px] text-[#6b7280] ml-1 transition-transform"
                style={{ transform: showMonthMenu ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                ▾
              </span>
            </button>

            {showMonthMenu && (
              <div className="absolute top-[calc(100%+6px)] right-0 w-[300px] bg-[#1d2027] border border-[#262a31] rounded-lg overflow-hidden z-30 shadow-[0_8px_32px_rgba(0,0,0,.5)]">
                {/* Year navigation */}
                <div className="flex items-center justify-between px-2 py-2 border-b border-[#262a31]">
                  <button
                    onClick={() => handleYearChange(selectedYear - 1)}
                    className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] hover:text-white transition-colors px-2.5 py-1.5 rounded hover:bg-[#262a31] flex-shrink-0"
                  >
                    <span className="text-[10px]">◀</span>
                    <span>Anterior</span>
                  </button>
                  <span className="text-[13px] font-bold text-white font-['JetBrains_Mono',monospace] flex-shrink-0 px-3">
                    {selectedYear}
                  </span>
                  <button
                    onClick={() => handleYearChange(selectedYear + 1)}
                    className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] hover:text-white transition-colors px-2.5 py-1.5 rounded hover:bg-[#262a31] flex-shrink-0"
                  >
                    <span>Próximo</span>
                    <span className="text-[10px]">▶</span>
                  </button>
                </div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#6b7280] py-2.5 px-3.5 pb-1 font-['JetBrains_Mono',monospace]">
                  Meses disponíveis
                </div>
                {months.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => handleMonthSelect(MONTH_LABELS.indexOf(m.label))}
                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-[12px] border-b border-[rgba(38,42,49,.4)] last:border-b-0 transition-colors ${
                      m.key === currentKey
                        ? "text-white bg-[rgba(0,165,114,.08)]"
                        : "text-[#9ca3af] hover:bg-[#262a31] hover:text-white"
                    }`}
                  >
                    <span className="font-medium">{m.label}</span>
                    <span className="text-[9px] font-['JetBrains_Mono',monospace] text-[#6b7280]">{m.key}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         SECTION 1: DASHBOARD COMERCIAL (KPIs)
         ═══════════════════════════════════════════════════════ */}
      <SectionCard title="Dashboard Comercial — Indicadores" icon={<BarChart3 size={13} className="text-[#00a572]" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const resultado = parseBR(kpi.resultadoAtual);
            const meta = parseBR(kpi.meta);
            const pctAtingido = meta > 0 ? Math.min((resultado / meta) * 100, 100) : 0;
            const pctColor = pctAtingido >= 80 ? "bg-[#00a572]" : pctAtingido >= 50 ? "bg-[#facc15]" : "bg-[#fb923c]";

            return (
              <div
                key={kpi.id}
                className="bg-[#12141c] border border-[#262a31] rounded-lg p-4 flex flex-col gap-3 hover:border-[rgba(0,165,114,.3)] transition-colors"
              >
                {/* Card header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getKpiIcon(kpi.icon)}
                    <span className="text-[11px] font-semibold text-white">{kpi.nome}</span>
                  </div>
                  <span className={`text-[11px] font-bold font-['JetBrains_Mono',monospace] ${pctAtingido >= 80 ? "text-[#4edea3]" : pctAtingido >= 50 ? "text-[#facc15]" : resultado > 0 ? "text-[#fb923c]" : "text-[#6b7280]"}`}>
                    {pctAtingido.toFixed(0)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-[4px] bg-[#262a31] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pctColor}`}
                    style={{ width: `${pctAtingido}%` }}
                  />
                </div>

                {/* Resultado Atual */}
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">Resultado Atual</label>
                  <input
                    type="text"
                    value={kpi.resultadoAtual}
                    onChange={(e) => handleKpiChange(kpi.id, "resultadoAtual", e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] text-right focus:border-[#00a572] focus:outline-none transition-colors"
                  />
                </div>

                {/* Meta */}
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">Meta</label>
                  <input
                    type="text"
                    value={kpi.meta}
                    onChange={(e) => handleKpiChange(kpi.id, "meta", e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] text-right focus:border-[#00a572] focus:outline-none transition-colors"
                  />
                </div>

                {/* Comparativo - auto-calculated */}
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">
                    Comparativo {compareLabel ? `vs ${compareLabel}` : ""}
                  </label>
                  <div className="flex items-center gap-2 h-[30px]">
                    {compareData?.kpis ? (() => {
                      const prevKpi = compareData.kpis.find((pk) => pk.nome === kpi.nome);
                      return calcDeltaHtml(kpi.resultadoAtual, prevKpi?.resultadoAtual);
                    })() : (
                      <span className="text-[10px] text-[#6b7280]">selecione um mês para comparar</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════
         SECTION 2: FUNIL COMERCIAL
         ═══════════════════════════════════════════════════════ */}
      <SectionCard title="Funil Comercial — Visualização e Eficiência" icon={<Filter size={13} className="text-[#4d8eff]" />}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Funnel */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Etapa 1: Prospecção */}
            <FunnelStage
              label="Prospecção"
              sublabel="Leads"
              width={funnelWidthPct[0]}
              color="bg-[#4d8eff]"
              value={funil.prospeccao}
              onChange={(v) => handleFunilChange("prospeccao", v)}
              metas={FUNIL_METAS_SUGERIDAS.prospeccao}
            />

            {/* Etapa 2: Propostas */}
            <FunnelStage
              label="Propostas"
              sublabel="Propostas Enviadas"
              width={funnelWidthPct[1]}
              color="bg-[#818cf8]"
              value={funil.propostas}
              onChange={(v) => handleFunilChange("propostas", v)}
              metas={FUNIL_METAS_SUGERIDAS.propostas}
            />

            {/* Etapa 3: Negociações */}
            <div className="flex flex-col gap-2 bg-[#12141c] border border-[#262a31] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-white">Negociações</span>
                  <span className="text-[9px] text-[#6b7280] font-['JetBrains_Mono',monospace]">
                    Total: {funilCalculos.totalNegociacoes}
                  </span>
                </div>
                <div
                  className="h-[24px] rounded bg-[rgba(250,204,21,.15)] border border-[rgba(250,204,21,.25)]"
                  style={{ width: `${funnelWidthPct[2]}%`, minWidth: "40px", maxWidth: "100%" }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">Atual</label>
                  <input
                    type="text"
                    value={funil.negociacoesAtual}
                    onChange={(e) => handleFunilChange("negociacoesAtual", e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] text-right focus:border-[#00a572] focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-semibold text-[#f87171] uppercase tracking-wider">Perdidas</label>
                  <input
                    type="text"
                    value={funil.negociacoesPerdidas}
                    onChange={(e) => handleFunilChange("negociacoesPerdidas", e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#1d2027] border border-[rgba(248,113,113,.25)] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] text-right focus:border-[#f87171] focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-semibold text-[#facc15] uppercase tracking-wider">Em Andamento</label>
                  <input
                    type="text"
                    value={funil.negociacoesAndamento}
                    onChange={(e) => handleFunilChange("negociacoesAndamento", e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#1d2027] border border-[rgba(250,204,21,.25)] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] text-right focus:border-[#facc15] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Etapa 4: Fechamentos */}
            <FunnelStage
              label="Fechamentos"
              sublabel="Novos Clientes"
              width={funnelWidthPct[3]}
              color="bg-[#f59e0b]"
              value={funil.fechamentos}
              onChange={(v) => handleFunilChange("fechamentos", v)}
              metas={FUNIL_METAS_SUGERIDAS.fechamentos}
            />

            {/* Etapa 5: Onboarding & Retenção */}
            <FunnelStage
              label="Onboarding e Retenção"
              sublabel="Atividades"
              width={funnelWidthPct[4]}
              color="bg-[#00a572]"
              value={funil.onboarding}
              onChange={(v) => handleFunilChange("onboarding", v)}
              metas={FUNIL_METAS_SUGERIDAS.onboarding}
            />
          </div>

          {/* Right: Efficiency Panel */}
          <div className="w-full lg:w-[280px] flex flex-col gap-3">
            <div className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-[0.08em] mb-1">
              Eficiência do Funil
            </div>

            <EfficiencyCard
              from="Leads"
              to="Propostas"
              pct={funilCalculos.taxaLeadsPropostas}
            />
            <EfficiencyCard
              from="Propostas"
              to="Negociações"
              pct={funilCalculos.taxaPropostasNegociacoes}
            />
            <EfficiencyCard
              from="Negociações"
              to="Fechamentos"
              pct={funilCalculos.taxaNegociacoesFechamentos}
            />
            <EfficiencyCard
              from="Fechamentos"
              to="Clientes Ativos"
              pct={funilCalculos.taxaFechamentosClientes}
            />
          </div>
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════
         SECTION 3: ESTRATÉGIAS COMERCIAIS
         ═══════════════════════════════════════════════════════ */}
      <SectionCard title="Estratégias Comerciais — Planos de Ação" icon={<Target size={13} className="text-[#f59e0b]" />}>
        <div className="flex flex-col gap-4">
          {/* Add button */}
          <button
            onClick={addEstrategia}
            className="flex items-center gap-2 self-start bg-[rgba(0,165,114,.1)] border border-[rgba(0,165,114,.3)] text-[#00a572] text-[11px] font-semibold px-4 py-2 rounded-lg hover:bg-[rgba(0,165,114,.2)] transition-colors"
          >
            <Plus size={14} />
            Adicionar Estratégia
          </button>

          {/* Empty state */}
          {estrategias.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-[#6b7280]">
              <Target size={32} className="mb-3 opacity-30" />
              <span className="text-[12px]">Nenhuma estratégia cadastrada para este período.</span>
              <span className="text-[10px] mt-1">Clique em "Adicionar Estratégia" para começar.</span>
            </div>
          )}

          {/* Strategy cards */}
          {estrategias.map((est) => {
            const pCfg = PRIORIDADE_CONFIG[est.prioridade];
            return (
              <div
                key={est.id}
                className={`bg-[#12141c] border border-[#262a31] rounded-lg p-4 flex flex-col gap-3 hover:border-[rgba(0,165,114,.2)] transition-colors`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="text"
                      value={est.nome}
                      onChange={(e) => handleEstrategiaChange(est.id, "nome", e.target.value)}
                      placeholder="Nome da Estratégia"
                      className="flex-1 min-w-0 bg-transparent border-b border-[#262a31] text-[13px] font-semibold text-white placeholder:text-[#6b7280] focus:border-[#00a572] focus:outline-none transition-colors py-1"
                    />
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${pCfg.color} ${pCfg.bg} ${pCfg.border} flex-shrink-0`}>
                      {pCfg.label}
                    </span>
                  </div>
                  <button
                    onClick={() => removeEstrategia(est.id)}
                    className="ml-3 p-1.5 rounded hover:bg-[rgba(248,113,113,.1)] text-[#6b7280] hover:text-[#f87171] transition-colors flex-shrink-0"
                    title="Excluir estratégia"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Fields grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">Objetivo</label>
                    <input
                      type="text"
                      value={est.objetivo}
                      onChange={(e) => handleEstrategiaChange(est.id, "objetivo", e.target.value)}
                      placeholder="Ex: Aumentar base de clientes"
                      className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">Prioridade</label>
                    <select
                      value={est.prioridade}
                      onChange={(e) => handleEstrategiaChange(est.id, "prioridade", e.target.value)}
                      className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors appearance-none cursor-pointer"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="critica">Crítica</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">Descrição</label>
                  <textarea
                    value={est.descricao}
                    onChange={(e) => handleEstrategiaChange(est.id, "descricao", e.target.value)}
                    placeholder="Descreva a estratégia detalhadamente..."
                    rows={2}
                    className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">Data Início</label>
                    <input
                      type="date"
                      value={est.dataInicio}
                      onChange={(e) => handleEstrategiaChange(est.id, "dataInicio", e.target.value)}
                      className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">Data Término</label>
                    <input
                      type="date"
                      value={est.dataTermino}
                      onChange={(e) => handleEstrategiaChange(est.id, "dataTermino", e.target.value)}
                      className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">Resultado Esperado</label>
                    <input
                      type="text"
                      value={est.resultadoEsperado}
                      onChange={(e) => handleEstrategiaChange(est.id, "resultadoEsperado", e.target.value)}
                      placeholder="Ex: 15 novos clientes"
                      className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">Resultado Obtido</label>
                    <input
                      type="text"
                      value={est.resultadoObtido}
                      onChange={(e) => handleEstrategiaChange(est.id, "resultadoObtido", e.target.value)}
                      placeholder="Ex: 12 novos clientes"
                      className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-semibold text-[#6b7280] uppercase tracking-wider">Observações</label>
                  <input
                    type="text"
                    value={est.observacoes}
                    onChange={(e) => handleEstrategiaChange(est.id, "observacoes", e.target.value)}
                    placeholder="Notas adicionais..."
                    className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FUNNEL STAGE COMPONENT
   ══════════════════════════════════════════════════════════ */

function FunnelStage({
  label,
  sublabel,
  width,
  color,
  value,
  onChange,
  metas,
}: {
  label: string;
  sublabel: string;
  width: number;
  color: string;
  value: string;
  onChange: (v: string) => void;
  metas: number[];
}) {
  const [showMetas, setShowMetas] = useState(false);

  return (
    <div className="flex flex-col gap-2 bg-[#12141c] border border-[#262a31] rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white">{label}</span>
          <span className="text-[9px] text-[#6b7280]">{sublabel}</span>
        </div>
        <div
          className={`h-[24px] rounded ${color}`}
          style={{ width: `${width}%`, minWidth: "40px", maxWidth: "100%", opacity: 0.25 }}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="flex-1 bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] text-right focus:border-[#00a572] focus:outline-none transition-colors"
        />
        <button
          onClick={() => setShowMetas(!showMetas)}
          className="text-[9px] text-[#6b7280] hover:text-[#00a572] transition-colors px-2 py-1.5 rounded bg-[#1d2027] border border-[#262a31] hover:border-[#00a572] flex-shrink-0"
          title="Metas sugeridas"
        >
          Meta ▾
        </button>
      </div>
      {showMetas && (
        <div className="flex gap-2 flex-wrap">
          {metas.map((m) => (
            <button
              key={m}
              onClick={() => {
                onChange(String(m));
                setShowMetas(false);
              }}
              className="text-[10px] font-['JetBrains_Mono',monospace] text-[#9ca3af] hover:text-white bg-[#1d2027] border border-[#262a31] hover:border-[#00a572] px-2.5 py-1 rounded transition-colors"
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   EFFICIENCY CARD COMPONENT
   ══════════════════════════════════════════════════════════ */

function EfficiencyCard({
  from,
  to,
  pct,
}: {
  from: string;
  to: string;
  pct: number;
}) {
  const color =
    pct >= 60 ? "text-[#4edea3]" : pct >= 30 ? "text-[#facc15]" : pct > 0 ? "text-[#fb923c]" : "text-[#6b7280]";
  const barColor =
    pct >= 60 ? "bg-[#00a572]" : pct >= 30 ? "bg-[#facc15]" : pct > 0 ? "bg-[#fb923c]" : "bg-[#6b7280]";

  return (
    <div className="bg-[#12141c] border border-[#262a31] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#9ca3af]">
          {from} → {to}
        </span>
        <span className={`text-[12px] font-bold font-['JetBrains_Mono',monospace] ${color}`}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="w-full h-[4px] bg-[#262a31] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
