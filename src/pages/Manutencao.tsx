import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Wrench,
  Plus,
  Trash2,
  Fuel,
  Zap,
  Droplets,
  Search,
  Download,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Eye,
  Calendar,
  DollarSign,
  Settings,
  BarChart3,
} from "lucide-react";
import { loadAllModuleData, saveAllModuleData, MODULE_NAMES } from "../services/supabasePersistence";

/* TYPES */

interface Bico {
  id: string;
  identificacao: string;
  produto: string;
  status: "operando" | "em_manutencao" | "substituido";
}

interface Bomba {
  id: string;
  identificacao: string;
  qtdBicos: string;
  combustivel: string;
  status: "operando" | "em_manutencao" | "interditada";
  bicos: Bico[];
}

interface Manutencao {
  id: string;
  data: string;
  hora: string;
  equipamento: string;
  tipoManutencao: string;
  descricao: string;
  responsavel: string;
  valorPeca: string;
  valorMaoObra: string;
  categoria: "corretiva" | "preventiva";
  statusPreventiva: string;
  dataProgramada: string;
}

interface Gerador {
  id: string;
  data: string;
  horimetroInicial: string;
  horimetroFinal: string;
  litrosAbastecidos: string;
  responsavel: string;
  observacoes: string;
}

interface Limpeza {
  id: string;
  data: string;
  produto: string;
  quantidade: string;
  valorTotal: string;
  observacao: string;
}

interface PeriodData {
  bombas: Bomba[];
  manutencoes: Manutencao[];
  gerador: Gerador[];
  limpeza: Limpeza[];
  tetoOrcamentario: string;
}

/* CONSTANTS */

const STORAGE_KEY = "dadosManutencao";
const MODULO_NAME = MODULE_NAMES.MANUTENCAO;

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const STATUS_BOMBA: { value: string; label: string; color: string }[] = [
  { value: "operando", label: "Operando", color: "text-[#4edea3]" },
  { value: "em_manutencao", label: "Em manutenção", color: "text-[#facc15]" },
  { value: "interditada", label: "Interditada", color: "text-[#f87171]" },
];

const STATUS_BICO: { value: string; label: string; color: string }[] = [
  { value: "operando", label: "Operando", color: "text-[#4edea3]" },
  { value: "em_manutencao", label: "Em manutenção", color: "text-[#facc15]" },
  { value: "substituido", label: "Substituído", color: "text-[#60a5fa]" },
];

const STATUS_PREVENTIVA: { value: string; label: string; color: string }[] = [
  { value: "programada", label: "Programada", color: "text-[#60a5fa]" },
  { value: "em_andamento", label: "Em andamento", color: "text-[#facc15]" },
  { value: "concluida", label: "Concluída", color: "text-[#4edea3]" },
  { value: "atrasada", label: "Atrasada", color: "text-[#f87171]" },
];

const TIPOS_MANUTENCAO = [
  "Troca de mangueira",
  "Troca de bico",
  "Troca de visor",
  "Troca de filtro",
  "Vazamento",
  "Calibração",
  "Ajuste eletrônico",
  "Revisão preventiva",
  "Revisão corretiva",
  "Outros",
];

const PRODUTOS_LIMPEZA = [
  "Desengraxante",
  "Detergente",
  "Limpa vidro",
  "Papel toalha",
  "Sabão",
  "Álcool",
  "Produtos de limpeza pesada",
  "Outros",
];

const EQUIPAMENTOS = ["Bomba", "Bico", "Gerador", "Outros"];

/* HELPERS */

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

/* PERSISTENCE */

function getDefaultPeriodData(): PeriodData {
  return { bombas: [], manutencoes: [], gerador: [], limpeza: [], tetoOrcamentario: "" };
}

function loadFromStorage(): Record<string, PeriodData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveToStorage(_data: Record<string, PeriodData>): void {
  /* salvar via Supabase — ver persistência no componente */
}

/* REUSABLE */

const SectionCard = ({ title, icon, children, className = "" }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string;
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

export default function Manutencao() {
  // Period State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const monthSelectorRef = useRef<HTMLDivElement>(null);

  // Persistence
  const allDataRef = useRef<Record<string, PeriodData>>({});
  const [loaded, setLoaded] = useState(false);
  const currentKey = makeKey(selectedYear, selectedMonth);

  // Form States (initialized with defaults, updated after load)
  const defaults = getDefaultPeriodData();

  const [bombas, setBombas] = useState<Bomba[]>(defaults.bombas);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>(defaults.manutencoes);
  const [gerador, setGerador] = useState<Gerador[]>(defaults.gerador);
  const [limpeza, setLimpeza] = useState<Limpeza[]>(defaults.limpeza);
  const [tetoOrcamentario, setTetoOrcamentario] = useState(defaults.tetoOrcamentario);

  // Carregar dados do Supabase ao montar
  useEffect(() => {
    loadAllModuleData<PeriodData>(MODULO_NAME).then((data) => {
      allDataRef.current = data;
      setLoaded(true);
      const initStored = data[currentKey] || getDefaultPeriodData();
      setBombas(initStored.bombas);
      setManutencoes(initStored.manutencoes);
      setGerador(initStored.gerador);
      setLimpeza(initStored.limpeza);
      setTetoOrcamentario(initStored.tetoOrcamentario);
    }).catch(() => {
      allDataRef.current = loadFromStorage();
      setLoaded(true);
    });
  }, []);

  // UI State
  const [expandedBomba, setExpandedBomba] = useState<string | null>(null);
  const [showBombaModal, setShowBombaModal] = useState<string | null>(null);
  const [showBicoModal, setShowBicoModal] = useState<{ bombaId: string; bicoId: string } | null>(null);
  const [manutTab, setManutTab] = useState<"corretivas" | "preventivas">("corretivas");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEquipamento, setFilterEquipamento] = useState("");

  // Auto-save via Supabase
  useEffect(() => {
    if (!loaded) return;
    const data: PeriodData = { bombas, manutencoes, gerador, limpeza, tetoOrcamentario };
    allDataRef.current[currentKey] = data;
    saveAllModuleData(MODULO_NAME, allDataRef.current);
  }, [bombas, manutencoes, gerador, limpeza, tetoOrcamentario, currentKey, loaded]);

  const monthLabel = `${MONTH_LABELS[selectedMonth]} ${selectedYear}`;

  const snapshotCurrent = useCallback(() => {
    const data: PeriodData = { bombas, manutencoes, gerador, limpeza, tetoOrcamentario };
    allDataRef.current[currentKey] = data;
    saveAllModuleData(MODULO_NAME, allDataRef.current);
  }, [bombas, manutencoes, gerador, limpeza, tetoOrcamentario, currentKey]);

  const loadPeriod = useCallback((key: string) => {
    const stored = allDataRef.current[key];
    const d = getDefaultPeriodData();
    setBombas(stored?.bombas || d.bombas);
    setManutencoes(stored?.manutencoes || d.manutencoes);
    setGerador(stored?.gerador || d.gerador);
    setLimpeza(stored?.limpeza || d.limpeza);
    setTetoOrcamentario(stored?.tetoOrcamentario || d.tetoOrcamentario);
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
    };
    if (showMonthMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMonthMenu]);

  /* CALCULATIONS */

  const calculos = useMemo(() => {
    const totalManutencoes = manutencoes.length;
    const corretivas = manutencoes.filter((m) => m.categoria === "corretiva").length;
    const preventivasCount = manutencoes.filter((m) => m.categoria === "preventiva").length;
    const pendentes = manutencoes.filter(
      (m) => m.categoria === "preventiva" && m.statusPreventiva !== "concluida"
    ).length;
    const concluidas = manutencoes.filter(
      (m) => m.categoria === "preventiva" && m.statusPreventiva === "concluida"
    ).length;

    const custoManutencao = manutencoes.reduce(
      (acc, m) => acc + parseBR(m.valorPeca) + parseBR(m.valorMaoObra), 0
    );
    const custoLimpeza = limpeza.reduce((acc, l) => acc + parseBR(l.valorTotal), 0);
    const gastoTotal = custoManutencao + custoLimpeza;

    const equipEmManutencao =
      bombas.filter((b) => b.status === "em_manutencao").length +
      bombas.reduce(
        (acc, b) => acc + b.bicos.filter((bi) => bi.status === "em_manutencao").length, 0
      );

    const totalHoras = gerador.reduce(
      (acc, g) => acc + (parseBR(g.horimetroFinal) - parseBR(g.horimetroInicial)), 0
    );
    const totalLitros = gerador.reduce((acc, g) => acc + parseBR(g.litrosAbastecidos), 0);
    const consumoMedio = totalHoras > 0 ? totalLitros / totalHoras : 0;

    const teto = parseBR(tetoOrcamentario);
    const saldo = teto - gastoTotal;
    const pctUtilizacao = teto > 0 ? (gastoTotal / teto) * 100 : 0;
    let semaforoGasto: "normal" | "atencao" | "critico" = "normal";
    if (teto > 0) {
      if (pctUtilizacao > 100) semaforoGasto = "critico";
      else if (pctUtilizacao > 80) semaforoGasto = "atencao";
    }

    const anoAtual = selectedYear;
    let gastoLimpezaAno = 0;
    const contagemProdutos: Record<string, number> = {};
    Object.keys(allDataRef.current).forEach((key) => {
      if (key.startsWith(String(anoAtual))) {
        const d = allDataRef.current[key];
        if (d?.limpeza) {
          gastoLimpezaAno += d.limpeza.reduce((a, l) => a + parseBR(l.valorTotal), 0);
          d.limpeza.forEach((l) => {
            contagemProdutos[l.produto] = (contagemProdutos[l.produto] || 0) + 1;
          });
        }
      }
    });
    const produtoMaisConsumido =
      Object.entries(contagemProdutos).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    const ultimoGerador =
      gerador.length > 0
        ? gerador.reduce((latest, g) => (g.data > latest.data ? g : latest))
        : null;

    return {
      totalManutencoes, corretivas, preventivasCount, pendentes, concluidas,
      custoManutencao, custoLimpeza, gastoTotal, equipEmManutencao,
      totalHoras, totalLitros, consumoMedio, teto, saldo, pctUtilizacao,
      semaforoGasto, gastoLimpezaAno, produtoMaisConsumido, ultimoGerador,
    };
  }, [manutencoes, limpeza, gerador, bombas, tetoOrcamentario, selectedYear]);

  /* BOMBAS HANDLERS */

  const addBomba = useCallback(() => {
    setBombas((prev) => [
      ...prev,
      { id: crypto.randomUUID(), identificacao: "", qtdBicos: "4", combustivel: "", status: "operando", bicos: [] },
    ]);
  }, []);

  const removeBomba = useCallback((id: string) => {
    setBombas((prev) => prev.filter((b) => b.id !== id));
    if (expandedBomba === id) setExpandedBomba(null);
  }, [expandedBomba]);

  const handleBombaChange = useCallback((id: string, field: keyof Bomba, val: string) => {
    setBombas((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: val } : b)));
  }, []);

  const addBico = useCallback((bombaId: string) => {
    setBombas((prev) =>
      prev.map((b) =>
        b.id === bombaId
          ? {
              ...b,
              bicos: [
                ...b.bicos,
                { id: crypto.randomUUID(), identificacao: `Bico ${b.bicos.length + 1}`, produto: b.combustivel || "", status: "operando" as const },
              ],
            }
          : b
      )
    );
  }, []);

  const removeBico = useCallback((bombaId: string, bicoId: string) => {
    setBombas((prev) =>
      prev.map((b) => (b.id === bombaId ? { ...b, bicos: b.bicos.filter((bi) => bi.id !== bicoId) } : b))
    );
  }, []);

  const handleBicoChange = useCallback((bombaId: string, bicoId: string, field: keyof Bico, val: string) => {
    setBombas((prev) =>
      prev.map((b) =>
        b.id === bombaId
          ? { ...b, bicos: b.bicos.map((bi) => (bi.id === bicoId ? { ...bi, [field]: val } : bi)) }
          : b
      )
    );
  }, []);

  /* MANUTENÇÃO HANDLERS */

  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();

  const addManutencao = useCallback((cat: "corretiva" | "preventiva") => {
    setManutencoes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(), data: todayStr, hora: "", equipamento: "",
        tipoManutencao: "", descricao: "", responsavel: "", valorPeca: "",
        valorMaoObra: "", categoria: cat,
        statusPreventiva: cat === "preventiva" ? "programada" : "",
        dataProgramada: "",
      },
    ]);
  }, [todayStr]);

  const removeManutencao = useCallback((id: string) => {
    setManutencoes((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleManutChange = useCallback((id: string, field: keyof Manutencao, val: string) => {
    setManutencoes((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: val } : m)));
  }, []);

  const manutencoesFiltradas = useMemo(() => {
    return manutencoes.filter((m) => {
      const matchSearch = !searchTerm ||
        m.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.equipamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.responsavel.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTipo = !filterTipo || m.tipoManutencao === filterTipo;
      const matchStatus = !filterStatus ||
        (m.categoria === "preventiva" && m.statusPreventiva === filterStatus);
      const matchEquip = !filterEquipamento || m.equipamento === filterEquipamento;
      return matchSearch && matchTipo && matchStatus && matchEquip;
    });
  }, [manutencoes, searchTerm, filterTipo, filterStatus, filterEquipamento]);

  /* GERADOR HANDLERS */

  const addGerador = useCallback(() => {
    setGerador((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(), data: todayStr, horimetroInicial: "",
        horimetroFinal: "", litrosAbastecidos: "", responsavel: "", observacoes: "",
      },
    ]);
  }, [todayStr]);

  const removeGerador = useCallback((id: string) => {
    setGerador((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const handleGeradorChange = useCallback((id: string, field: keyof Gerador, val: string) => {
    setGerador((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: val } : g)));
  }, []);

  /* LIMPEZA HANDLERS */

  const addLimpeza = useCallback(() => {
    setLimpeza((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(), data: todayStr, produto: "",
        quantidade: "", valorTotal: "", observacao: "",
      },
    ]);
  }, [todayStr]);

  const removeLimpeza = useCallback((id: string) => {
    setLimpeza((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleLimpezaChange = useCallback((id: string, field: keyof Limpeza, val: string) => {
    setLimpeza((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: val } : l)));
  }, []);

  /* EXPORT REPORT */

  const exportReport = useCallback(() => {
    const lines: string[] = [];
    lines.push(`RELATÓRIO DE MANUTENÇÃO — ${monthLabel}`);
    lines.push(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);
    lines.push("");
    lines.push("═══ RESUMO ═══");
    lines.push(`Manutenções realizadas: ${calculos.totalManutencoes}`);
    lines.push(`Custo manutenção: ${fmtR(calculos.custoManutencao)}`);
    lines.push(`Custo limpeza: ${fmtR(calculos.custoLimpeza)}`);
    lines.push(`Gasto total: ${fmtR(calculos.gastoTotal)}`);
    if (calculos.teto > 0) {
      lines.push(`Teto orçamentário: ${fmtR(calculos.teto)}`);
      lines.push(`Saldo: ${fmtR(calculos.saldo)}`);
      lines.push(`Utilização: ${calculos.pctUtilizacao.toFixed(1)}%`);
    }
    lines.push("");
    lines.push("═══ MANUTENÇÕES ═══");
    manutencoes.forEach((m) => {
      lines.push(`${m.data} | ${m.equipamento} | ${m.tipoManutencao} | ${m.descricao} | ${fmtR(parseBR(m.valorPeca) + parseBR(m.valorMaoObra))}`);
    });
    lines.push("");
    lines.push("═══ GERADOR ═══");
    gerador.forEach((g) => {
      const horas = parseBR(g.horimetroFinal) - parseBR(g.horimetroInicial);
      const cons = horas > 0 ? parseBR(g.litrosAbastecidos) / horas : 0;
      lines.push(`${g.data} | ${horas.toFixed(1)}h | ${parseBR(g.litrosAbastecidos).toFixed(1)}L | ${cons.toFixed(2)} L/h`);
    });
    lines.push("");
    lines.push("═══ LIMPEZA ═══");
    limpeza.forEach((l) => {
      lines.push(`${l.data} | ${l.produto} | ${l.quantidade} | ${fmtR(parseBR(l.valorTotal))}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-manutencao-${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [manutencoes, gerador, limpeza, calculos, monthLabel, selectedYear, selectedMonth]);

  /* BOMBA / BICO HISTORY MODALS */

  const bombaHistorico = useMemo(() => {
    if (!showBombaModal) return null;
    const bomba = bombas.find((b) => b.id === showBombaModal);
    if (!bomba) return null;
    const ocorrencias = manutencoes.filter(
      (m) => m.equipamento === bomba.identificacao || m.descricao.toLowerCase().includes(bomba.identificacao.toLowerCase())
    );
    const custoTotal = ocorrencias.reduce((a, m) => a + parseBR(m.valorPeca) + parseBR(m.valorMaoObra), 0);
    const ultimaData = ocorrencias.length > 0
      ? ocorrencias.sort((a, b) => b.data.localeCompare(a.data))[0].data : null;
    return { bomba, ocorrencias, custoTotal, ultimaData };
  }, [showBombaModal, bombas, manutencoes]);

  const bicoHistorico = useMemo(() => {
    if (!showBicoModal) return null;
    const bomba = bombas.find((b) => b.id === showBicoModal.bombaId);
    const bico = bomba?.bicos.find((bi) => bi.id === showBicoModal.bicoId);
    if (!bico) return null;
    const ocorrencias = manutencoes.filter(
      (m) => m.descricao.toLowerCase().includes(bico.identificacao.toLowerCase()) || m.equipamento === "Bico"
    );
    const custoTotal = ocorrencias.reduce((a, m) => a + parseBR(m.valorPeca) + parseBR(m.valorMaoObra), 0);
    const ultimaData = ocorrencias.length > 0
      ? ocorrencias.sort((a, b) => b.data.localeCompare(a.data))[0].data : null;
    return { bico, ocorrencias, custoTotal, ultimaData };
  }, [showBicoModal, bombas, manutencoes]);

  /* RENDER */

  return (
    <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-5">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between pb-4 border-b border-[#262a31]">
        <div>
          <h1 className="text-[20px] font-bold text-white tracking-[-0.3px]">
            Manutenção
          </h1>
          <p className="text-[11px] text-[#9ca3af] mt-1">
            Central de Controle de Manutenção e Custos Operacionais
          </p>
        </div>

        {/* Date Selector */}
        <div className="relative" ref={monthSelectorRef}>
          <button
            onClick={() => setShowMonthMenu(!showMonthMenu)}
            className="flex items-center gap-2 bg-[#1d2027] border border-[#262a31] rounded-md px-3 py-2 cursor-pointer hover:border-[#00a572] transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-[#00a572] shrink-0" />
            <span className="text-[11px] font-semibold text-white font-['JetBrains_Mono',monospace] uppercase tracking-wider">
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
                  className="text-[11px] text-[#9ca3af] hover:text-white font-semibold px-2 py-1 rounded hover:bg-[#262a31] transition-colors"
                >
                  &lt; Anterior
                </button>
                <span className="text-[12px] font-bold text-white font-['JetBrains_Mono',monospace]">
                  {selectedYear}
                </span>
                <button
                  onClick={() => handleYearChange(selectedYear + 1)}
                  className="text-[11px] text-[#9ca3af] hover:text-white font-semibold px-2 py-1 rounded hover:bg-[#262a31] transition-colors"
                >
                  Próximo &gt;
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1 p-2">
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

      {/* ── DASHBOARD ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Manutenções */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench size={14} className="text-[#00a572]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Manutenções</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[22px] font-bold text-white font-['JetBrains_Mono',monospace]">
              {calculos.totalManutencoes}
            </span>
            <span className="text-[10px] text-[#6b7280] mt-1">total</span>
          </div>
          <div className="flex gap-2 text-[10px] text-[#9ca3af] mt-2">
            <span>📋 {calculos.corretivas} corr.</span>
            <span>🔧 {calculos.preventivasCount} prev.</span>
          </div>
          <div className="flex gap-2 text-[10px] mt-1">
            <span className="text-[#facc15]">⏳ {calculos.pendentes} pend.</span>
            <span className="text-[#4edea3]">✅ {calculos.concluidas} conc.</span>
          </div>
        </div>

        {/* Equipamentos em Manutenção */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={14} className="text-[#facc15]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Equip. Manut.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[22px] font-bold text-white font-['JetBrains_Mono',monospace]">
              {calculos.equipEmManutencao}
            </span>
            <span className="text-[20px]">
              {calculos.equipEmManutencao === 0 ? "🟢" : calculos.equipEmManutencao <= 2 ? "🟡" : "🔴"}
            </span>
          </div>
          <p className="text-[10px] text-[#6b7280] mt-1">bicos + bombas</p>
        </div>

        {/* Gasto Total */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-[#f87171]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Gasto Total</span>
          </div>
          <span className="text-[18px] font-bold text-white font-['JetBrains_Mono',monospace]">
            {fmtR(calculos.gastoTotal)}
          </span>
          <p className="text-[10px] text-[#6b7280] mt-1">manut. {fmtR(calculos.custoManutencao)}</p>
          <p className="text-[10px] text-[#6b7280]">limpeza {fmtR(calculos.custoLimpeza)}</p>
        </div>

        {/* Gerador */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-[#60a5fa]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Gerador</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[22px] font-bold text-white font-['JetBrains_Mono',monospace]">
              {fmtBR(calculos.totalHoras, 1)}
            </span>
            <span className="text-[10px] text-[#6b7280]">horas</span>
          </div>
          <p className="text-[10px] text-[#60a5fa] mt-1">⚡ {fmtBR(calculos.consumoMedio, 2)} L/h</p>
          <p className="text-[10px] text-[#6b7280]">💧 {fmtBR(calculos.totalLitros, 1)} L total</p>
        </div>

        {/* Teto Orçamentário */}
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4 col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-[#00a572]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Teto Orçamentário</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-[#6b7280]">Teto mensal:</span>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#6b7280] font-['JetBrains_Mono',monospace]">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={tetoOrcamentario}
                onChange={(e) => setTetoOrcamentario(e.target.value)}
                placeholder="5.000,00"
                className="bg-[#12141c] border border-[#262a31] rounded pl-8 pr-2 py-1.5 text-[12px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[140px]"
              />
            </div>
          </div>
          {calculos.teto > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-[#6b7280]">Gasto</p>
                <p className="text-[14px] font-bold text-white font-['JetBrains_Mono',monospace]">{fmtR(calculos.gastoTotal)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#6b7280]">Saldo</p>
                <p className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${calculos.saldo >= 0 ? "text-[#4edea3]" : "text-[#f87171]"}`}>
                  {fmtR(calculos.saldo)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#6b7280]">Utilização</p>
                <p className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${calculos.pctUtilizacao <= 80 ? "text-[#4edea3]" : calculos.pctUtilizacao <= 100 ? "text-[#facc15]" : "text-[#f87171]"}`}>
                  {calculos.pctUtilizacao.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
          {calculos.teto > 0 && (
            <div className="mt-2 h-2 bg-[#12141c] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${calculos.pctUtilizacao <= 80 ? "bg-[#4edea3]" : calculos.pctUtilizacao <= 100 ? "bg-[#facc15]" : "bg-[#f87171]"}`}
                style={{ width: `${Math.min(calculos.pctUtilizacao, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── BOMBAS E BICOS ── */}
      <SectionCard title="Controle de Bombas e Bicos" icon={<Fuel size={15} className="text-[#00a572]" />}>
        <div className="flex justify-end mb-3">
          <button onClick={addBomba} className="flex items-center gap-1.5 bg-[rgba(0,165,114,.1)] border border-[rgba(0,165,114,.3)] rounded-md px-3 py-1.5 text-[11px] font-semibold text-[#00a572] hover:bg-[rgba(0,165,114,.2)] transition-colors">
            <Plus size={13} /> Adicionar Bomba
          </button>
        </div>
        {bombas.length === 0 && (
          <p className="text-[12px] text-[#6b7280] text-center py-6">
            Nenhuma bomba cadastrada. Clique em "Adicionar Bomba" para começar.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {bombas.map((bomba) => {
            const statusConf = STATUS_BOMBA.find((s) => s.value === bomba.status);
            const isExpanded = expandedBomba === bomba.id;
            return (
              <div key={bomba.id} className="bg-[#12141c] border border-[#262a31] rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setExpandedBomba(isExpanded ? null : bomba.id)} className="text-[#6b7280] hover:text-white transition-colors">
                    <ChevronDown size={14} style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                  </button>
                  <input type="text" value={bomba.identificacao} onChange={(e) => handleBombaChange(bomba.id, "identificacao", e.target.value)} placeholder="Identificação" className="bg-transparent border-b border-[#262a31] text-[13px] text-white font-semibold focus:border-[#00a572] focus:outline-none transition-colors w-[140px]" />
                  <input type="number" value={bomba.qtdBicos} onChange={(e) => handleBombaChange(bomba.id, "qtdBicos", e.target.value)} placeholder="Qtd" className="bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[50px] text-center" />
                  <span className="text-[10px] text-[#6b7280]">bicos</span>
                  <input type="text" value={bomba.combustivel} onChange={(e) => handleBombaChange(bomba.id, "combustivel", e.target.value)} placeholder="Combustível" className="bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors w-[120px]" />
                  <select value={bomba.status} onChange={(e) => handleBombaChange(bomba.id, "status", e.target.value)} className={`bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] font-semibold focus:border-[#00a572] focus:outline-none transition-colors cursor-pointer ${statusConf?.color || "text-white"}`}>
                    {STATUS_BOMBA.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                  </select>
                  <button onClick={() => setShowBombaModal(bomba.id)} className="text-[#6b7280] hover:text-[#60a5fa] transition-colors ml-auto" title="Histórico"><Eye size={14} /></button>
                  <button onClick={() => removeBomba(bomba.id)} className="text-[#6b7280] hover:text-[#f87171] transition-colors" title="Remover"><Trash2 size={14} /></button>
                </div>
                {isExpanded && (
                  <div className="border-t border-[#262a31] px-4 py-3 bg-[#1d2027]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">Bicos da {bomba.identificacao || "Bomba"}</span>
                      <button onClick={() => addBico(bomba.id)} className="flex items-center gap-1 text-[10px] text-[#00a572] hover:text-[#4edea3] font-semibold transition-colors"><Plus size={11} /> Bico</button>
                    </div>
                    {bomba.bicos.length === 0 ? (
                      <p className="text-[11px] text-[#6b7280] py-2">Nenhum bico cadastrado.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {bomba.bicos.map((bico) => {
                          const bicoStatus = STATUS_BICO.find((s) => s.value === bico.status);
                          return (
                            <div key={bico.id} className="flex items-center gap-2 bg-[#12141c] border border-[#262a31] rounded px-3 py-2">
                              <input type="text" value={bico.identificacao} onChange={(e) => handleBicoChange(bomba.id, bico.id, "identificacao", e.target.value)} className="bg-transparent text-[11px] text-white font-medium focus:outline-none w-[100px]" />
                              <input type="text" value={bico.produto} onChange={(e) => handleBicoChange(bomba.id, bico.id, "produto", e.target.value)} placeholder="Produto" className="bg-transparent border-b border-[#262a31] text-[10px] text-[#9ca3af] focus:border-[#00a572] focus:outline-none w-[90px]" />
                              <select value={bico.status} onChange={(e) => handleBicoChange(bomba.id, bico.id, "status", e.target.value)} className={`bg-transparent text-[10px] font-semibold focus:outline-none cursor-pointer ${bicoStatus?.color || "text-white"}`}>
                                {STATUS_BICO.map((s) => (<option key={s.value} value={s.value} className="bg-[#1d2027]">{s.label}</option>))}
                              </select>
                              <button onClick={() => setShowBicoModal({ bombaId: bomba.id, bicoId: bico.id })} className="text-[#6b7280] hover:text-[#60a5fa] transition-colors" title="Histórico"><Eye size={12} /></button>
                              <button onClick={() => removeBico(bomba.id, bico.id)} className="text-[#6b7280] hover:text-[#f87171] transition-colors" title="Remover"><Trash2 size={12} /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Histórico Bomba Modal ── */}
        {showBombaModal && bombaHistorico && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowBombaModal(null)}>
            <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-5 w-full max-w-md max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-white">Histórico — {bombaHistorico.bomba.identificacao || "Bomba"}</h3>
                <button onClick={() => setShowBombaModal(null)} className="text-[#6b7280] hover:text-white"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#12141c] rounded p-3">
                  <p className="text-[10px] text-[#6b7280]">Última Manutenção</p>
                  <p className="text-[13px] text-white font-semibold font-['JetBrains_Mono',monospace]">{bombaHistorico.ultimaData || "—"}</p>
                </div>
                <div className="bg-[#12141c] rounded p-3">
                  <p className="text-[10px] text-[#6b7280]">Custo Acumulado</p>
                  <p className="text-[13px] text-[#f87171] font-semibold font-['JetBrains_Mono',monospace]">{fmtR(bombaHistorico.custoTotal)}</p>
                </div>
              </div>
              <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">Ocorrências ({bombaHistorico.ocorrencias.length})</p>
              {bombaHistorico.ocorrencias.length === 0 ? (
                <p className="text-[11px] text-[#6b7280]">Nenhuma ocorrência registrada.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {bombaHistorico.ocorrencias.map((o) => (
                    <div key={o.id} className="bg-[#12141c] rounded px-3 py-2">
                      <div className="flex justify-between">
                        <span className="text-[11px] text-white">{o.tipoManutencao}</span>
                        <span className="text-[10px] text-[#6b7280] font-['JetBrains_Mono',monospace]">{o.data}</span>
                      </div>
                      <p className="text-[10px] text-[#9ca3af] mt-0.5">{o.descricao}</p>
                      <p className="text-[10px] text-[#f87171] font-['JetBrains_Mono',monospace]">{fmtR(parseBR(o.valorPeca) + parseBR(o.valorMaoObra))}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Histórico Bico Modal ── */}
        {showBicoModal && bicoHistorico && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowBicoModal(null)}>
            <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-5 w-full max-w-md max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-white">Histórico — {bicoHistorico.bico.identificacao}</h3>
                <button onClick={() => setShowBicoModal(null)} className="text-[#6b7280] hover:text-white"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#12141c] rounded p-3">
                  <p className="text-[10px] text-[#6b7280]">Última Manutenção</p>
                  <p className="text-[13px] text-white font-semibold font-['JetBrains_Mono',monospace]">{bicoHistorico.ultimaData || "—"}</p>
                </div>
                <div className="bg-[#12141c] rounded p-3">
                  <p className="text-[10px] text-[#6b7280]">Custo Acumulado</p>
                  <p className="text-[13px] text-[#f87171] font-semibold font-['JetBrains_Mono',monospace]">{fmtR(bicoHistorico.custoTotal)}</p>
                </div>
              </div>
              <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">Ocorrências ({bicoHistorico.ocorrencias.length})</p>
              {bicoHistorico.ocorrencias.length === 0 ? (
                <p className="text-[11px] text-[#6b7280]">Nenhuma ocorrência registrada.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {bicoHistorico.ocorrencias.map((o) => (
                    <div key={o.id} className="bg-[#12141c] rounded px-3 py-2">
                      <div className="flex justify-between">
                        <span className="text-[11px] text-white">{o.tipoManutencao}</span>
                        <span className="text-[10px] text-[#6b7280] font-['JetBrains_Mono',monospace]">{o.data}</span>
                      </div>
                      <p className="text-[10px] text-[#9ca3af] mt-0.5">{o.descricao}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── MANUTENÇÕES ── */}
      <SectionCard title="Registro de Manutenções" icon={<Wrench size={15} className="text-[#00a572]" />}>
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-[#12141c] rounded-lg p-1">
          <button onClick={() => setManutTab("corretivas")} className={`flex-1 py-2 rounded-md text-[11px] font-semibold transition-colors ${manutTab === "corretivas" ? "bg-[#1d2027] text-[#00a572] border border-[rgba(0,165,114,.3)]" : "text-[#6b7280] hover:text-[#9ca3af]"}`}>
            Corretivas / Registradas
          </button>
          <button onClick={() => setManutTab("preventivas")} className={`flex-1 py-2 rounded-md text-[11px] font-semibold transition-colors ${manutTab === "preventivas" ? "bg-[#1d2027] text-[#facc15] border border-[rgba(250,204,21,.3)]" : "text-[#6b7280] hover:text-[#9ca3af]"}`}>
            Preventivas / Programadas
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-[#12141c] rounded-lg border border-[#262a31]">
          <div className="flex items-center gap-1.5">
            <Search size={13} className="text-[#6b7280]" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors w-[160px]" />
          </div>
          <select value={filterEquipamento} onChange={(e) => setFilterEquipamento(e.target.value)} className="bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-[#9ca3af] focus:border-[#00a572] focus:outline-none transition-colors">
            <option value="">Equipamento</option>
            {EQUIPAMENTOS.map((eq) => (<option key={eq} value={eq}>{eq}</option>))}
          </select>
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-[#9ca3af] focus:border-[#00a572] focus:outline-none transition-colors">
            <option value="">Tipo Manut.</option>
            {TIPOS_MANUTENCAO.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-[#9ca3af] focus:border-[#00a572] focus:outline-none transition-colors">
            <option value="">Status</option>
            {STATUS_PREVENTIVA.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </select>
          <button onClick={exportReport} className="flex items-center gap-1.5 ml-auto bg-[rgba(0,165,114,.1)] border border-[rgba(0,165,114,.3)] rounded-md px-3 py-1.5 text-[11px] font-semibold text-[#00a572] hover:bg-[rgba(0,165,114,.2)] transition-colors">
            <Download size={12} /> Exportar Relatório
          </button>
        </div>

        {/* Add Button */}
        <div className="flex justify-end mb-3">
          <button onClick={() => addManutencao(manutTab === "corretivas" ? "corretiva" : "preventiva")} className="flex items-center gap-1.5 bg-[rgba(0,165,114,.1)] border border-[rgba(0,165,114,.3)] rounded-md px-3 py-1.5 text-[11px] font-semibold text-[#00a572] hover:bg-[rgba(0,165,114,.2)] transition-colors">
            <Plus size={13} /> {manutTab === "corretivas" ? "Nova Manutenção" : "Programar Preventiva"}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#262a31]">
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Data</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Hora</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Equipamento</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Tipo</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Descrição</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Responsável</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Peça</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Mão de Obra</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Total</th>
                {manutTab === "preventivas" && <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Status</th>}
                {manutTab === "preventivas" && <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Programado</th>}
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {manutencoesFiltradas
                .filter((m) => manutTab === "corretivas" ? m.categoria === "corretiva" : m.categoria === "preventiva")
                .map((m) => {
                  const total = parseBR(m.valorPeca) + parseBR(m.valorMaoObra);
                  const statusConf = STATUS_PREVENTIVA.find((s) => s.value === m.statusPreventiva);
                  const isAtrasada = m.statusPreventiva !== "concluida" && m.dataProgramada && m.dataProgramada < new Date().toISOString().split("T")[0];
                  return (
                    <tr key={m.id} className="border-b border-[rgba(38,42,49,.4)] hover:bg-[rgba(26,27,35,.5)] transition-colors">
                      <td className="py-2 px-2"><input type="date" value={m.data} onChange={(e) => handleManutChange(m.id, "data", e.target.value)} className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[120px]" /></td>
                      <td className="py-2 px-2"><input type="time" value={m.hora} onChange={(e) => handleManutChange(m.id, "hora", e.target.value)} className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[90px]" /></td>
                      <td className="py-2 px-2">
                        <select value={m.equipamento} onChange={(e) => handleManutChange(m.id, "equipamento", e.target.value)} className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors w-[100px]">
                          <option value="">Selecionar</option>
                          {EQUIPAMENTOS.map((eq) => (<option key={eq} value={eq}>{eq}</option>))}
                          {bombas.map((b) => (<option key={b.id} value={b.identificacao}>{b.identificacao}</option>))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select value={m.tipoManutencao} onChange={(e) => handleManutChange(m.id, "tipoManutencao", e.target.value)} className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors w-[150px]">
                          <option value="">Selecionar</option>
                          {TIPOS_MANUTENCAO.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </select>
                      </td>
                      <td className="py-2 px-2"><input type="text" value={m.descricao} onChange={(e) => handleManutChange(m.id, "descricao", e.target.value)} placeholder="Descrição..." className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors w-[180px]" /></td>
                      <td className="py-2 px-2"><input type="text" value={m.responsavel} onChange={(e) => handleManutChange(m.id, "responsavel", e.target.value)} placeholder="Nome" className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors w-[110px]" /></td>
                      <td className="py-2 px-2">
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6b7280] font-['JetBrains_Mono',monospace]">R$</span>
                          <input type="text" inputMode="decimal" value={m.valorPeca} onChange={(e) => handleManutChange(m.id, "valorPeca", e.target.value)} placeholder="0,00" className="bg-[#12141c] border border-[#262a31] rounded pl-6 pr-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[90px]" />
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6b7280] font-['JetBrains_Mono',monospace]">R$</span>
                          <input type="text" inputMode="decimal" value={m.valorMaoObra} onChange={(e) => handleManutChange(m.id, "valorMaoObra", e.target.value)} placeholder="0,00" className="bg-[#12141c] border border-[#262a31] rounded pl-6 pr-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[90px]" />
                        </div>
                      </td>
                      <td className="py-2 px-2"><span className="text-[12px] font-bold text-[#00a572] font-['JetBrains_Mono',monospace]">{fmtR(total)}</span></td>
                      {manutTab === "preventivas" && (
                        <td className="py-2 px-2">
                          <select value={m.statusPreventiva} onChange={(e) => handleManutChange(m.id, "statusPreventiva", e.target.value)} className={`bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[10px] font-semibold focus:outline-none cursor-pointer ${isAtrasada ? "text-[#f87171] border-[#f87171]" : statusConf?.color || "text-white"}`}>
                            {STATUS_PREVENTIVA.map((s) => (<option key={s.value} value={s.value} className="bg-[#1d2027]">{s.label}</option>))}
                          </select>
                        </td>
                      )}
                      {manutTab === "preventivas" && (
                        <td className="py-2 px-2"><input type="date" value={m.dataProgramada} onChange={(e) => handleManutChange(m.id, "dataProgramada", e.target.value)} className={`bg-[#12141c] border rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:outline-none transition-colors w-[120px] ${isAtrasada ? "border-[#f87171]" : "border-[#262a31]"} focus:border-[#00a572]`} /></td>
                      )}
                      <td className="py-2 px-2"><button onClick={() => removeManutencao(m.id)} className="text-[#6b7280] hover:text-[#f87171] transition-colors"><Trash2 size={13} /></button></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {manutencoesFiltradas.filter((m) => manutTab === "corretivas" ? m.categoria === "corretiva" : m.categoria === "preventiva").length === 0 && (
            <p className="text-[12px] text-[#6b7280] text-center py-4">
              Nenhuma manutenção {manutTab === "corretivas" ? "corretiva" : "preventiva"} registrada.
            </p>
          )}
        </div>
      </SectionCard>

      {/* ── GERADOR ── */}
      <SectionCard title="Controle do Gerador" icon={<Zap size={15} className="text-[#60a5fa]" />}>
        {/* Métricas Consolidadas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#12141c] border border-[#262a31] rounded-lg p-3">
            <p className="text-[10px] text-[#6b7280] mb-1">Horas Totais</p>
            <p className="text-[18px] font-bold text-white font-['JetBrains_Mono',monospace]">{fmtBR(calculos.totalHoras, 1)}h</p>
          </div>
          <div className="bg-[#12141c] border border-[#262a31] rounded-lg p-3">
            <p className="text-[10px] text-[#6b7280] mb-1">Litros Consumidos</p>
            <p className="text-[18px] font-bold text-[#60a5fa] font-['JetBrains_Mono',monospace]">{fmtBR(calculos.totalLitros, 1)}L</p>
          </div>
          <div className="bg-[#12141c] border border-[#262a31] rounded-lg p-3">
            <p className="text-[10px] text-[#6b7280] mb-1">Média Geral</p>
            <p className="text-[18px] font-bold text-[#facc15] font-['JetBrains_Mono',monospace]">{fmtBR(calculos.consumoMedio, 2)} L/h</p>
          </div>
          <div className="bg-[#12141c] border border-[#262a31] rounded-lg p-3">
            <p className="text-[10px] text-[#6b7280] mb-1">Último Abastecimento</p>
            <p className="text-[13px] font-bold text-[#4edea3] font-['JetBrains_Mono',monospace]">{calculos.ultimoGerador?.data || "—"}</p>
          </div>
        </div>

        <div className="flex justify-end mb-3">
          <button onClick={addGerador} className="flex items-center gap-1.5 bg-[rgba(96,165,250,.1)] border border-[rgba(96,165,250,.3)] rounded-md px-3 py-1.5 text-[11px] font-semibold text-[#60a5fa] hover:bg-[rgba(96,165,250,.2)] transition-colors">
            <Plus size={13} /> Novo Registro
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#262a31]">
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Data</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Hr. Inicial</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Hr. Final</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Horas</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Litros</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Consumo L/h</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Responsável</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Obs.</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {gerador.map((g) => {
                const horas = parseBR(g.horimetroFinal) - parseBR(g.horimetroInicial);
                const litros = parseBR(g.litrosAbastecidos);
                const consumo = horas > 0 ? litros / horas : 0;
                return (
                  <tr key={g.id} className="border-b border-[rgba(38,42,49,.4)] hover:bg-[rgba(26,27,35,.5)] transition-colors">
                    <td className="py-2 px-2"><input type="date" value={g.data} onChange={(e) => handleGeradorChange(g.id, "data", e.target.value)} className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[120px]" /></td>
                    <td className="py-2 px-2"><input type="text" inputMode="decimal" value={g.horimetroInicial} onChange={(e) => handleGeradorChange(g.id, "horimetroInicial", e.target.value)} placeholder="0.0" className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[80px]" /></td>
                    <td className="py-2 px-2"><input type="text" inputMode="decimal" value={g.horimetroFinal} onChange={(e) => handleGeradorChange(g.id, "horimetroFinal", e.target.value)} placeholder="0.0" className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[80px]" /></td>
                    <td className="py-2 px-2"><span className={`text-[12px] font-bold font-['JetBrains_Mono',monospace] ${horas > 0 ? "text-[#4edea3]" : "text-[#6b7280]"}`}>{horas > 0 ? fmtBR(horas, 1) : "—"}</span></td>
                    <td className="py-2 px-2">
                      <div className="relative">
                        <input type="text" inputMode="decimal" value={g.litrosAbastecidos} onChange={(e) => handleGeradorChange(g.id, "litrosAbastecidos", e.target.value)} placeholder="0" className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[80px] pr-5" />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[#6b7280]">L</span>
                      </div>
                    </td>
                    <td className="py-2 px-2"><span className={`text-[12px] font-bold font-['JetBrains_Mono',monospace] ${consumo > 0 ? "text-[#facc15]" : "text-[#6b7280]"}`}>{consumo > 0 ? `${fmtBR(consumo, 2)} L/h` : "—"}</span></td>
                    <td className="py-2 px-2"><input type="text" value={g.responsavel} onChange={(e) => handleGeradorChange(g.id, "responsavel", e.target.value)} placeholder="Nome" className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors w-[110px]" /></td>
                    <td className="py-2 px-2"><input type="text" value={g.observacoes} onChange={(e) => handleGeradorChange(g.id, "observacoes", e.target.value)} placeholder="Obs..." className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors w-[120px]" /></td>
                    <td className="py-2 px-2"><button onClick={() => removeGerador(g.id)} className="text-[#6b7280] hover:text-[#f87171] transition-colors"><Trash2 size={13} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {gerador.length === 0 && (
            <p className="text-[12px] text-[#6b7280] text-center py-4">Nenhum registro de gerador.</p>
          )}
        </div>
      </SectionCard>

      {/* ── LIMPEZA ── */}
      <SectionCard title="Gastos com Limpeza" icon={<Droplets size={15} className="text-[#a78bfa]" />}>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#12141c] border border-[#262a31] rounded-lg p-3">
            <p className="text-[10px] text-[#6b7280] mb-1">Gasto do Mês</p>
            <p className="text-[16px] font-bold text-white font-['JetBrains_Mono',monospace]">{fmtR(calculos.custoLimpeza)}</p>
          </div>
          <div className="bg-[#12141c] border border-[#262a31] rounded-lg p-3">
            <p className="text-[10px] text-[#6b7280] mb-1">Gasto do Ano</p>
            <p className="text-[16px] font-bold text-[#a78bfa] font-['JetBrains_Mono',monospace]">{fmtR(calculos.gastoLimpezaAno)}</p>
          </div>
          <div className="bg-[#12141c] border border-[#262a31] rounded-lg p-3">
            <p className="text-[10px] text-[#6b7280] mb-1">Produto Mais Consumido</p>
            <p className="text-[13px] font-bold text-[#facc15]">{calculos.produtoMaisConsumido}</p>
          </div>
        </div>

        <div className="flex justify-end mb-3">
          <button onClick={addLimpeza} className="flex items-center gap-1.5 bg-[rgba(167,139,250,.1)] border border-[rgba(167,139,250,.3)] rounded-md px-3 py-1.5 text-[11px] font-semibold text-[#a78bfa] hover:bg-[rgba(167,139,250,.2)] transition-colors">
            <Plus size={13} /> Nova Compra
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#262a31]">
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Data</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Produto</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Quantidade</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Valor Total</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2">Observação</th>
                <th className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {limpeza.map((l) => (
                <tr key={l.id} className="border-b border-[rgba(38,42,49,.4)] hover:bg-[rgba(26,27,35,.5)] transition-colors">
                  <td className="py-2 px-2"><input type="date" value={l.data} onChange={(e) => handleLimpezaChange(l.id, "data", e.target.value)} className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[120px]" /></td>
                  <td className="py-2 px-2">
                    <select value={l.produto} onChange={(e) => handleLimpezaChange(l.id, "produto", e.target.value)} className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors w-[180px]">
                      <option value="">Selecionar</option>
                      {PRODUTOS_LIMPEZA.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </td>
                  <td className="py-2 px-2"><input type="text" value={l.quantidade} onChange={(e) => handleLimpezaChange(l.id, "quantidade", e.target.value)} placeholder="Qtd" className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[80px]" /></td>
                  <td className="py-2 px-2">
                    <div className="relative">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6b7280] font-['JetBrains_Mono',monospace]">R$</span>
                      <input type="text" inputMode="decimal" value={l.valorTotal} onChange={(e) => handleLimpezaChange(l.id, "valorTotal", e.target.value)} placeholder="0,00" className="bg-[#12141c] border border-[#262a31] rounded pl-6 pr-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors w-[100px]" />
                    </div>
                  </td>
                  <td className="py-2 px-2"><input type="text" value={l.observacao} onChange={(e) => handleLimpezaChange(l.id, "observacao", e.target.value)} placeholder="Obs..." className="bg-[#12141c] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors w-[160px]" /></td>
                  <td className="py-2 px-2"><button onClick={() => removeLimpeza(l.id)} className="text-[#6b7280] hover:text-[#f87171] transition-colors"><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {limpeza.length === 0 && (
            <p className="text-[12px] text-[#6b7280] text-center py-4">Nenhuma compra de limpeza registrada.</p>
          )}
        </div>
      </SectionCard>

    </div>
  );
}
