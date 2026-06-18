import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Headphones,
  Star,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ClipboardList,
  Target,
  Users,
  ChevronDown,
  Phone,
  Monitor,
  UserCheck,
  FileText,
  Shield,
  Activity,
  Search,
  Filter,
  Edit3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react";
import { loadAllModuleData, saveAllModuleData, MODULE_NAMES } from "../services/supabasePersistence";

/* ══════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════ */

interface GoogleMetrics {
  notaMedia: string;
  negativas: string;
  totalAvaliacoes: string;
}

interface TotemMetrics {
  totalAvaliacoes: string;
  negativas: string;
}

interface ReclamacaoPresencial {
  id: string;
  data: string;
  cliente: string;
  avaliacao: "Excelente" | "Bom" | "Regular" | "Ruim" | "Péssimo" | "";
  comentario: string;
  responsavel: string;
  status: "Pendente" | "Em andamento" | "Resolvida" | "Atrasada";
}

interface Sugestao {
  id: string;
  texto: string;
  origem: "Google" | "Totem" | "Presencial" | "Interna";
  data: string;
  status: "Recebida" | "Analisando" | "Implementada" | "Recusada";
}

interface PlanoAcao {
  id: string;
  titulo: string;
  descricao: string;
  responsavel: string;
  prazo: string;
  prioridade: "baixa" | "media" | "alta" | "critica";
  status: "Planejado" | "Em andamento" | "Concluído" | "Atrasado";
}

interface PeriodData {
  google: GoogleMetrics;
  totem: TotemMetrics;
  npsGoogle: string;
  reclamacoesPresenciais: ReclamacaoPresencial[];
  reclamacoesExternas: string;
  sugestoes: Sugestao[];
  planosAcao: PlanoAcao[];
}

/* ══════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════ */

const STORAGE_KEY = "dadosAtendimento";
const MODULO_NAME = MODULE_NAMES.ATENDIMENTO;

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const AVALIACOES = ["Excelente", "Bom", "Regular", "Ruim", "Péssimo"] as const;

const AVALIACAO_COLORS: Record<string, { text: string; bg: string; dot: string }> = {
  "Excelente": { text: "text-[#4edea3]", bg: "bg-[rgba(78,222,163,.12)]", dot: "bg-[#4edea3]" },
  "Bom":       { text: "text-[#60d4f7]", bg: "bg-[rgba(96,212,247,.12)]", dot: "bg-[#60d4f7]" },
  "Regular":   { text: "text-[#facc15]", bg: "bg-[rgba(250,204,21,.12)]", dot: "bg-[#facc15]" },
  "Ruim":      { text: "text-[#fb923c]", bg: "bg-[rgba(251,146,60,.12)]", dot: "bg-[#fb923c]" },
  "Péssimo":   { text: "text-[#f87171]", bg: "bg-[rgba(248,113,113,.12)]", dot: "bg-[#f87171]" },
};

const STATUS_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  "Pendente":      { text: "text-[#facc15]", bg: "bg-[rgba(250,204,21,.1)]", border: "border-[rgba(250,204,21,.3)]" },
  "Em andamento":  { text: "text-[#60d4f7]", bg: "bg-[rgba(96,212,247,.1)]", border: "border-[rgba(96,212,247,.3)]" },
  "Resolvida":     { text: "text-[#4edea3]", bg: "bg-[rgba(78,222,163,.1)]", border: "border-[rgba(78,222,163,.3)]" },
  "Atrasada":      { text: "text-[#f87171]", bg: "bg-[rgba(248,113,113,.1)]", border: "border-[rgba(248,113,113,.3)]" },
  "Planejado":     { text: "text-[#6b7280]", bg: "bg-[rgba(107,114,128,.1)]", border: "border-[rgba(107,114,128,.3)]" },
  "Concluído":     { text: "text-[#4edea3]", bg: "bg-[rgba(78,222,163,.1)]", border: "border-[rgba(78,222,163,.3)]" },
  "Analisando":    { text: "text-[#a78bfa]", bg: "bg-[rgba(167,139,250,.1)]", border: "border-[rgba(167,139,250,.3)]" },
  "Implementada":  { text: "text-[#4edea3]", bg: "bg-[rgba(78,222,163,.1)]", border: "border-[rgba(78,222,163,.3)]" },
  "Recusada":      { text: "text-[#f87171]", bg: "bg-[rgba(248,113,113,.1)]", border: "border-[rgba(248,113,113,.3)]" },
};

const PRIORIDADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  baixa:   { label: "Baixa",   color: "text-[#4edea3]", bg: "bg-[rgba(78,222,163,.1)]",  border: "border-[rgba(78,222,163,.3)]" },
  media:   { label: "Média",   color: "text-[#facc15]", bg: "bg-[rgba(250,204,21,.1)]", border: "border-[rgba(250,204,21,.3)]" },
  alta:    { label: "Alta",    color: "text-[#fb923c]", bg: "bg-[rgba(251,146,60,.1)]", border: "border-[rgba(251,146,60,.3)]" },
  critica: { label: "Crítica", color: "text-[#f87171]", bg: "bg-[rgba(248,113,113,.1)]", border: "border-[rgba(248,113,113,.3)]" },
};

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */

function parseBR(s: string): number {
  if (!s || !s.trim() || s.trim() === "-") return 0;
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

function fmtBR(n: number, dec = 1): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function makeKey(year: number, monthIdx: number): string {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDefaultPeriodData(): PeriodData {
  return {
    google: { notaMedia: "", negativas: "", totalAvaliacoes: "" },
    totem: { totalAvaliacoes: "", negativas: "" },
    npsGoogle: "",
    reclamacoesPresenciais: [],
    reclamacoesExternas: "",
    sugestoes: [],
    planosAcao: [],
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

function classificarNPS(nps: number): { label: string; color: string; semaforo: string } {
  if (nps >= 70) return { label: "Excelente", color: "text-[#4edea3]", semaforo: "bg-[#4edea3]" };
  if (nps >= 50) return { label: "Muito Bom", color: "text-[#34d399]", semaforo: "bg-[#34d399]" };
  if (nps >= 30) return { label: "Bom", color: "text-[#60d4f7]", semaforo: "bg-[#60d4f7]" };
  if (nps >= 0)  return { label: "Regular", color: "text-[#facc15]", semaforo: "bg-[#facc15]" };
  return { label: "Crítico", color: "text-[#f87171]", semaforo: "bg-[#f87171]" };
}

function semaforoClass(valor: number, limiarAtencao: number, limiarCritico: number, invertido = false): string {
  if (invertido) {
    if (valor <= limiarAtencao) return "bg-[#4edea3]";
    if (valor <= limiarCritico) return "bg-[#facc15]";
    return "bg-[#f87171]";
  }
  if (valor >= limiarAtencao) return "bg-[#4edea3]";
  if (valor >= limiarCritico) return "bg-[#facc15]";
  return "bg-[#f87171]";
}

function semaforoNotaClass(nota: number): string {
  if (nota >= 4.5) return "bg-[#4edea3]";
  if (nota >= 3.5) return "bg-[#facc15]";
  return "bg-[#f87171]";
}

function calcAvaliacaoScore(reclamacoes: ReclamacaoPresencial[]): number {
  if (reclamacoes.length === 0) return 0;
  const pesos: Record<string, number> = { "Excelente": 5, "Bom": 4, "Regular": 3, "Ruim": 2, "Péssimo": 1 };
  let soma = 0;
  let count = 0;
  for (const r of reclamacoes) {
    if (r.avaliacao && pesos[r.avaliacao]) {
      soma += pesos[r.avaliacao];
      count++;
    }
  }
  if (count === 0) return 0;
  return (soma / count) * 20;
}

function calcTaxaResolucao(reclamacoes: ReclamacaoPresencial[]): number {
  if (reclamacoes.length === 0) return 0;
  const resolvidas = reclamacoes.filter((r) => r.status === "Resolvida").length;
  return (resolvidas / reclamacoes.length) * 100;
}

function calcSatisfacaoGeral(nps: number, notaGoogle: number, totemIdx: number, presencialIdx: number): number {
  let soma = 0;
  let count = 0;
  if (nps !== 0) { soma += (nps + 100) / 2; count++; }
  if (notaGoogle > 0) { soma += (notaGoogle / 5) * 100; count++; }
  if (totemIdx > 0) { soma += totemIdx; count++; }
  if (presencialIdx > 0) { soma += presencialIdx; count++; }
  if (count === 0) return 0;
  return soma / count;
}

function calcDeltaHtml(currVal: string, prevVal: string): React.ReactNode {
  const curr = parseBR(currVal);
  const prev = parseBR(prevVal);
  if (prev === 0) {
    return <span className="text-[9px] text-[#6b7280] font-['JetBrains_Mono',monospace]">sem comparativo</span>;
  }
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  const cls = pct >= 0 ? "text-[#4edea3]" : "text-[#f87171]";
  const arrow = pct >= 0 ? "▲" : "▼";
  return (
    <span className={`text-[9px] font-semibold font-['JetBrains_Mono',monospace] ${cls}`}>
      {arrow} {Math.abs(pct).toFixed(1)}% vs mês ant.
    </span>
  );
}

/* ══════════════════════════════════════════════════════════
   SECTION CARD
   ══════════════════════════════════════════════════════════ */

const SectionCard = ({
  title,
  icon,
  children,
  className = "",
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  badge?: string;
}) => (
  <div className={`bg-[#1d2027] border border-[#262a31] rounded-lg p-5 ${className}`}>
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-[0.08em]">
        {title}
      </h3>
      {badge && (
        <span className="ml-auto text-[10px] font-['JetBrains_Mono',monospace] bg-[rgba(0,165,114,.1)] text-[#00a572] px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */

export default function AtendimentoCliente() {
  // ── Period ──
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const monthSelectorRef = useRef<HTMLDivElement>(null);

  // ── Persistence ──
  const allDataRef = useRef<Record<string, PeriodData>>({});
  const [loaded, setLoaded] = useState(false);
  const currentKey = makeKey(selectedYear, selectedMonth);

  const storedDefaults = getDefaultPeriodData();

  // ── Form States (initialized with defaults) ──
  const [google, setGoogle] = useState<GoogleMetrics>(storedDefaults.google);
  const [totem, setTotem] = useState<TotemMetrics>(storedDefaults.totem);
  const [npsGoogle, setNpsGoogle] = useState<string>(storedDefaults.npsGoogle);
  const [reclamacoesPresenciais, setReclamacoesPresenciais] = useState<ReclamacaoPresencial[]>(storedDefaults.reclamacoesPresenciais);
  const [reclamacoesExternas, setReclamacoesExternas] = useState<string>(storedDefaults.reclamacoesExternas);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>(storedDefaults.sugestoes);
  const [planosAcao, setPlanosAcao] = useState<PlanoAcao[]>(storedDefaults.planosAcao);

  // Carregar dados do Supabase ao montar
  useEffect(() => {
    loadAllModuleData<PeriodData>(MODULO_NAME).then((data) => {
      allDataRef.current = data;
      setLoaded(true);
      const initStored = data[currentKey] || getDefaultPeriodData();
      setGoogle(initStored.google || storedDefaults.google);
      setTotem(initStored.totem || storedDefaults.totem);
      setNpsGoogle(initStored.npsGoogle || storedDefaults.npsGoogle);
      setReclamacoesPresenciais(initStored.reclamacoesPresenciais || storedDefaults.reclamacoesPresenciais);
      setReclamacoesExternas(initStored.reclamacoesExternas || storedDefaults.reclamacoesExternas);
      setSugestoes(initStored.sugestoes || storedDefaults.sugestoes);
      setPlanosAcao(initStored.planosAcao || storedDefaults.planosAcao);
    }).catch(() => {
      allDataRef.current = loadFromStorage();
      setLoaded(true);
    });
  }, []);

  // ── Section state ──
  const [_showNovaReclamacao, setShowNovaReclamacao] = useState(false);
  const [_showNovaSugestao, setShowNovaSugestao] = useState(false);
  const [_showNovoPlano, setShowNovoPlano] = useState(false);

  // ── Filters ──
  const [filtroStatus, setFiltroStatus] = useState<string>("Todos");
  const [buscaReclamacao, setBuscaReclamacao] = useState("");

  // ── Auto-save ──
  useEffect(() => {
    if (!loaded) return;
    const data: PeriodData = {
      google,
      totem,
      npsGoogle,
      reclamacoesPresenciais,
      reclamacoesExternas,
      sugestoes,
      planosAcao,
    };
    allDataRef.current[currentKey] = data;
    saveAllModuleData(MODULO_NAME, allDataRef.current);
  }, [google, totem, npsGoogle, reclamacoesPresenciais, reclamacoesExternas, sugestoes, planosAcao, currentKey, loaded]);

  // ── Snapshot & Load helpers ──
  const snapshotCurrent = useCallback(() => {
    const data: PeriodData = {
      google,
      totem,
      npsGoogle,
      reclamacoesPresenciais,
      reclamacoesExternas,
      sugestoes,
      planosAcao,
    };
    allDataRef.current[currentKey] = data;
    saveAllModuleData(MODULO_NAME, allDataRef.current);
  }, [google, totem, npsGoogle, reclamacoesPresenciais, reclamacoesExternas, sugestoes, planosAcao, currentKey]);

  const loadPeriod = useCallback((key: string) => {
    const stored = allDataRef.current[key];
    const d = getDefaultPeriodData();
    setGoogle(stored?.google || d.google);
    setTotem(stored?.totem || d.totem);
    setNpsGoogle(stored?.npsGoogle || d.npsGoogle);
    setReclamacoesPresenciais(stored?.reclamacoesPresenciais || d.reclamacoesPresenciais);
    setReclamacoesExternas(stored?.reclamacoesExternas || d.reclamacoesExternas);
    setSugestoes(stored?.sugestoes || d.sugestoes);
    setPlanosAcao(stored?.planosAcao || d.planosAcao);
    setShowNovaReclamacao(false);
    setShowNovaSugestao(false);
    setShowNovoPlano(false);
  }, []);

  const handleMonthSelect = useCallback((monthIdx: number) => {
    snapshotCurrent();
    setSelectedMonth(monthIdx);
    setShowMonthMenu(false);
    loadPeriod(makeKey(selectedYear, monthIdx));
  }, [snapshotCurrent, selectedYear, loadPeriod]);

  const handleYearChange = useCallback((delta: number) => {
    snapshotCurrent();
    const newY = selectedYear + delta;
    setSelectedYear(newY);
    loadPeriod(makeKey(newY, selectedMonth));
  }, [snapshotCurrent, selectedMonth, loadPeriod]);

  // ── Click outside month menu ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthSelectorRef.current && !monthSelectorRef.current.contains(e.target as Node)) {
        setShowMonthMenu(false);
      }
    };
    if (showMonthMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMonthMenu]);

  // ═══════════════════════════════════════════════════════
  // CALCULATIONS
  // ═══════════════════════════════════════════════════════

  const npsNum = parseBR(npsGoogle);
  const npsInfo = classificarNPS(npsNum);
  const notaGoogleNum = parseBR(google.notaMedia);
  const totemIdx = useMemo(() => {
    const total = parseBR(totem.totalAvaliacoes);
    const neg = parseBR(totem.negativas);
    if (total === 0) return 0;
    return ((total - neg) / total) * 100;
  }, [totem]);
  const presencialIdx = useMemo(() => calcAvaliacaoScore(reclamacoesPresenciais), [reclamacoesPresenciais]);
  const totalReclamacoes = parseBR(reclamacoesExternas) + reclamacoesPresenciais.length;
  const taxaResolucao = useMemo(() => calcTaxaResolucao(reclamacoesPresenciais), [reclamacoesPresenciais]);
  const satisfacaoGeral = useMemo(
    () => calcSatisfacaoGeral(npsNum, notaGoogleNum, totemIdx, presencialIdx),
    [npsNum, notaGoogleNum, totemIdx, presencialIdx]
  );

  // ── Previous month comparison ──
  const prevKey = selectedMonth === 0 ? makeKey(selectedYear - 1, 11) : makeKey(selectedYear, selectedMonth - 1);
  const prevData = allDataRef.current[prevKey];
  const prevNps = prevData ? parseBR(prevData.npsGoogle) : null;
  const prevNotaGoogle = prevData ? parseBR(prevData.google.notaMedia) : null;
  const prevTotemIdx = useMemo(() => {
    if (!prevData) return null;
    const t = prevData.totem;
    const total = parseBR(t.totalAvaliacoes);
    const neg = parseBR(t.negativas);
    if (total === 0) return 0;
    return ((total - neg) / total) * 100;
  }, [prevData]);

  // ── Alerts ──
  const alerts = useMemo(() => {
    const list: { tipo: "warn" | "danger" | "info"; msg: string }[] = [];
    if (prevNps !== null && npsNum < prevNps && npsNum !== 0) {
      list.push({ tipo: "warn", msg: `Queda no NPS detectada: ${fmtBR(prevNps)} → ${fmtBR(npsNum)}` });
    }
    const pendentes = reclamacoesPresenciais.filter((r) => r.status === "Pendente" || r.status === "Atrasada").length;
    if (pendentes > 0) {
      list.push({ tipo: "danger", msg: `Existem ${pendentes} reclamação(ões) pendente(s)/em atraso` });
    }
    if (prevTotemIdx !== null && totemIdx < prevTotemIdx && totemIdx !== 0) {
      list.push({ tipo: "warn", msg: `Queda na nota do Totem: ${fmtBR(prevTotemIdx)}% → ${fmtBR(totemIdx)}%` });
    }
    if (prevNotaGoogle !== null && notaGoogleNum < prevNotaGoogle && notaGoogleNum !== 0) {
      list.push({ tipo: "info", msg: `Nota Google diminuiu: ${fmtBR(prevNotaGoogle, 1)} → ${fmtBR(notaGoogleNum, 1)}` });
    }
    const atrasados = planosAcao.filter((p) => p.status === "Atrasado").length;
    if (atrasados > 0) {
      list.push({ tipo: "danger", msg: `${atrasados} plano(s) de ação em atraso` });
    }
    return list;
  }, [npsNum, prevNps, reclamacoesPresenciais, totemIdx, prevTotemIdx, notaGoogleNum, prevNotaGoogle, planosAcao]);

  // ═══════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════

  const handleGoogleChange = useCallback((field: keyof GoogleMetrics, val: string) => {
    setGoogle((prev) => ({ ...prev, [field]: val }));
  }, []);

  const handleTotemChange = useCallback((field: keyof TotemMetrics, val: string) => {
    setTotem((prev) => ({ ...prev, [field]: val }));
  }, []);

  // ── Reclamações Presenciais CRUD ──
  const addReclamacao = useCallback(() => {
    const nova: ReclamacaoPresencial = {
      id: crypto.randomUUID(),
      data: getTodayStr(),
      cliente: "",
      avaliacao: "",
      comentario: "",
      responsavel: "",
      status: "Pendente",
    };
    setReclamacoesPresenciais((prev) => [...prev, nova]);
    setShowNovaReclamacao(true);
  }, []);

  const updateReclamacao = useCallback((id: string, field: keyof ReclamacaoPresencial, val: string) => {
    setReclamacoesPresenciais((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  }, []);

  const removeReclamacao = useCallback((id: string) => {
    setReclamacoesPresenciais((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ── Sugestões CRUD ──
  const addSugestao = useCallback(() => {
    const nova: Sugestao = {
      id: crypto.randomUUID(),
      texto: "",
      origem: "Interna",
      data: getTodayStr(),
      status: "Recebida",
    };
    setSugestoes((prev) => [...prev, nova]);
    setShowNovaSugestao(true);
  }, []);

  const updateSugestao = useCallback((id: string, field: keyof Sugestao, val: string) => {
    setSugestoes((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: val } : s)));
  }, []);

  const removeSugestao = useCallback((id: string) => {
    setSugestoes((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Planos de Ação CRUD ──
  const addPlano = useCallback(() => {
    const novo: PlanoAcao = {
      id: crypto.randomUUID(),
      titulo: "",
      descricao: "",
      responsavel: "",
      prazo: "",
      prioridade: "media",
      status: "Planejado",
    };
    setPlanosAcao((prev) => [...prev, novo]);
    setShowNovoPlano(true);
  }, []);

  const updatePlano = useCallback((id: string, field: keyof PlanoAcao, val: string) => {
    setPlanosAcao((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  }, []);

  const removePlano = useCallback((id: string) => {
    setPlanosAcao((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ── Filtered reclamacoes ──
  const reclamacoesFiltradas = useMemo(() => {
    let list = [...reclamacoesPresenciais];
    if (filtroStatus !== "Todos") {
      list = list.filter((r) => r.status === filtroStatus);
    }
    if (buscaReclamacao.trim()) {
      const termo = buscaReclamacao.toLowerCase();
      list = list.filter(
        (r) =>
          r.cliente.toLowerCase().includes(termo) ||
          r.comentario.toLowerCase().includes(termo) ||
          r.responsavel.toLowerCase().includes(termo)
      );
    }
    return list;
  }, [reclamacoesPresenciais, filtroStatus, buscaReclamacao]);

  const monthLabel = `${MONTH_LABELS[selectedMonth]} ${selectedYear}`;

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#12141c] p-4 md:p-6 space-y-5">
      {/* ── HEADER + DATE SELECTOR ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[rgba(0,165,114,.12)] flex items-center justify-center">
            <Headphones size={18} className="text-[#00a572]" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-tight">
              Atendimento ao Cliente
            </h1>
            <p className="text-[10px] text-[#6b7280] font-['JetBrains_Mono',monospace] uppercase tracking-wider">
              Central de Experiência do Cliente (CX) & Qualidade
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="relative" ref={monthSelectorRef}>
          <button
            onClick={() => setShowMonthMenu(!showMonthMenu)}
            className="flex items-center gap-2 bg-[#1d2027] border border-[#262a31] rounded-md px-3 py-2 cursor-pointer hover:border-[#00a572] transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-[#00a572]" />
            <span className="text-[11px] font-semibold font-['JetBrains_Mono',monospace] text-white uppercase tracking-wider">
              {monthLabel}
            </span>
            <ChevronDown size={13} className="text-[#6b7280]" />
          </button>

          {showMonthMenu && (
            <div className="absolute right-0 top-full mt-2 bg-[#1d2027] border border-[#262a31] rounded-lg p-4 shadow-2xl z-50 w-[300px]">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => handleYearChange(-1)}
                  className="text-[11px] font-['JetBrains_Mono',monospace] text-[#9ca3af] hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#262a31]"
                >
                  &lt; Anterior
                </button>
                <span className="text-[12px] font-bold text-white font-['JetBrains_Mono',monospace]">
                  {selectedYear}
                </span>
                <button
                  onClick={() => handleYearChange(1)}
                  className="text-[11px] font-['JetBrains_Mono',monospace] text-[#9ca3af] hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#262a31]"
                >
                  Próximo &gt;
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleMonthSelect(idx)}
                    className={`text-[10px] font-['JetBrains_Mono',monospace] py-1.5 rounded transition-all ${
                      idx === selectedMonth
                        ? "bg-[#00a572] text-white font-bold"
                        : "text-[#9ca3af] hover:bg-[#262a31] hover:text-white"
                    }`}
                  >
                    {label.slice(0, 3).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ALERTS PANEL ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={`alert-${idx}`}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-[11px] font-['JetBrains_Mono',monospace] ${
                alert.tipo === "danger"
                  ? "bg-[rgba(248,113,113,.08)] border-[rgba(248,113,113,.25)] text-[#f87171]"
                  : alert.tipo === "warn"
                  ? "bg-[rgba(250,204,21,.08)] border-[rgba(250,204,21,.25)] text-[#facc15]"
                  : "bg-[rgba(96,212,247,.08)] border-[rgba(96,212,247,.25)] text-[#60d4f7]"
              }`}
            >
              <AlertTriangle size={14} />
              <span>{alert.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── DASHBOARD INDICATORS ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* NPS Google */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Star size={13} className="text-[#facc15]" />
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">NPS Google</span>
          </div>
          <div className="text-[22px] font-bold font-['JetBrains_Mono',monospace] text-white leading-none">
            {npsNum !== 0 ? fmtBR(npsNum, 0) : "\u2014"}
          </div>
          <div className={`text-[9px] font-semibold font-['JetBrains_Mono',monospace] mt-1 ${npsInfo.color}`}>
            {npsNum !== 0 ? npsInfo.label : "Sem dados"}
          </div>
          <div className={`absolute top-0 right-0 w-1 h-full ${npsInfo.semaforo}`} />
          {prevNps !== null && npsNum !== 0 && (
            <div className={`flex items-center gap-1 mt-2 text-[9px] font-['JetBrains_Mono',monospace] ${
              npsNum >= prevNps ? "text-[#4edea3]" : "text-[#f87171]"
            }`}>
              {npsNum >= prevNps ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              <span>{Math.abs(npsNum - prevNps).toFixed(0)} pts vs mês ant.</span>
            </div>
          )}
        </div>

        {/* Nota Média Google */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={13} className="text-[#60d4f7]" />
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">Nota Google</span>
          </div>
          <div className="text-[22px] font-bold font-['JetBrains_Mono',monospace] text-white leading-none">
            {notaGoogleNum > 0 ? fmtBR(notaGoogleNum) : "\u2014"}
          </div>
          <div className="text-[9px] text-[#6b7280] font-['JetBrains_Mono',monospace] mt-1">/ 5.0</div>
          <div className={`absolute top-0 right-0 w-1 h-full ${notaGoogleNum > 0 ? semaforoNotaClass(notaGoogleNum) : "bg-[#6b7280]"}`} />
          {prevNotaGoogle !== null && notaGoogleNum > 0 && (
            <div className={`flex items-center gap-1 mt-2 text-[9px] font-['JetBrains_Mono',monospace] ${
              notaGoogleNum >= prevNotaGoogle ? "text-[#4edea3]" : "text-[#f87171]"
            }`}>
              {notaGoogleNum >= prevNotaGoogle ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              <span>{Math.abs(notaGoogleNum - prevNotaGoogle).toFixed(1)} vs mês ant.</span>
            </div>
          )}
        </div>

        {/* Índice Totem */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Monitor size={13} className="text-[#a78bfa]" />
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">Índice Totem</span>
          </div>
          <div className="text-[22px] font-bold font-['JetBrains_Mono',monospace] text-white leading-none">
            {totemIdx > 0 ? `${fmtBR(totemIdx)}%` : "\u2014"}
          </div>
          <div className="text-[9px] text-[#6b7280] font-['JetBrains_Mono',monospace] mt-1">Satisfação</div>
          <div className={`absolute top-0 right-0 w-1 h-full ${totemIdx > 0 ? semaforoClass(totemIdx, 70, 40) : "bg-[#6b7280]"}`} />
        </div>

        {/* Índice Presencial */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck size={13} className="text-[#f59e0b]" />
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">Presencial</span>
          </div>
          <div className="text-[22px] font-bold font-['JetBrains_Mono',monospace] text-white leading-none">
            {presencialIdx > 0 ? `${fmtBR(presencialIdx)}%` : "\u2014"}
          </div>
          <div className="text-[9px] text-[#6b7280] font-['JetBrains_Mono',monospace] mt-1">Satisfação</div>
          <div className={`absolute top-0 right-0 w-1 h-full ${presencialIdx > 0 ? semaforoClass(presencialIdx, 70, 40) : "bg-[#6b7280]"}`} />
        </div>

        {/* Reclamações */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={13} className="text-[#f87171]" />
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">Reclamações</span>
          </div>
          <div className="text-[22px] font-bold font-['JetBrains_Mono',monospace] text-white leading-none">
            {totalReclamacoes}
          </div>
          <div className="text-[9px] text-[#6b7280] font-['JetBrains_Mono',monospace] mt-1">Total no mês</div>
          <div className={`absolute top-0 right-0 w-1 h-full ${
            totalReclamacoes === 0 ? "bg-[#4edea3]" : totalReclamacoes <= 3 ? "bg-[#facc15]" : "bg-[#f87171]"
          }`} />
        </div>

        {/* Taxa de Resolução */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={13} className="text-[#34d399]" />
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">Resolução</span>
          </div>
          <div className="text-[22px] font-bold font-['JetBrains_Mono',monospace] text-white leading-none">
            {reclamacoesPresenciais.length > 0 ? `${fmtBR(taxaResolucao, 0)}%` : "\u2014"}
          </div>
          <div className="text-[9px] text-[#6b7280] font-['JetBrains_Mono',monospace] mt-1">Taxa mensal</div>
          <div className={`absolute top-0 right-0 w-1 h-full ${semaforoClass(taxaResolucao, 80, 50)}`} />
        </div>

        {/* Satisfação Geral */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp size={13} className="text-[#00a572]" />
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">Satisfação</span>
          </div>
          <div className="text-[22px] font-bold font-['JetBrains_Mono',monospace] text-white leading-none">
            {satisfacaoGeral > 0 ? `${fmtBR(satisfacaoGeral, 0)}%` : "\u2014"}
          </div>
          <div className="text-[9px] text-[#6b7280] font-['JetBrains_Mono',monospace] mt-1">Índice geral</div>
          <div className={`absolute top-0 right-0 w-1 h-full ${satisfacaoGeral > 0 ? semaforoClass(satisfacaoGeral, 70, 40) : "bg-[#6b7280]"}`} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          DATA CAPTURE MODULES
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── GOOGLE MODULE ── */}
        <SectionCard title="Google Avaliações" icon={<Star size={14} className="text-[#facc15]" />}>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold mb-1 block">
                Nota Média Google
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={google.notaMedia}
                onChange={(e) => handleGoogleChange("notaMedia", e.target.value)}
                placeholder="Ex: 4.3"
                className="w-full bg-[#12141c] border border-[#262a31] rounded-md px-3 py-2 text-[12px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors"
              />
              {prevNotaGoogle !== null && google.notaMedia && (
                <div className="mt-1">
                  {calcDeltaHtml(google.notaMedia, String(prevNotaGoogle))}
                </div>
              )}
            </div>
            <div>
              <label className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold mb-1 block">
                Total de Avaliações
              </label>
              <input
                type="number"
                min="0"
                value={google.totalAvaliacoes}
                onChange={(e) => handleGoogleChange("totalAvaliacoes", e.target.value)}
                placeholder="Quantidade total"
                className="w-full bg-[#12141c] border border-[#262a31] rounded-md px-3 py-2 text-[12px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold mb-1 block">
                Avaliações Negativas
              </label>
              <input
                type="number"
                min="0"
                value={google.negativas}
                onChange={(e) => handleGoogleChange("negativas", e.target.value)}
                placeholder="Negativas recebidas"
                className="w-full bg-[#12141c] border border-[#262a31] rounded-md px-3 py-2 text-[12px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold mb-1 block">
                NPS Google (%)
              </label>
              <input
                type="number"
                min="-100"
                max="100"
                value={npsGoogle}
                onChange={(e) => setNpsGoogle(e.target.value)}
                placeholder="Ex: 72"
                className="w-full bg-[#12141c] border border-[#262a31] rounded-md px-3 py-2 text-[12px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors"
              />
              {prevNps !== null && npsGoogle && (
                <div className="mt-1">
                  {calcDeltaHtml(npsGoogle, String(prevNps))}
                </div>
              )}
            </div>
            {/* Mini summary */}
            <div className="bg-[#12141c] rounded-md p-3 border border-[#262a31]">
              <div className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold mb-2">
                Resumo Google
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-['JetBrains_Mono',monospace]">
                <div>
                  <span className="text-[#6b7280]">Avaliações: </span>
                  <span className="text-white font-semibold">{google.totalAvaliacoes || "0"}</span>
                </div>
                <div>
                  <span className="text-[#6b7280]">Negativas: </span>
                  <span className="text-[#f87171] font-semibold">{google.negativas || "0"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[#6b7280]">Negatividade: </span>
                  <span className={`font-semibold ${
                    parseBR(google.totalAvaliacoes) > 0 && parseBR(google.negativas) / parseBR(google.totalAvaliacoes) > 0.15
                      ? "text-[#f87171]"
                      : "text-[#4edea3]"
                  }`}>
                    {parseBR(google.totalAvaliacoes) > 0
                      ? `${fmtBR((parseBR(google.negativas) / parseBR(google.totalAvaliacoes)) * 100, 1)}%`
                      : "\u2014"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── TOTEM MODULE ── */}
        <SectionCard title="Totem da Pista" icon={<Monitor size={14} className="text-[#a78bfa]" />}>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold mb-1 block">
                Total de Avaliações (Totem)
              </label>
              <input
                type="number"
                min="0"
                value={totem.totalAvaliacoes}
                onChange={(e) => handleTotemChange("totalAvaliacoes", e.target.value)}
                placeholder="Avaliações recebidas"
                className="w-full bg-[#12141c] border border-[#262a31] rounded-md px-3 py-2 text-[12px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold mb-1 block">
                Avaliações Negativas (Totem)
              </label>
              <input
                type="number"
                min="0"
                value={totem.negativas}
                onChange={(e) => handleTotemChange("negativas", e.target.value)}
                placeholder="Negativas recebidas"
                className="w-full bg-[#12141c] border border-[#262a31] rounded-md px-3 py-2 text-[12px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors"
              />
            </div>
            {/* Totem Summary */}
            <div className="bg-[#12141c] rounded-md p-3 border border-[#262a31]">
              <div className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold mb-2">
                Resumo Totem
              </div>
              <div className="space-y-1.5 text-[10px] font-['JetBrains_Mono',monospace]">
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Índice de Satisfação:</span>
                  <span className={`font-bold ${totemIdx > 0 ? (totemIdx >= 70 ? "text-[#4edea3]" : totemIdx >= 40 ? "text-[#facc15]" : "text-[#f87171]") : "text-[#6b7280]"}`}>
                    {totemIdx > 0 ? `${fmtBR(totemIdx)}%` : "\u2014"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Avaliações Positivas:</span>
                  <span className="text-white font-semibold">
                    {parseBR(totem.totalAvaliacoes) > 0
                      ? Math.max(0, parseBR(totem.totalAvaliacoes) - parseBR(totem.negativas)).toFixed(0)
                      : "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Negatividade:</span>
                  <span className={`font-semibold ${
                    parseBR(totem.totalAvaliacoes) > 0 && parseBR(totem.negativas) / parseBR(totem.totalAvaliacoes) > 0.15
                      ? "text-[#f87171]"
                      : "text-[#4edea3]"
                  }`}>
                    {parseBR(totem.totalAvaliacoes) > 0
                      ? `${fmtBR((parseBR(totem.negativas) / parseBR(totem.totalAvaliacoes)) * 100, 1)}%`
                      : "\u2014"}
                  </span>
                </div>
              </div>
            </div>
            {/* Totem bar visualization */}
            {parseBR(totem.totalAvaliacoes) > 0 && (
              <div className="space-y-1">
                <div className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">
                  Distribuição
                </div>
                <div className="h-3 rounded-full bg-[#262a31] overflow-hidden flex">
                  <div
                    className="h-full bg-[#4edea3] transition-all duration-300"
                    style={{ width: `${((parseBR(totem.totalAvaliacoes) - parseBR(totem.negativas)) / parseBR(totem.totalAvaliacoes)) * 100}%` }}
                  />
                  <div
                    className="h-full bg-[#f87171] transition-all duration-300"
                    style={{ width: `${(parseBR(totem.negativas) / parseBR(totem.totalAvaliacoes)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-['JetBrains_Mono',monospace]">
                  <span className="text-[#4edea3]">
                    Positivas ({Math.max(0, parseBR(totem.totalAvaliacoes) - parseBR(totem.negativas)).toFixed(0)})
                  </span>
                  <span className="text-[#f87171]">
                    Negativas ({parseBR(totem.negativas).toFixed(0)})
                  </span>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── PRESENCIAL MODULE ── */}
        <SectionCard
          title="Atendimento Presencial"
          icon={<UserCheck size={14} className="text-[#f59e0b]" />}
          badge={`${reclamacoesPresenciais.length} registro(s)`}
        >
          <div className="space-y-3">
            <div>
              <label className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold mb-1 block">
                Reclamações Externas (Telefone/E-mail)
              </label>
              <input
                type="number"
                min="0"
                value={reclamacoesExternas}
                onChange={(e) => setReclamacoesExternas(e.target.value)}
                placeholder="Reclamações por outros canais"
                className="w-full bg-[#12141c] border border-[#262a31] rounded-md px-3 py-2 text-[12px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:border-[#00a572] focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={addReclamacao}
              className="w-full flex items-center justify-center gap-2 bg-[rgba(0,165,114,.1)] border border-[rgba(0,165,114,.25)] text-[#00a572] rounded-md px-3 py-2 text-[11px] font-semibold hover:bg-[rgba(0,165,114,.2)] transition-colors"
            >
              <Plus size={13} />
              Registrar Reclamação na Pista
            </button>
            {/* Presencial Summary */}
            <div className="bg-[#12141c] rounded-md p-3 border border-[#262a31]">
              <div className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold mb-2">
                Resumo Presencial
              </div>
              <div className="space-y-1.5 text-[10px] font-['JetBrains_Mono',monospace]">
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Total Registros:</span>
                  <span className="text-white font-bold">{reclamacoesPresenciais.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Pendentes:</span>
                  <span className="text-[#facc15] font-semibold">
                    {reclamacoesPresenciais.filter((r) => r.status === "Pendente").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Resolvidas:</span>
                  <span className="text-[#4edea3] font-semibold">
                    {reclamacoesPresenciais.filter((r) => r.status === "Resolvida").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Atrasadas:</span>
                  <span className="text-[#f87171] font-semibold">
                    {reclamacoesPresenciais.filter((r) => r.status === "Atrasada").length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ═══════════════════════════════════════════════════════
          COMPLAINTS TABLE
          ═══════════════════════════════════════════════════════ */}
      <SectionCard
        title="Registro de Reclamações na Pista"
        icon={<ClipboardList size={14} className="text-[#f87171]" />}
        badge={`${reclamacoesFiltradas.length} de ${reclamacoesPresenciais.length}`}
      >
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-2 bg-[#12141c] border border-[#262a31] rounded-md px-3 py-1.5 flex-1 min-w-[200px]">
            <Search size={12} className="text-[#6b7280]" />
            <input
              type="text"
              value={buscaReclamacao}
              onChange={(e) => setBuscaReclamacao(e.target.value)}
              placeholder="Buscar por cliente, comentário ou responsável..."
              className="bg-transparent border-none outline-none text-[11px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] flex-1"
            />
          </div>
          <div className="flex items-center gap-1">
            {["Todos", "Pendente", "Em andamento", "Resolvida", "Atrasada"].map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`text-[9px] font-['JetBrains_Mono',monospace] px-2.5 py-1 rounded-md transition-all ${
                  filtroStatus === status
                    ? "bg-[rgba(0,165,114,.15)] text-[#00a572] border border-[rgba(0,165,114,.3)]"
                    : "text-[#6b7280] hover:text-white border border-transparent"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {reclamacoesFiltradas.length === 0 ? (
          <div className="text-center py-8 text-[11px] text-[#6b7280] font-['JetBrains_Mono',monospace]">
            {reclamacoesPresenciais.length === 0
              ? "Nenhuma reclamação registrada. Clique em \"Registrar Reclamação na Pista\" para começar."
              : "Nenhum resultado encontrado com os filtros aplicados."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#262a31]">
                  <th className="text-left text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold py-2 px-2">Data</th>
                  <th className="text-left text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold py-2 px-2">Cliente</th>
                  <th className="text-left text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold py-2 px-2">Avaliação</th>
                  <th className="text-left text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold py-2 px-2">Comentário</th>
                  <th className="text-left text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold py-2 px-2">Responsável</th>
                  <th className="text-left text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold py-2 px-2">Status</th>
                  <th className="text-center text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold py-2 px-2 w-[60px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {reclamacoesFiltradas.map((r) => {
                  const avalColor = AVALIACAO_COLORS[r.avaliacao] || { text: "text-[#6b7280]", bg: "bg-transparent", dot: "bg-[#6b7280]" };
                  const statusColor = STATUS_COLORS[r.status] || STATUS_COLORS["Pendente"];
                  return (
                    <tr key={r.id} className="border-b border-[#262a31]/50 hover:bg-[#12141c]/50 transition-colors">
                      <td className="py-2 px-2">
                        <input
                          type="date"
                          value={r.data}
                          onChange={(e) => updateReclamacao(r.id, "data", e.target.value)}
                          className="bg-transparent border border-[#262a31] rounded px-1.5 py-1 text-[10px] font-['JetBrains_Mono',monospace] text-white focus:border-[#00a572] focus:outline-none w-[130px]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={r.cliente}
                          onChange={(e) => updateReclamacao(r.id, "cliente", e.target.value)}
                          placeholder="Nome do cliente"
                          className="bg-transparent border-b border-[#262a31] text-[10px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:border-[#00a572] focus:outline-none w-full py-1"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={r.avaliacao}
                          onChange={(e) => updateReclamacao(r.id, "avaliacao", e.target.value)}
                          className={`bg-transparent border border-[#262a31] rounded px-1.5 py-1 text-[10px] font-['JetBrains_Mono',monospace] ${avalColor.text} focus:border-[#00a572] focus:outline-none cursor-pointer`}
                        >
                          <option value="" className="bg-[#1d2027]">Selecione</option>
                          {AVALIACOES.map((a) => (
                            <option key={a} value={a} className="bg-[#1d2027]">{a}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={r.comentario}
                          onChange={(e) => updateReclamacao(r.id, "comentario", e.target.value)}
                          placeholder="Descreva o atendimento..."
                          className="bg-transparent border-b border-[#262a31] text-[10px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:border-[#00a572] focus:outline-none w-full py-1"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={r.responsavel}
                          onChange={(e) => updateReclamacao(r.id, "responsavel", e.target.value)}
                          placeholder="Responsável"
                          className="bg-transparent border-b border-[#262a31] text-[10px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:border-[#00a572] focus:outline-none w-full py-1"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={r.status}
                          onChange={(e) => updateReclamacao(r.id, "status", e.target.value)}
                          className={`bg-transparent border rounded px-1.5 py-1 text-[10px] font-['JetBrains_Mono',monospace] ${statusColor.text} ${statusColor.border} focus:border-[#00a572] focus:outline-none cursor-pointer`}
                        >
                          {["Pendente", "Em andamento", "Resolvida", "Atrasada"].map((s) => (
                            <option key={s} value={s} className="bg-[#1d2027]">{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => removeReclamacao(r.id)}
                          className="text-[#f87171] hover:text-[#fca5a5] transition-colors p-1 rounded hover:bg-[rgba(248,113,113,.1)]"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════
          SUGESTÕES & PLANOS DE AÇÃO
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── SUGESTÕES ── */}
        <SectionCard
          title="Sugestões de Melhoria"
          icon={<FileText size={14} className="text-[#60d4f7]" />}
          badge={`${sugestoes.length} registro(s)`}
        >
          <div className="space-y-3">
            <button
              onClick={addSugestao}
              className="w-full flex items-center justify-center gap-2 bg-[rgba(96,212,247,.08)] border border-[rgba(96,212,247,.2)] text-[#60d4f7] rounded-md px-3 py-2 text-[11px] font-semibold hover:bg-[rgba(96,212,247,.15)] transition-colors"
            >
              <Plus size={13} />
              Adicionar Sugestão
            </button>

            {sugestoes.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-[#6b7280] font-['JetBrains_Mono',monospace]">
                Nenhuma sugestão registrada.
              </div>
            ) : (
              <div className="space-y-2">
                {sugestoes.map((s) => {
                  const statusColor = STATUS_COLORS[s.status] || STATUS_COLORS["Recebida"];
                  return (
                    <div key={s.id} className="bg-[#12141c] border border-[#262a31] rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <input
                          type="text"
                          value={s.texto}
                          onChange={(e) => updateSugestao(s.id, "texto", e.target.value)}
                          placeholder="Descreva a sugestão..."
                          className="bg-transparent text-[11px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:outline-none flex-1 border-b border-[#262a31] focus:border-[#00a572] py-1"
                        />
                        <button
                          onClick={() => removeSugestao(s.id)}
                          className="text-[#f87171] hover:text-[#fca5a5] transition-colors p-1 rounded hover:bg-[rgba(248,113,113,.1)] shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={s.origem}
                          onChange={(e) => updateSugestao(s.id, "origem", e.target.value)}
                          className="bg-transparent border border-[#262a31] rounded px-2 py-1 text-[9px] font-['JetBrains_Mono',monospace] text-[#9ca3af] focus:border-[#00a572] focus:outline-none cursor-pointer"
                        >
                          {["Google", "Totem", "Presencial", "Interna"].map((o) => (
                            <option key={o} value={o} className="bg-[#1d2027]">{o}</option>
                          ))}
                        </select>
                        <select
                          value={s.status}
                          onChange={(e) => updateSugestao(s.id, "status", e.target.value)}
                          className={`bg-transparent border rounded px-2 py-1 text-[9px] font-['JetBrains_Mono',monospace] ${statusColor.text} ${statusColor.border} focus:border-[#00a572] focus:outline-none cursor-pointer`}
                        >
                          {["Recebida", "Analisando", "Implementada", "Recusada"].map((st) => (
                            <option key={st} value={st} className="bg-[#1d2027]">{st}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={s.data}
                          onChange={(e) => updateSugestao(s.id, "data", e.target.value)}
                          className="bg-transparent border border-[#262a31] rounded px-2 py-1 text-[9px] font-['JetBrains_Mono',monospace] text-[#9ca3af] focus:border-[#00a572] focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── PLANOS DE AÇÃO ── */}
        <SectionCard
          title="Planos de Ação"
          icon={<Target size={14} className="text-[#4edea3]" />}
          badge={`${planosAcao.length} registro(s)`}
        >
          <div className="space-y-3">
            <button
              onClick={addPlano}
              className="w-full flex items-center justify-center gap-2 bg-[rgba(78,222,163,.08)] border border-[rgba(78,222,163,.2)] text-[#4edea3] rounded-md px-3 py-2 text-[11px] font-semibold hover:bg-[rgba(78,222,163,.15)] transition-colors"
            >
              <Plus size={13} />
              Adicionar Plano de Ação
            </button>

            {planosAcao.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-[#6b7280] font-['JetBrains_Mono',monospace]">
                Nenhum plano de ação registrado.
              </div>
            ) : (
              <div className="space-y-2">
                {planosAcao.map((p) => {
                  const prioConfig = PRIORIDADE_CONFIG[p.prioridade];
                  const statusColor = STATUS_COLORS[p.status] || STATUS_COLORS["Planejado"];
                  return (
                    <div key={p.id} className="bg-[#12141c] border border-[#262a31] rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <input
                          type="text"
                          value={p.titulo}
                          onChange={(e) => updatePlano(p.id, "titulo", e.target.value)}
                          placeholder="Título do plano..."
                          className="bg-transparent text-[11px] font-semibold font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:outline-none flex-1 border-b border-[#262a31] focus:border-[#00a572] py-1"
                        />
                        <button
                          onClick={() => removePlano(p.id)}
                          className="text-[#f87171] hover:text-[#fca5a5] transition-colors p-1 rounded hover:bg-[rgba(248,113,113,.1)] shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={p.descricao}
                        onChange={(e) => updatePlano(p.id, "descricao", e.target.value)}
                        placeholder="Descrição detalhada..."
                        className="w-full bg-transparent text-[10px] font-['JetBrains_Mono',monospace] text-[#9ca3af] placeholder:text-[#3a3f4b] focus:outline-none border-b border-[#262a31] focus:border-[#00a572] py-1"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] text-[#6b7280] uppercase tracking-wider mb-0.5 block">Responsável</label>
                          <input
                            type="text"
                            value={p.responsavel}
                            onChange={(e) => updatePlano(p.id, "responsavel", e.target.value)}
                            placeholder="Nome"
                            className="w-full bg-transparent border border-[#262a31] rounded px-2 py-1 text-[9px] font-['JetBrains_Mono',monospace] text-white placeholder:text-[#3a3f4b] focus:border-[#00a572] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] text-[#6b7280] uppercase tracking-wider mb-0.5 block">Prazo</label>
                          <input
                            type="date"
                            value={p.prazo}
                            onChange={(e) => updatePlano(p.id, "prazo", e.target.value)}
                            className="w-full bg-transparent border border-[#262a31] rounded px-2 py-1 text-[9px] font-['JetBrains_Mono',monospace] text-white focus:border-[#00a572] focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={p.prioridade}
                          onChange={(e) => updatePlano(p.id, "prioridade", e.target.value)}
                          className={`bg-transparent border rounded px-2 py-1 text-[9px] font-['JetBrains_Mono',monospace] ${prioConfig.color} ${prioConfig.border} focus:border-[#00a572] focus:outline-none cursor-pointer`}
                        >
                          {Object.entries(PRIORIDADE_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key} className="bg-[#1d2027]">{cfg.label}</option>
                          ))}
                        </select>
                        <select
                          value={p.status}
                          onChange={(e) => updatePlano(p.id, "status", e.target.value)}
                          className={`bg-transparent border rounded px-2 py-1 text-[9px] font-['JetBrains_Mono',monospace] ${statusColor.text} ${statusColor.border} focus:border-[#00a572] focus:outline-none cursor-pointer`}
                        >
                          {["Planejado", "Em andamento", "Concluído", "Atrasado"].map((s) => (
                            <option key={s} value={s} className="bg-[#1d2027]">{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
