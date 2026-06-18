import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Droplets,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  DollarSign,
  BarChart3,
  ChevronDown,
  Package,
  Filter,
  Beaker,
  TrendingUp,
  TrendingDown,
  Gauge,
  ClipboardList,
} from "lucide-react";
import { loadAllModuleData, saveAllModuleData, MODULE_NAMES } from "../services/supabasePersistence";

/* ══════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════ */

interface Tambor {
  id: string;
  nome: string;
  marca: string;
  pesoTotal: string;
  valorTotal: string;
  quantidadeAtual: string;
}

interface FiltroServico {
  id: string;
  tipo: string;
  quantidade: string;
  custoUnitario: string;
  valorVenda: string;
}

interface LubServico {
  id: string;
  produto: string;
  quantidade: string;
  custoUnitario: string;
  valorVenda: string;
}

interface InsumosServico {
  graxaKg: string;
  filtros: FiltroServico[];
  lubrificantes: LubServico[];
}

interface Servico {
  id: string;
  data: string;
  veiculo: string;
  placa: string;
  funcionario: string;
  tipoServico: string;
  valorCobrado: string;
  observacoes: string;
  insumos: InsumosServico;
}

interface PeriodData {
  tambores: Tambor[];
  servicos: Servico[];
}

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "dadosLubrificacao";
const MODULO_NAME = MODULE_NAMES.LUBRIFICACAO;

const MONTH_LABELS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const TIPOS_SERVICO = [
  "Lubrificação outros",
  "Lubrificação Cruzeta",
  "Lubrificação rodotrem",
  "Lubrificação bitrem",
  "Lubrificação Carreta",
  "Lubrificação Truck",
  "Lubrificação Toco",
  "Lubrificação Cavalo Mecânico",
  "Troca de Óleo Motor",
  "Troca de Óleo Diferencial",
  "Troca de Óleo Caixa",
  "Outros",
];

const TIPOS_FILTRO = [
  "Filtro de Óleo",
  "Filtro de Combustível",
  "Filtro Separador",
  "Filtro de Ar",
];

const TIPOS_LUBRIFICANTE = [
  "Óleo Motor",
  "Óleo Diferencial",
  "Óleo Hidráulico",
  "Óleo Caixa",
];

const TIPO_SERVICO_CORES: Record<string, string> = {
  "Lubrificação outros":       "bg-[rgba(0,165,114,.15)] text-[#00a572]",
  "Lubrificação Cruzeta":      "bg-[rgba(0,165,114,.15)] text-[#00a572]",
  "Lubrificação rodotrem":     "bg-[rgba(0,165,114,.15)] text-[#00a572]",
  "Lubrificação bitrem":       "bg-[rgba(0,165,114,.15)] text-[#00a572]",
  "Lubrificação Carreta":      "bg-[rgba(0,165,114,.15)] text-[#00a572]",
  "Lubrificação Truck":        "bg-[rgba(0,165,114,.15)] text-[#00a572]",
  "Lubrificação Toco":         "bg-[rgba(0,165,114,.15)] text-[#00a572]",
  "Lubrificação Cavalo Mecânico": "bg-[rgba(0,165,114,.15)] text-[#00a572]",
  "Troca de Óleo Motor":       "bg-[rgba(250,204,21,.15)] text-[#facc15]",
  "Troca de Óleo Diferencial": "bg-[rgba(250,204,21,.15)] text-[#facc15]",
  "Troca de Óleo Caixa":       "bg-[rgba(250,204,21,.15)] text-[#facc15]",
  "Outros":                    "bg-[rgba(148,163,184,.15)] text-[#94a3b8]",
};

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════
   PERSISTENCE
   ══════════════════════════════════════════════════════════════ */

function getDefaultPeriodData(): PeriodData {
  return { tambores: [], servicos: [] };
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

/* ══════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ══════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

export default function TrocaOleoLubrificacao() {
  /* ── Period State ── */
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const monthSelectorRef = useRef<HTMLDivElement>(null);

  /* ── Persistence ── */
  const allDataRef = useRef<Record<string, PeriodData>>({});
  const [loaded, setLoaded] = useState(false);
  const currentKey = makeKey(selectedYear, selectedMonth);

  const defaults = getDefaultPeriodData();

  const [tambores, setTambores] = useState<Tambor[]>(defaults.tambores);
  const [servicos, setServicos] = useState<Servico[]>(defaults.servicos);

  /* Carregar dados do Supabase ao montar */
  useEffect(() => {
    loadAllModuleData<PeriodData>(MODULO_NAME).then((data) => {
      allDataRef.current = data;
      setLoaded(true);
      const initStored = data[currentKey] || getDefaultPeriodData();
      setTambores(initStored.tambores);
      setServicos(initStored.servicos);
    }).catch(() => {
      allDataRef.current = loadFromStorage();
      setLoaded(true);
    });
  }, []);

  /* ── UI State ── */
  const [showServicoForm, setShowServicoForm] = useState(false);
  const [expandedServico, setExpandedServico] = useState<string | null>(null);

  /* ── Auto-save ── */
  useEffect(() => {
    if (!loaded) return;
    const data: PeriodData = { tambores, servicos };
    allDataRef.current[currentKey] = data;
    saveAllModuleData(MODULO_NAME, allDataRef.current);
  }, [tambores, servicos, currentKey, loaded]);

  const monthLabel = `${MONTH_LABELS[selectedMonth]} ${selectedYear}`;

  const snapshotCurrent = useCallback(() => {
    const data: PeriodData = { tambores, servicos };
    allDataRef.current[currentKey] = data;
    saveAllModuleData(MODULO_NAME, allDataRef.current);
  }, [tambores, servicos, currentKey]);

  const loadPeriod = useCallback((key: string) => {
    const stored = allDataRef.current[key];
    const d = getDefaultPeriodData();
    setTambores(stored?.tambores || d.tambores);
    setServicos(stored?.servicos || d.servicos);
  }, []);

  const handleMonthSelect = useCallback(
    (monthIdx: number) => {
      snapshotCurrent();
      const newKey = makeKey(selectedYear, monthIdx);
      setSelectedMonth(monthIdx);
      setShowMonthMenu(false);
      loadPeriod(newKey);
    },
    [snapshotCurrent, selectedYear, loadPeriod]
  );

  const handleYearChange = useCallback(
    (newYear: number) => {
      snapshotCurrent();
      const newKey = makeKey(newYear, selectedMonth);
      setSelectedYear(newYear);
      loadPeriod(newKey);
    },
    [snapshotCurrent, selectedMonth, loadPeriod]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        monthSelectorRef.current &&
        !monthSelectorRef.current.contains(e.target as Node)
      ) {
        setShowMonthMenu(false);
      }
    };
    if (showMonthMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMonthMenu]);

  /* ══════════════════════════════════════════════════════════════
     CALCULATIONS
     ══════════════════════════════════════════════════════════════ */

  const calculos = useMemo(() => {
    const totalServicos = servicos.length;

    const lubrificacoes = servicos.filter((s) =>
      s.tipoServico.toLowerCase().startsWith("lubrificação")
    ).length;
    const trocasOleo = servicos.filter((s) =>
      s.tipoServico.toLowerCase().startsWith("troca de óleo")
    ).length;

    const receitaServicos = servicos.reduce(
      (acc, s) => acc + parseBR(s.valorCobrado),
      0
    );

    const receitaProdutos = servicos.reduce((acc, s) => {
      const filtroVenda = (s.insumos?.filtros || []).reduce(
        (a, f) => a + parseBR(f.valorVenda) * parseBR(f.quantidade),
        0
      );
      const lubVenda = (s.insumos?.lubrificantes || []).reduce(
        (a, l) => a + parseBR(l.valorVenda) * parseBR(l.quantidade),
        0
      );
      return acc + filtroVenda + lubVenda;
    }, 0);

    const receitaTotal = receitaServicos + receitaProdutos;

    const tamborAtivo = tambores.length > 0 ? tambores[0] : null;
    const valorPorKg =
      tamborAtivo && parseBR(tamborAtivo.pesoTotal) > 0
        ? parseBR(tamborAtivo.valorTotal) / parseBR(tamborAtivo.pesoTotal)
        : 0;

    let consumoGraxaKg = 0;
    const custoGraxa = servicos.reduce((acc, s) => {
      const kg = parseBR(s.insumos?.graxaKg || "0");
      consumoGraxaKg += kg;
      return acc + kg * valorPorKg;
    }, 0);

    const custoFiltros = servicos.reduce((acc, s) => {
      return (
        acc +
        (s.insumos?.filtros || []).reduce(
          (a, f) => a + parseBR(f.custoUnitario) * parseBR(f.quantidade),
          0
        )
      );
    }, 0);

    const custoLubrificantes = servicos.reduce((acc, s) => {
      return (
        acc +
        (s.insumos?.lubrificantes || []).reduce(
          (a, l) => a + parseBR(l.custoUnitario) * parseBR(l.quantidade),
          0
        )
      );
    }, 0);

    const custoTotalInsumos = custoGraxa + custoFiltros + custoLubrificantes;
    const lucroBruto = receitaTotal - custoTotalInsumos;
    const margem = receitaTotal > 0 ? (lucroBruto / receitaTotal) * 100 : 0;

    const ticketMedio = totalServicos > 0 ? receitaTotal / totalServicos : 0;

    const consumoMedioGraxa =
      lubrificacoes > 0 ? consumoGraxaKg / lubrificacoes : 0;

    const contagemFiltros: Record<string, number> = {};
    servicos.forEach((s) =>
      (s.insumos?.filtros || []).forEach((f) => {
        if (f.tipo) {
          contagemFiltros[f.tipo] = (contagemFiltros[f.tipo] || 0) + 1;
        }
      })
    );
    const filtroMaisVendido =
      Object.entries(contagemFiltros).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    const contagemLubs: Record<string, number> = {};
    servicos.forEach((s) =>
      (s.insumos?.lubrificantes || []).forEach((l) => {
        if (l.produto) {
          contagemLubs[l.produto] = (contagemLubs[l.produto] || 0) + 1;
        }
      })
    );
    const lubMaisVendido =
      Object.entries(contagemLubs).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    const todosProdutos: Record<string, number> = { ...contagemFiltros };
    Object.entries(contagemLubs).forEach(([k, v]) => {
      todosProdutos[k] = (todosProdutos[k] || 0) + v;
    });
    const produtoMaisVendido =
      Object.entries(todosProdutos).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return {
      totalServicos,
      lubrificacoes,
      trocasOleo,
      receitaServicos,
      receitaProdutos,
      receitaTotal,
      custoGraxa,
      custoFiltros,
      custoLubrificantes,
      custoTotalInsumos,
      lucroBruto,
      margem,
      ticketMedio,
      consumoGraxaKg,
      consumoMedioGraxa,
      valorPorKg,
      produtoMaisVendido,
      filtroMaisVendido,
      lubMaisVendido,
      tamborAtivo,
    };
  }, [servicos, tambores]);

  /* ══════════════════════════════════════════════════════════════
     TAMBOR HANDLERS
     ══════════════════════════════════════════════════════════════ */

  const addTambor = useCallback(() => {
    setTambores((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: "",
        marca: "",
        pesoTotal: "",
        valorTotal: "",
        quantidadeAtual: "",
      },
    ]);
  }, []);

  const removeTambor = useCallback((id: string) => {
    setTambores((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleTamborChange = useCallback(
    (id: string, field: keyof Tambor, val: string) => {
      setTambores((prev) =>
        prev.map((t) => (t.id === id ? { ...t, [field]: val } : t))
      );
    },
    []
  );

  /* ══════════════════════════════════════════════════════════════
     SERVIÇO HANDLERS
     ══════════════════════════════════════════════════════════════ */

  const addServico = useCallback(() => {
    setServicos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        data: new Date().toISOString().split("T")[0],
        veiculo: "",
        placa: "",
        funcionario: "",
        tipoServico: "",
        valorCobrado: "",
        observacoes: "",
        insumos: {
          graxaKg: "",
          filtros: [],
          lubrificantes: [],
        },
      },
    ]);
    setShowServicoForm(true);
  }, []);

  const removeServico = useCallback((id: string) => {
    setServicos((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateServico = useCallback(
    (id: string, field: keyof Servico, val: string) => {
      setServicos((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
      );
    },
    []
  );

  const updateInsumos = useCallback(
    (servicoId: string, insumos: InsumosServico) => {
      setServicos((prev) =>
        prev.map((s) => (s.id === servicoId ? { ...s, insumos } : s))
      );
    },
    []
  );

  const addFiltro = useCallback(
    (servicoId: string) => {
      const servico = servicos.find((s) => s.id === servicoId);
      if (!servico) return;
      const newFiltro: FiltroServico = {
        id: crypto.randomUUID(),
        tipo: "",
        quantidade: "1",
        custoUnitario: "",
        valorVenda: "",
      };
      updateInsumos(servicoId, {
        ...servico.insumos,
        filtros: [...(servico.insumos?.filtros || []), newFiltro],
      });
    },
    [servicos, updateInsumos]
  );

  const removeFiltro = useCallback(
    (servicoId: string, filtroId: string) => {
      const servico = servicos.find((s) => s.id === servicoId);
      if (!servico) return;
      updateInsumos(servicoId, {
        ...servico.insumos,
        filtros: (servico.insumos?.filtros || []).filter(
          (f) => f.id !== filtroId
        ),
      });
    },
    [servicos, updateInsumos]
  );

  const updateFiltro = useCallback(
    (servicoId: string, filtroId: string, field: keyof FiltroServico, val: string) => {
      const servico = servicos.find((s) => s.id === servicoId);
      if (!servico) return;
      updateInsumos(servicoId, {
        ...servico.insumos,
        filtros: (servico.insumos?.filtros || []).map((f) =>
          f.id === filtroId ? { ...f, [field]: val } : f
        ),
      });
    },
    [servicos, updateInsumos]
  );

  const addLub = useCallback(
    (servicoId: string) => {
      const servico = servicos.find((s) => s.id === servicoId);
      if (!servico) return;
      const newLub: LubServico = {
        id: crypto.randomUUID(),
        produto: "",
        quantidade: "1",
        custoUnitario: "",
        valorVenda: "",
      };
      updateInsumos(servicoId, {
        ...servico.insumos,
        lubrificantes: [...(servico.insumos?.lubrificantes || []), newLub],
      });
    },
    [servicos, updateInsumos]
  );

  const removeLub = useCallback(
    (servicoId: string, lubId: string) => {
      const servico = servicos.find((s) => s.id === servicoId);
      if (!servico) return;
      updateInsumos(servicoId, {
        ...servico.insumos,
        lubrificantes: (servico.insumos?.lubrificantes || []).filter(
          (l) => l.id !== lubId
        ),
      });
    },
    [servicos, updateInsumos]
  );

  const updateLub = useCallback(
    (servicoId: string, lubId: string, field: keyof LubServico, val: string) => {
      const servico = servicos.find((s) => s.id === servicoId);
      if (!servico) return;
      updateInsumos(servicoId, {
        ...servico.insumos,
        lubrificantes: (servico.insumos?.lubrificantes || []).map((l) =>
          l.id === lubId ? { ...l, [field]: val } : l
        ),
      });
    },
    [servicos, updateInsumos]
  );

  /* ══════════════════════════════════════════════════════════════
     INDIVIDUAL SERVICE CALCULATION
     ══════════════════════════════════════════════════════════════ */

  const calcServicoLucro = useCallback(
    (servico: Servico): { receita: number; custo: number; lucro: number } => {
      const valorPorKg = calculos.valorPorKg;
      const receitaServico = parseBR(servico.valorCobrado);
      const receitaProdutos =
        (servico.insumos?.filtros || []).reduce(
          (a, f) => a + parseBR(f.valorVenda) * parseBR(f.quantidade),
          0
        ) +
        (servico.insumos?.lubrificantes || []).reduce(
          (a, l) => a + parseBR(l.valorVenda) * parseBR(l.quantidade),
          0
        );
      const custoGraxa =
        parseBR(servico.insumos?.graxaKg || "0") * valorPorKg;
      const custoFiltros = (servico.insumos?.filtros || []).reduce(
        (a, f) => a + parseBR(f.custoUnitario) * parseBR(f.quantidade),
        0
      );
      const custoLubs = (servico.insumos?.lubrificantes || []).reduce(
        (a, l) => a + parseBR(l.custoUnitario) * parseBR(l.quantidade),
        0
      );
      const receita = receitaServico + receitaProdutos;
      const custo = custoGraxa + custoFiltros + custoLubs;
      return { receita, custo, lucro: receita - custo };
    },
    [calculos.valorPorKg]
  );

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-[#12141c] p-4 pb-8">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Droplets size={20} className="text-[#00a572]" />
          <h1 className="text-[15px] font-bold text-white tracking-tight">
            Troca de Óleo e Lubrificação
          </h1>
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
              style={{
                transform: showMonthMenu ? "rotate(180deg)" : "rotate(0deg)",
              }}
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

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2 — DASHBOARD
          ══════════════════════════════════════════════════════════════ */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets size={14} className="text-[#00a572]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
              Lubrificações
            </span>
          </div>
          <p className="text-[22px] font-bold text-white font-['JetBrains_Mono',monospace]">
            {calculos.lubrificacoes}
          </p>
          <span className="text-[10px] text-[#6b7280]">realizadas no mês</span>
        </div>

        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Beaker size={14} className="text-[#facc15]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
              Trocas de Óleo
            </span>
          </div>
          <p className="text-[22px] font-bold text-white font-['JetBrains_Mono',monospace]">
            {calculos.trocasOleo}
          </p>
          <span className="text-[10px] text-[#6b7280]">realizadas no mês</span>
        </div>

        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-[#60a5fa]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
              Receita Serviços
            </span>
          </div>
          <p className="text-[22px] font-bold text-white font-['JetBrains_Mono',monospace]">
            {fmtR(calculos.receitaServicos)}
          </p>
          <span className="text-[10px] text-[#6b7280]">lançamentos no mês</span>
        </div>

        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} className="text-[#a78bfa]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
              Receita Produtos
            </span>
          </div>
          <p className="text-[22px] font-bold text-white font-['JetBrains_Mono',monospace]">
            {fmtR(calculos.receitaProdutos)}
          </p>
          <span className="text-[10px] text-[#6b7280]">filtros / óleos vendidos</span>
        </div>

        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-[#f87171]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
              Custo Insumos
            </span>
          </div>
          <p className="text-[22px] font-bold text-[#f87171] font-['JetBrains_Mono',monospace]">
            {fmtR(calculos.custoTotalInsumos)}
          </p>
          <span className="text-[10px] text-[#6b7280]">
            graxa + filtros + lub
          </span>
        </div>

        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-[#00a572]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
              Lucro Bruto
            </span>
          </div>
          <p
            className={`text-[22px] font-bold font-['JetBrains_Mono',monospace] ${
              calculos.lucroBruto >= 0 ? "text-[#00a572]" : "text-[#f87171]"
            }`}
          >
            {fmtR(calculos.lucroBruto)}
          </p>
          <span className="text-[10px] text-[#6b7280]">
            Margem{" "}
            <span
              className={
                calculos.margem >= 30
                  ? "text-[#00a572]"
                  : calculos.margem >= 15
                  ? "text-[#facc15]"
                  : "text-[#f87171]"
              }
            >
              {fmtBR(calculos.margem, 1)}%
            </span>
          </span>
        </div>

        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gauge size={14} className="text-[#f59e0b]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
              Consumo Graxa
            </span>
          </div>
          <p className="text-[22px] font-bold text-white font-['JetBrains_Mono',monospace]">
            {fmtBR(calculos.consumoGraxaKg, 3)} kg
          </p>
          <span className="text-[10px] text-[#6b7280]">total no mês</span>
        </div>

        <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={14} className="text-[#38bdf8]" />
            <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
              Ticket Médio
            </span>
          </div>
          <p className="text-[22px] font-bold text-white font-['JetBrains_Mono',monospace]">
            {fmtR(calculos.ticketMedio)}
          </p>
          <span className="text-[10px] text-[#6b7280]">por serviço</span>
        </div>
      </div>

      {/* ── Destaques Gerenciais ── */}
      <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList size={14} className="text-[#00a572]" />
          <h3 className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-[0.08em]">
            Destaques Gerenciais
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#12141c] rounded-md px-4 py-3 border border-[#262a31]">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">
              Serviço Mais Vendido
            </span>
            <p className="text-[13px] font-bold text-white mt-1">
              {servicos.length > 0
                ? (() => {
                    const counts: Record<string, number> = {};
                    servicos.forEach((s) => {
                      if (s.tipoServico) {
                        counts[s.tipoServico] = (counts[s.tipoServico] || 0) + 1;
                      }
                    });
                    return (
                      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
                      "—"
                    );
                  })()
                : "—"}
            </p>
          </div>
          <div className="bg-[#12141c] rounded-md px-4 py-3 border border-[#262a31]">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">
              Produto Mais Vendido
            </span>
            <p className="text-[13px] font-bold text-white mt-1">
              {calculos.produtoMaisVendido}
            </p>
          </div>
          <div className="bg-[#12141c] rounded-md px-4 py-3 border border-[#262a31]">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">
              Consumo Médio de Graxa por Lubrificação
            </span>
            <p className="text-[13px] font-bold text-white mt-1">
              {fmtBR(calculos.consumoMedioGraxa, 3)} kg
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3 — CONTROLE DE TAMBORES (GRAXA)
          ══════════════════════════════════════════════════════════════ */}

      <SectionCard
        title="Controle de Tambor — Graxa"
        icon={<Droplets size={14} className="text-[#00a572]" />}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] text-[#6b7280]">
            {tambores.length} tambor(es) cadastrado(s)
          </span>
          <button
            onClick={addTambor}
            className="flex items-center gap-1.5 bg-[rgba(0,165,114,.12)] hover:bg-[rgba(0,165,114,.2)] text-[#00a572] text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            <Plus size={12} /> Novo Tambor
          </button>
        </div>

        {tambores.length === 0 ? (
          <div className="text-center py-8 text-[#6b7280] text-[12px]">
            Nenhum tambor cadastrado. Clique em "Novo Tambor" para começar.
          </div>
        ) : (
          <div className="space-y-4">
            {tambores.map((tambor) => {
              const pesoTotal = parseBR(tambor.pesoTotal);
              const valorTotal = parseBR(tambor.valorTotal);
              const qtdAtual = parseBR(tambor.quantidadeAtual);
              const valorPorKg =
                pesoTotal > 0 ? valorTotal / pesoTotal : 0;
              const pctRestante =
                pesoTotal > 0 ? (qtdAtual / pesoTotal) * 100 : 0;

              let barColor = "bg-[#00a572]";
              let labelColor = "text-[#00a572]";
              let statusLabel = "Normal";
              if (pctRestante <= 20) {
                barColor = "bg-[#f87171]";
                labelColor = "text-[#f87171]";
                statusLabel = "⚠ Reposição Urgente!";
              } else if (pctRestante <= 50) {
                barColor = "bg-[#facc15]";
                labelColor = "text-[#facc15]";
                statusLabel = "Atenção";
              }

              return (
                <div
                  key={tambor.id}
                  className="bg-[#12141c] border border-[#262a31] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Droplets size={14} className={labelColor} />
                      <span className="text-[12px] font-bold text-white">
                        {tambor.nome || "Tambor sem nome"}
                      </span>
                      {tambor.marca && (
                        <span className="text-[10px] text-[#6b7280] bg-[#1d2027] px-2 py-0.5 rounded">
                          {tambor.marca}
                        </span>
                      )}
                      {pctRestante > 0 && (
                        <span
                          className={`text-[10px] font-semibold ${labelColor}`}
                        >
                          {statusLabel}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeTambor(tambor.id)}
                      className="text-[#f87171] hover:text-[#fca5a5] transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div>
                      <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                        Nome da Graxa
                      </label>
                      <input
                        type="text"
                        value={tambor.nome}
                        onChange={(e) =>
                          handleTamborChange(tambor.id, "nome", e.target.value)
                        }
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                        placeholder="Ex: Graxa Vermelha"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={tambor.marca}
                        onChange={(e) =>
                          handleTamborChange(tambor.id, "marca", e.target.value)
                        }
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                        placeholder="Ex: Shell Gadus"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                        Peso Total (kg)
                      </label>
                      <input
                        type="text"
                        value={tambor.pesoTotal}
                        onChange={(e) =>
                          handleTamborChange(
                            tambor.id,
                            "pesoTotal",
                            e.target.value
                          )
                        }
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors"
                        placeholder="180"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                        Valor do Tambor (R$)
                      </label>
                      <input
                        type="text"
                        value={tambor.valorTotal}
                        onChange={(e) =>
                          handleTamborChange(
                            tambor.id,
                            "valorTotal",
                            e.target.value
                          )
                        }
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors"
                        placeholder="1.200,00"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                        Qtd Atual (kg)
                      </label>
                      <input
                        type="text"
                        value={tambor.quantidadeAtual}
                        onChange={(e) =>
                          handleTamborChange(
                            tambor.id,
                            "quantidadeAtual",
                            e.target.value
                          )
                        }
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors"
                        placeholder="150"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="bg-[#1d2027] rounded-md px-3 py-2">
                      <span className="text-[9px] text-[#6b7280] uppercase font-semibold">
                        Valor por Kg
                      </span>
                      <p className="text-[13px] font-bold text-white font-['JetBrains_Mono',monospace]">
                        {fmtR(valorPorKg)}/kg
                      </p>
                    </div>
                    <div className="bg-[#1d2027] rounded-md px-3 py-2">
                      <span className="text-[9px] text-[#6b7280] uppercase font-semibold">
                        Quantidade Atual
                      </span>
                      <p className="text-[13px] font-bold text-white font-['JetBrains_Mono',monospace]">
                        {fmtBR(qtdAtual, 3)} kg
                      </p>
                    </div>
                    <div className="bg-[#1d2027] rounded-md px-3 py-2">
                      <span className="text-[9px] text-[#6b7280] uppercase font-semibold">
                        Peso Total
                      </span>
                      <p className="text-[13px] font-bold text-white font-['JetBrains_Mono',monospace]">
                        {fmtBR(pesoTotal, 1)} kg
                      </p>
                    </div>
                    <div className="bg-[#1d2027] rounded-md px-3 py-2">
                      <span className="text-[9px] text-[#6b7280] uppercase font-semibold">
                        % Restante
                      </span>
                      <p
                        className={`text-[13px] font-bold font-['JetBrains_Mono',monospace] ${labelColor}`}
                      >
                        {fmtBR(pctRestante, 1)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="w-full h-3 bg-[#262a31] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{
                          width: `${Math.min(pctRestante, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-[#6b7280]">0%</span>
                      <span className={`text-[9px] font-semibold ${labelColor}`}>
                        {fmtBR(pctRestante, 1)}%
                      </span>
                      <span className="text-[9px] text-[#6b7280]">100%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4 — REGISTRO RÁPIDO DE SERVIÇOS
          ══════════════════════════════════════════════════════════════ */}

      <SectionCard
        title="Registro Rápido de Serviços"
        icon={<ClipboardList size={14} className="text-[#00a572]" />}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] text-[#6b7280]">
            {servicos.length} serviço(s) registrado(s)
          </span>
          <button
            onClick={addServico}
            className="flex items-center gap-1.5 bg-[rgba(0,165,114,.12)] hover:bg-[rgba(0,165,114,.2)] text-[#00a572] text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            <Plus size={12} /> Novo Serviço
          </button>
        </div>

        {showServicoForm && servicos.length > 0 && (
          <div className="bg-[#12141c] border border-[rgba(0,165,114,.2)] rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#00a572] uppercase tracking-wider">
                Último Serviço Adicionado
              </span>
              <button
                onClick={() => setShowServicoForm(false)}
                className="text-[#6b7280] hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[11px] text-[#6b7280]">
              Preencha os campos do serviço na lista abaixo. Use o formulário inline
              de cada registro para rápida captura.
            </p>
          </div>
        )}

        {servicos.length === 0 ? (
          <div className="text-center py-8 text-[#6b7280] text-[12px]">
            Nenhum serviço registrado. Clique em "Novo Serviço" para começar.
          </div>
        ) : (
          <div className="space-y-4">
            {servicos.map((servico) => {
              const lucroInfo = calcServicoLucro(servico);
              const isExpanded = expandedServico === servico.id;
              const tipoBadge =
                TIPO_SERVICO_CORES[servico.tipoServico] ||
                "bg-[rgba(148,163,184,.15)] text-[#94a3b8]";
              const isLubrificacao = servico.tipoServico
                .toLowerCase()
                .startsWith("lubrificação");

              return (
                <div
                  key={servico.id}
                  className="bg-[#12141c] border border-[#262a31] rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[rgba(255,255,255,.02)] transition-colors"
                    onClick={() =>
                      setExpandedServico(
                        expandedServico === servico.id ? null : servico.id
                      )
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${tipoBadge}`}>
                        {servico.tipoServico || "Sem tipo"}
                      </span>
                      <span className="text-[12px] text-white font-medium truncate">
                        {servico.veiculo || "Sem veículo"}{" "}
                        {servico.placa ? `(${servico.placa})` : ""}
                      </span>
                      <span className="text-[10px] text-[#6b7280] shrink-0">
                        {servico.data}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[12px] font-bold text-white font-['JetBrains_Mono',monospace]">
                        {fmtR(parseBR(servico.valorCobrado))}
                      </span>
                      <span
                        className={`text-[11px] font-semibold font-['JetBrains_Mono',monospace] ${
                          lucroInfo.lucro >= 0
                            ? "text-[#00a572]"
                            : "text-[#f87171]"
                        }`}
                      >
                        Lucro: {fmtR(lucroInfo.lucro)}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-[#6b7280] transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-[#262a31] pt-3">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                        <div>
                          <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                            Data
                          </label>
                          <input
                            type="date"
                            value={servico.data}
                            onChange={(e) =>
                              updateServico(
                                servico.id,
                                "data",
                                e.target.value
                              )
                            }
                            className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                            Veículo
                          </label>
                          <input
                            type="text"
                            value={servico.veiculo}
                            onChange={(e) =>
                              updateServico(
                                servico.id,
                                "veiculo",
                                e.target.value
                              )
                            }
                            className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                            placeholder="Ex: Mercedes Axor"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                            Placa
                          </label>
                          <input
                            type="text"
                            value={servico.placa}
                            onChange={(e) =>
                              updateServico(
                                servico.id,
                                "placa",
                                e.target.value.toUpperCase()
                              )
                            }
                            className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white font-['JetBrains_Mono',monospace] uppercase focus:border-[#00a572] focus:outline-none transition-colors"
                            placeholder="ABC-1234"
                            maxLength={8}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                            Funcionário
                          </label>
                          <input
                            type="text"
                            value={servico.funcionario}
                            onChange={(e) =>
                              updateServico(
                                servico.id,
                                "funcionario",
                                e.target.value
                              )
                            }
                            className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                            placeholder="Nome do técnico"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                            Tipo de Serviço
                          </label>
                          <select
                            value={servico.tipoServico}
                            onChange={(e) =>
                              updateServico(
                                servico.id,
                                "tipoServico",
                                e.target.value
                              )
                            }
                            className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white focus:border-[#00a572] focus:outline-none transition-colors appearance-none"
                          >
                            <option value="">Selecione...</option>
                            {TIPOS_SERVICO.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                            Valor Cobrado (R$)
                          </label>
                          <input
                            type="text"
                            value={servico.valorCobrado}
                            onChange={(e) =>
                              updateServico(
                                servico.id,
                                "valorCobrado",
                                e.target.value
                              )
                            }
                            className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors"
                            placeholder="0,00"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold block mb-1">
                          Observações
                        </label>
                        <input
                          type="text"
                          value={servico.observacoes}
                          onChange={(e) =>
                            updateServico(
                              servico.id,
                              "observacoes",
                              e.target.value
                            )
                          }
                          className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                          placeholder="Observações adicionais..."
                        />
                      </div>

                      {/* ── Insumos ── */}
                      <div className="border-t border-[#262a31] pt-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Package size={12} className="text-[#a78bfa]" />
                          <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                            Insumos Vinculados
                          </span>
                        </div>

                        {/* Graxa */}
                        {isLubrificacao && (
                          <div className="bg-[#1d2027] rounded-md p-3 mb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Droplets
                                size={12}
                                className="text-[#00a572]"
                              />
                              <span className="text-[10px] font-semibold text-[#9ca3af] uppercase">
                                Graxa Utilizada
                              </span>
                              {calculos.valorPorKg > 0 && (
                                <span className="text-[9px] text-[#6b7280]">
                                  (Valor: {fmtR(calculos.valorPorKg)}/kg)
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-[9px] text-[#6b7280] uppercase block mb-1">
                                  Peso (kg)
                                </label>
                                <input
                                  type="text"
                                  value={servico.insumos?.graxaKg || ""}
                                  onChange={(e) =>
                                    updateInsumos(servico.id, {
                                      ...servico.insumos,
                                      graxaKg: e.target.value,
                                    })
                                  }
                                  className="w-full bg-[#12141c] border border-[#262a31] rounded px-2 py-1.5 text-[12px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors"
                                  placeholder="0,500"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-[#6b7280] uppercase block mb-1">
                                  Custo Graxa (R$)
                                </label>
                                <p className="text-[13px] font-bold text-[#f87171] font-['JetBrains_Mono',monospace] py-1.5">
                                  {fmtR(
                                    parseBR(
                                      servico.insumos?.graxaKg || "0"
                                    ) * calculos.valorPorKg
                                  )}
                                </p>
                              </div>
                              <div>
                                <label className="text-[9px] text-[#6b7280] uppercase block mb-1">
                                  Status Tambor
                                </label>
                                {calculos.tamborAtivo ? (
                                  <p className="text-[11px] text-[#00a572] font-semibold py-1.5">
                                    {fmtBR(
                                      parseBR(
                                        calculos.tamborAtivo.quantidadeAtual
                                      ) -
                                        parseBR(
                                          servico.insumos?.graxaKg || "0"
                                    ), 3)}{" "}
                                    kg restantes
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-[#f87171] py-1.5">
                                    Sem tambor cadastrado
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Filtros */}
                        <div className="bg-[#1d2027] rounded-md p-3 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Filter size={12} className="text-[#60a5fa]" />
                              <span className="text-[10px] font-semibold text-[#9ca3af] uppercase">
                                Filtros
                              </span>
                            </div>
                            <button
                              onClick={() => addFiltro(servico.id)}
                              className="text-[10px] text-[#60a5fa] hover:text-[#93c5fd] font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Plus size={10} /> Adicionar
                            </button>
                          </div>
                          {(servico.insumos?.filtros || []).length === 0 ? (
                            <p className="text-[10px] text-[#6b7280] py-2">
                              Nenhum filtro adicionado
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {(servico.insumos?.filtros || []).map((filtro) => (
                                <div
                                  key={filtro.id}
                                  className="grid grid-cols-5 gap-2 items-end"
                                >
                                  <div>
                                    <label className="text-[9px] text-[#6b7280] uppercase block mb-1">
                                      Tipo
                                    </label>
                                    <select
                                      value={filtro.tipo}
                                      onChange={(e) =>
                                        updateFiltro(
                                          servico.id,
                                          filtro.id,
                                          "tipo",
                                          e.target.value
                                        )
                                      }
                                      className="w-full bg-[#12141c] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white focus:border-[#60a5fa] focus:outline-none transition-colors appearance-none"
                                    >
                                      <option value="">Selecione...</option>
                                      {TIPOS_FILTRO.map((t) => (
                                        <option key={t} value={t}>
                                          {t}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-[#6b7280] uppercase block mb-1">
                                      Qtd
                                    </label>
                                    <input
                                      type="text"
                                      value={filtro.quantidade}
                                      onChange={(e) =>
                                        updateFiltro(
                                          servico.id,
                                          filtro.id,
                                          "quantidade",
                                          e.target.value
                                        )
                                      }
                                      className="w-full bg-[#12141c] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#60a5fa] focus:outline-none transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-[#6b7280] uppercase block mb-1">
                                      Custo Unit. (R$)
                                    </label>
                                    <input
                                      type="text"
                                      value={filtro.custoUnitario}
                                      onChange={(e) =>
                                        updateFiltro(
                                          servico.id,
                                          filtro.id,
                                          "custoUnitario",
                                          e.target.value
                                        )
                                      }
                                      className="w-full bg-[#12141c] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#60a5fa] focus:outline-none transition-colors"
                                      placeholder="0,00"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-[#6b7280] uppercase block mb-1">
                                      Venda Unit. (R$)
                                    </label>
                                    <input
                                      type="text"
                                      value={filtro.valorVenda}
                                      onChange={(e) =>
                                        updateFiltro(
                                          servico.id,
                                          filtro.id,
                                          "valorVenda",
                                          e.target.value
                                        )
                                      }
                                      className="w-full bg-[#12141c] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#60a5fa] focus:outline-none transition-colors"
                                      placeholder="0,00"
                                    />
                                  </div>
                                  <button
                                    onClick={() =>
                                      removeFiltro(servico.id, filtro.id)
                                    }
                                    className="text-[#f87171] hover:text-[#fca5a5] transition-colors p-1.5"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Lubrificantes */}
                        <div className="bg-[#1d2027] rounded-md p-3 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Beaker size={12} className="text-[#f59e0b]" />
                              <span className="text-[10px] font-semibold text-[#9ca3af] uppercase">
                                Lubrificantes
                              </span>
                            </div>
                            <button
                              onClick={() => addLub(servico.id)}
                              className="text-[10px] text-[#f59e0b] hover:text-[#fbbf24] font-semibold flex items-center gap-1 transition-colors"
                            >
                              <Plus size={10} /> Adicionar
                            </button>
                          </div>
                          {(servico.insumos?.lubrificantes || []).length ===
                          0 ? (
                            <p className="text-[10px] text-[#6b7280] py-2">
                              Nenhum lubrificante adicionado
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {(servico.insumos?.lubrificantes || []).map(
                                (lub) => (
                                  <div
                                    key={lub.id}
                                    className="grid grid-cols-5 gap-2 items-end"
                                  >
                                    <div>
                                      <label className="text-[9px] text-[#6b7280] uppercase block mb-1">
                                        Produto
                                      </label>
                                      <select
                                        value={lub.produto}
                                        onChange={(e) =>
                                          updateLub(
                                            servico.id,
                                            lub.id,
                                            "produto",
                                            e.target.value
                                          )
                                        }
                                        className="w-full bg-[#12141c] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white focus:border-[#f59e0b] focus:outline-none transition-colors appearance-none"
                                      >
                                        <option value="">
                                          Selecione...
                                        </option>
                                        {TIPOS_LUBRIFICANTE.map((t) => (
                                          <option key={t} value={t}>
                                            {t}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-[#6b7280] uppercase block mb-1">
                                        Qtd
                                      </label>
                                      <input
                                        type="text"
                                        value={lub.quantidade}
                                        onChange={(e) =>
                                          updateLub(
                                            servico.id,
                                            lub.id,
                                            "quantidade",
                                            e.target.value
                                          )
                                        }
                                        className="w-full bg-[#12141c] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#f59e0b] focus:outline-none transition-colors"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-[#6b7280] uppercase block mb-1">
                                        Custo Unit. (R$)
                                      </label>
                                      <input
                                        type="text"
                                        value={lub.custoUnitario}
                                        onChange={(e) =>
                                          updateLub(
                                            servico.id,
                                            lub.id,
                                            "custoUnitario",
                                            e.target.value
                                          )
                                        }
                                        className="w-full bg-[#12141c] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#f59e0b] focus:outline-none transition-colors"
                                        placeholder="0,00"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-[#6b7280] uppercase block mb-1">
                                        Venda Unit. (R$)
                                      </label>
                                      <input
                                        type="text"
                                        value={lub.valorVenda}
                                        onChange={(e) =>
                                          updateLub(
                                            servico.id,
                                            lub.id,
                                            "valorVenda",
                                            e.target.value
                                          )
                                        }
                                        className="w-full bg-[#12141c] border border-[#262a31] rounded px-2 py-1.5 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#f59e0b] focus:outline-none transition-colors"
                                        placeholder="0,00"
                                      />
                                    </div>
                                    <button
                                      onClick={() =>
                                        removeLub(servico.id, lub.id)
                                      }
                                      className="text-[#f87171] hover:text-[#fca5a5] transition-colors p-1.5"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>

                        {/* Resultado Financeiro Individual */}
                        <div className="bg-[rgba(0,165,114,.06)] border border-[rgba(0,165,114,.2)] rounded-md p-3">
                          <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider block mb-2">
                            Resultado Financeiro Individual
                          </span>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <span className="text-[9px] text-[#6b7280] uppercase block">
                                Receita Total
                              </span>
                              <p className="text-[13px] font-bold text-[#60a5fa] font-['JetBrains_Mono',monospace]">
                                {fmtR(lucroInfo.receita)}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px] text-[#6b7280] uppercase block">
                                Custo Total
                              </span>
                              <p className="text-[13px] font-bold text-[#f87171] font-['JetBrains_Mono',monospace]">
                                {fmtR(lucroInfo.custo)}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px] text-[#6b7280] uppercase block">
                                Lucro Bruto
                              </span>
                              <p
                                className={`text-[13px] font-bold font-['JetBrains_Mono',monospace] ${
                                  lucroInfo.lucro >= 0
                                    ? "text-[#00a572]"
                                    : "text-[#f87171]"
                                }`}
                              >
                                {fmtR(lucroInfo.lucro)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => removeServico(servico.id)}
                          className="flex items-center gap-1.5 text-[11px] text-[#f87171] hover:text-[#fca5a5] font-semibold transition-colors"
                        >
                          <Trash2 size={12} /> Excluir Serviço
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 5 — FECHAMENTO / DRE MENSAL
          ══════════════════════════════════════════════════════════════ */}

      <SectionCard
        title="Fechamento e Demonstrativo de Resultado Mensal"
        icon={<BarChart3 size={14} className="text-[#00a572]" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#262a31]">
                <th className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold py-2 px-3">
                  Indicador
                </th>
                <th className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold py-2 px-3 text-right">
                  Valor
                </th>
                <th className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold py-2 px-3 text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[rgba(38,42,49,.5)]">
                <td className="py-2.5 px-3 text-[12px] text-[#9ca3af]">
                  Quantidade Total de Serviços
                </td>
                <td className="py-2.5 px-3 text-[12px] font-bold text-white font-['JetBrains_Mono',monospace] text-right">
                  {calculos.totalServicos}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {calculos.totalServicos > 0 ? (
                    <CheckCircle2
                      size={13}
                      className="text-[#00a572] inline"
                    />
                  ) : (
                    <span className="text-[10px] text-[#6b7280]">—</span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-[rgba(38,42,49,.5)]">
                <td className="py-2.5 px-3 text-[12px] text-[#9ca3af]">
                  Receita de Serviços
                </td>
                <td className="py-2.5 px-3 text-[12px] font-bold text-[#60a5fa] font-['JetBrains_Mono',monospace] text-right">
                  {fmtR(calculos.receitaServicos)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <DollarSign size={13} className="text-[#60a5fa] inline" />
                </td>
              </tr>
              <tr className="border-b border-[rgba(38,42,49,.5)]">
                <td className="py-2.5 px-3 text-[12px] text-[#9ca3af]">
                  Receita de Produtos (Filtros/Óleos)
                </td>
                <td className="py-2.5 px-3 text-[12px] font-bold text-[#a78bfa] font-['JetBrains_Mono',monospace] text-right">
                  {fmtR(calculos.receitaProdutos)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <Package size={13} className="text-[#a78bfa] inline" />
                </td>
              </tr>
              <tr className="border-b border-[rgba(38,42,49,.5)]">
                <td className="py-2.5 px-3 text-[12px] text-[#9ca3af]">
                  Custo Total de Graxa
                </td>
                <td className="py-2.5 px-3 text-[12px] font-bold text-[#f87171] font-['JetBrains_Mono',monospace] text-right">
                  {fmtR(calculos.custoGraxa)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <Droplets size={13} className="text-[#f87171] inline" />
                </td>
              </tr>
              <tr className="border-b border-[rgba(38,42,49,.5)]">
                <td className="py-2.5 px-3 text-[12px] text-[#9ca3af]">
                  Custo Total de Filtros
                </td>
                <td className="py-2.5 px-3 text-[12px] font-bold text-[#f87171] font-['JetBrains_Mono',monospace] text-right">
                  {fmtR(calculos.custoFiltros)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <Filter size={13} className="text-[#f87171] inline" />
                </td>
              </tr>
              <tr className="border-b border-[rgba(38,42,49,.5)]">
                <td className="py-2.5 px-3 text-[12px] text-[#9ca3af]">
                  Custo Total de Lubrificantes
                </td>
                <td className="py-2.5 px-3 text-[12px] font-bold text-[#f87171] font-['JetBrains_Mono',monospace] text-right">
                  {fmtR(calculos.custoLubrificantes)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <Beaker size={13} className="text-[#f87171] inline" />
                </td>
              </tr>
              <tr className="border-b border-[rgba(38,42,49,.5)] bg-[rgba(0,165,114,.05)]">
                <td className="py-3 px-3 text-[12px] font-bold text-white">
                  Lucro Bruto Consolidado
                </td>
                <td
                  className={`py-3 px-3 text-[14px] font-bold font-['JetBrains_Mono',monospace] text-right ${
                    calculos.lucroBruto >= 0
                      ? "text-[#00a572]"
                      : "text-[#f87171]"
                  }`}
                >
                  {fmtR(calculos.lucroBruto)}
                </td>
                <td className="py-3 px-3 text-right">
                  {calculos.lucroBruto >= 0 ? (
                    <TrendingUp size={14} className="text-[#00a572] inline" />
                  ) : (
                    <TrendingDown
                      size={14}
                      className="text-[#f87171] inline"
                    />
                  )}
                </td>
              </tr>
              <tr className="bg-[rgba(0,165,114,.08)]">
                <td className="py-3 px-3 text-[12px] font-bold text-white">
                  Margem % Geral
                </td>
                <td className="py-3 px-3 text-right">
                  <span
                    className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${
                      calculos.margem >= 30
                        ? "text-[#00a572]"
                        : calculos.margem >= 15
                        ? "text-[#facc15]"
                        : "text-[#f87171]"
                    }`}
                  >
                    {fmtBR(calculos.margem, 1)}%
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  {calculos.margem >= 30 ? (
                    <CheckCircle2
                      size={14}
                      className="text-[#00a572] inline"
                    />
                  ) : calculos.margem >= 15 ? (
                    <AlertTriangle
                      size={14}
                      className="text-[#facc15] inline"
                    />
                  ) : (
                    <AlertTriangle
                      size={14}
                      className="text-[#f87171] inline"
                    />
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
