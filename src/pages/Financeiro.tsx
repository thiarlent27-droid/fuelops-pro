import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  DollarSign,
  Plus,
  Trash2,
  Landmark,
  FileText,
  Receipt,
  Percent,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { loadAllModuleData, saveAllModuleData, MODULE_NAMES } from "../services/supabasePersistence";

// ── TYPES ──────────────────────────────────────────────
interface CaixaRow {
  descricao: string;
  valor: string;
  recebido: string;
  descontado: string;
  pendente: string;
}

interface NotaPrazoRow {
  descricao: string;
  valor: string;
  justificativa: string;
}

interface ChequeRow {
  descricao: string;
  valor: string;
  justificativa: string;
}

interface DescontoRow {
  colaborador: string;
  quantidade: string;
}

interface DespesaRow {
  descricao: string;
  valor: string;
  centroCusto: string;
}

interface Margens {
  custoOperacao: string;
  margemBrutaLitros: string;
  margemBruta: string;
}

/** Complete period data stored per month */
interface PeriodData {
  caixas: CaixaRow[];
  notasPrazo: NotaPrazoRow[];
  cheques: ChequeRow[];
  descontos: DescontoRow[];
  despesas: DespesaRow[];
  margens: Margens;
  cancelamentosAtual: string;
}

// ── HELPERS ────────────────────────────────────────────
/** Parse Brazilian number format: "37.997,84" → 37997.84 */
function parseBR(s: string): number {
  if (!s || !s.trim() || s.trim() === "-") return 0;
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

/** Format number to BR display: 37997.84 → "37.997,84" */
function fmtBR(n: number, dec = 2): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmtR(n: number): string {
  return "R$ " + fmtBR(n, 2);
}

/** Build a unique storage key for a period (e.g. "2026-01") */
function makeKey(year: number, monthIdx: number): string {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
}

/** Days in month helper */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ── CONSTANTS ──────────────────────────────────────────
const STORAGE_KEY = "fuelops_financeiro_data";
const MODULO_NAME = MODULE_NAMES.FINANCEIRO;

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Margem de tolerância: 15% acima da média gera alerta */
const TOLERANCIA_CANCELAMENTOS = 15;

const CENTROS_CUSTO = [
  "USO E CONSUMO",
  "OPERAÇÕES",
  "MERCADORIA REVENDA",
  "FRETE",
  "OUTROS",
];

// ── DEFAULT ROWS ───────────────────────────────────────
const CAIXA_DEFAULTS: Omit<CaixaRow, "pendente">[] = [
  { descricao: "Número de cancelamentos", valor: "", recebido: "", descontado: "" },
  { descricao: "Faltas de Caixa", valor: "", recebido: "", descontado: "" },
  { descricao: "Vales Frentista caixas", valor: "", recebido: "", descontado: "" },
  { descricao: "Cheques Devolvidos", valor: "", recebido: "", descontado: "" },
];

const NOTAS_DEFAULTS: Omit<NotaPrazoRow, "justificativa">[] = [
  { descricao: "Notas Assinadas", valor: "" },
  { descricao: "Notas Recebidas", valor: "" },
  { descricao: "Notas em Atraso", valor: "" },
];

const CHEQUES_DEFAULTS: Omit<ChequeRow, "justificativa">[] = [
  { descricao: "Cheques", valor: "" },
  { descricao: "Cheques Recebidos", valor: "" },
  { descricao: "Cheques a Prazo", valor: "" },
  { descricao: "Cheques a Receber (devolvidos)", valor: "" },
];

// ── PERSISTENCE HELPERS ────────────────────────────────
function getDefaultPeriodData(): PeriodData {
  return {
    caixas: CAIXA_DEFAULTS.map((r) => ({ ...r, pendente: "" })),
    notasPrazo: NOTAS_DEFAULTS.map((r) => ({ ...r, justificativa: "" })),
    cheques: CHEQUES_DEFAULTS.map((r) => ({ ...r, justificativa: "" })),
    descontos: [],
    despesas: [],
    margens: { custoOperacao: "", margemBrutaLitros: "", margemBruta: "" },
    cancelamentosAtual: "",
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

// ── SECTION CARD ───────────────────────────────────────
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
  <div
    className={`bg-[#171717] border border-[#262a31] rounded-lg p-5 ${className}`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-[0.08em]">
          {title}
        </h3>
      </div>
    </div>
    {children}
  </div>
);

// ── BR Currency Input ─────────────────────────────────
const BRInput = ({
  value,
  onChange,
  placeholder = "0",
  className = "",
  mono = true,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  mono?: boolean;
}) => {
  const [rawValue, setRawValue] = useState(value);

  useEffect(() => {
    setRawValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    raw = raw.replace(/[^0-9,.]/g, "");
    const commaParts = raw.split(",");
    if (commaParts.length > 2) {
      raw = commaParts[0] + "," + commaParts.slice(1).join("");
    }
    if (commaParts.length === 2) {
      raw = raw.split(".")[0] + "," + commaParts[1];
    }
    setRawValue(raw);
    onChange(raw);
  };

  const handleBlur = () => {
    const parsed = parseBR(rawValue);
    if (parsed !== 0) {
      onChange(fmtBR(parsed));
    } else if (!rawValue.trim()) {
      onChange("");
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={rawValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[12px] text-white focus:border-[#00a572] focus:outline-none transition-colors ${
        mono ? "font-['JetBrains_Mono',monospace] text-right" : ""
      } ${className}`}
    />
  );
};

// ── MAIN COMPONENT ─────────────────────────────────────
export default function Financeiro() {
  // ── Period ──
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = Janeiro
  const [selectedYear, setSelectedYear] = useState(2026);
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const monthSelectorRef = useRef<HTMLDivElement>(null);

  // ── Persistence ──
  const allDataRef = useRef<Record<string, PeriodData>>({});
  const [loaded, setLoaded] = useState(false);
  const currentKey = makeKey(selectedYear, selectedMonth);

  // ── Form State (initialized with defaults) ──
  const [caixas, setCaixas] = useState<CaixaRow[]>(
    CAIXA_DEFAULTS.map((r) => ({ ...r, pendente: "" }))
  );
  const [notasPrazo, setNotasPrazo] = useState<NotaPrazoRow[]>(
    NOTAS_DEFAULTS.map((r) => ({ ...r, justificativa: "" }))
  );
  const [cheques, setCheques] = useState<ChequeRow[]>(
    CHEQUES_DEFAULTS.map((r) => ({ ...r, justificativa: "" }))
  );
  const [descontos, setDescontos] = useState<DescontoRow[]>([]);
  const [margens, setMargens] = useState<Margens>(
    { custoOperacao: "", margemBrutaLitros: "", margemBruta: "" }
  );
  const [despesas, setDespesas] = useState<DespesaRow[]>([]);
  const [cancelamentosAtual, setCancelamentosAtual] = useState<string>("");

  // Carregar dados do Supabase ao montar
  useEffect(() => {
    loadAllModuleData<PeriodData>(MODULO_NAME).then((data) => {
      allDataRef.current = data;
      setLoaded(true);
      const initStored = data[currentKey] || getDefaultPeriodData();
      setCaixas(initStored.caixas || CAIXA_DEFAULTS.map((r) => ({ ...r, pendente: "" })));
      setNotasPrazo(initStored.notasPrazo || NOTAS_DEFAULTS.map((r) => ({ ...r, justificativa: "" })));
      setCheques(initStored.cheques || CHEQUES_DEFAULTS.map((r) => ({ ...r, justificativa: "" })));
      setDescontos(initStored.descontos || []);
      setMargens(initStored.margens || { custoOperacao: "", margemBrutaLitros: "", margemBruta: "" });
      setDespesas(initStored.despesas || []);
      setCancelamentosAtual(initStored.cancelamentosAtual || "");
    }).catch(() => {
      allDataRef.current = loadFromStorage();
      setLoaded(true);
    });
  }, []);

  // ── Auto-save on every data change ──
  useEffect(() => {
    if (!loaded) return;
    const data: PeriodData = { caixas, notasPrazo, cheques, descontos, despesas, margens, cancelamentosAtual };
    allDataRef.current[currentKey] = data;
    saveAllModuleData(MODULO_NAME, allDataRef.current);
  }, [caixas, notasPrazo, cheques, descontos, despesas, margens, cancelamentosAtual, currentKey, loaded]);

  // ── Month selector data (dynamic based on selectedYear) ──
  const months = useMemo(() => {
    return MONTH_LABELS.map((label, idx) => {
      const days = getDaysInMonth(selectedYear, idx + 1);
      return {
        label,
        key: makeKey(selectedYear, idx),
        days: String(days),
      };
    });
  }, [selectedYear]);

  const monthLabel = `${MONTH_LABELS[selectedMonth]} ${selectedYear}`;

  // ── Save current state snapshot (helper) ──
  const snapshotCurrent = useCallback(() => {
    const data: PeriodData = { caixas, notasPrazo, cheques, descontos, despesas, margens, cancelamentosAtual };
    allDataRef.current[currentKey] = data;
    saveAllModuleData(MODULO_NAME, allDataRef.current);
  }, [caixas, notasPrazo, cheques, descontos, despesas, margens, cancelamentosAtual, currentKey]);

  // ── Load state for a given period key ──
  const loadPeriod = useCallback((key: string) => {
    const stored = allDataRef.current[key];
    const defaults = getDefaultPeriodData();
    setCaixas(stored?.caixas || defaults.caixas);
    setNotasPrazo(stored?.notasPrazo || defaults.notasPrazo);
    setCheques(stored?.cheques || defaults.cheques);
    setDescontos(stored?.descontos || defaults.descontos);
    setDespesas(stored?.despesas || defaults.despesas);
    setMargens(stored?.margens || defaults.margens);
    setCancelamentosAtual(stored?.cancelamentosAtual || defaults.cancelamentosAtual);
  }, []);

  // ── Handle month selection ──
  const handleMonthSelect = useCallback((monthIdx: number) => {
    snapshotCurrent();
    const newKey = makeKey(selectedYear, monthIdx);
    setSelectedMonth(monthIdx);
    setShowMonthMenu(false);
    loadPeriod(newKey);
  }, [snapshotCurrent, selectedYear, loadPeriod]);

  // ── Handle year navigation ──
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

  // ── Histórico de Cancelamentos (dynamic from localStorage) ──
  const historicoCancelamentos = useMemo(() => {
    const merged = { ...allDataRef.current };
    // Ensure current unsaved data is included
    merged[currentKey] = { caixas, notasPrazo, cheques, descontos, despesas, margens, cancelamentosAtual };

    const entries: { key: string; mes: string; cancelamentos: number }[] = [];

    for (const [key, data] of Object.entries(merged)) {
      const num = parseBR(data.cancelamentosAtual || "");
      if (num > 0) {
        const parts = key.split("-");
        if (parts.length === 2) {
          const year = parts[0];
          const monthIdx = parseInt(parts[1], 10) - 1;
          if (monthIdx >= 0 && monthIdx <= 11) {
            entries.push({ key, mes: `${MONTH_SHORT[monthIdx]}/${year}`, cancelamentos: num });
          }
        }
      }
    }

    entries.sort((a, b) => a.key.localeCompare(b.key));
    return entries.slice(-12);
  }, [cancelamentosAtual, currentKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const mediaCancelamentos = useMemo(() => {
    if (historicoCancelamentos.length === 0) return 0;
    const sum = historicoCancelamentos.reduce((acc, h) => acc + h.cancelamentos, 0);
    return sum / historicoCancelamentos.length;
  }, [historicoCancelamentos]);

  const cancelamentosAtualNum = useMemo(() => parseBR(cancelamentosAtual), [cancelamentosAtual]);

  const percentualDiferenca = useMemo(() => {
    if (mediaCancelamentos === 0 || cancelamentosAtualNum === 0) return null;
    return ((cancelamentosAtualNum - mediaCancelamentos) / mediaCancelamentos) * 100;
  }, [cancelamentosAtualNum, mediaCancelamentos]);

  const cancelamentosAlerta = useMemo(() => {
    if (percentualDiferenca === null) return false;
    return percentualDiferenca > TOLERANCIA_CANCELAMENTOS;
  }, [percentualDiferenca]);

  // ── Caixas Handlers ──
  const handleCaixaChange = useCallback((idx: number, field: keyof CaixaRow, val: string) => {
    setCaixas((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, [field]: val };
        const v = parseBR(updated.valor);
        const rec = parseBR(updated.recebido);
        const desc = parseBR(updated.descontado);
        const pendente = v - rec - desc;
        updated.pendente = pendente !== 0 ? fmtBR(pendente) : "";
        return updated;
      })
    );
  }, []);

  // ── Notas Prazo Handlers ──
  const handleNotaChange = useCallback((idx: number, field: keyof NotaPrazoRow, val: string) => {
    setNotasPrazo((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }, []);

  // ── Cheques Handlers ──
  const handleChequeChange = useCallback((idx: number, field: keyof ChequeRow, val: string) => {
    setCheques((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }, []);

  // ── Descontos Handlers ──
  const addDesconto = () => {
    setDescontos((prev) => [...prev, { colaborador: "", quantidade: "" }]);
  };

  const removeDesconto = (idx: number) => {
    setDescontos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDescontoChange = useCallback((idx: number, field: keyof DescontoRow, val: string) => {
    setDescontos((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }, []);

  // ── Despesas Handlers ──
  const addDespesa = useCallback(() => {
    setDespesas((prev) => [...prev, { descricao: "", valor: "", centroCusto: "" }]);
  }, []);

  const removeDespesa = useCallback((idx: number) => {
    setDespesas((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleDespesaChange = useCallback((idx: number, field: keyof DespesaRow, val: string) => {
    setDespesas((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }, []);

  // ── Margens Handler ──
  const handleMargemChange = useCallback((field: keyof Margens, val: string) => {
    setMargens((prev) => ({ ...prev, [field]: val }));
  }, []);

  // ── Totals ──
  const totalCaixas = useMemo(() => caixas.reduce((sum, r) => sum + parseBR(r.valor), 0), [caixas]);
  const totalCaixasRecebido = useMemo(() => caixas.reduce((sum, r) => sum + parseBR(r.recebido), 0), [caixas]);
  const totalCaixasDescontado = useMemo(() => caixas.reduce((sum, r) => sum + parseBR(r.descontado), 0), [caixas]);
  const totalCaixasPendente = useMemo(() => totalCaixas - totalCaixasRecebido - totalCaixasDescontado, [totalCaixas, totalCaixasRecebido, totalCaixasDescontado]);
  const totalNotas = useMemo(() => notasPrazo.reduce((sum, r) => sum + parseBR(r.valor), 0), [notasPrazo]);
  const totalCheques = useMemo(() => cheques.reduce((sum, r) => sum + parseBR(r.valor), 0), [cheques]);
  const totalDescontos = useMemo(() => descontos.reduce((sum, r) => sum + parseBR(r.quantidade), 0), [descontos]);
  const totalDespesas = useMemo(() => despesas.reduce((sum, r) => sum + parseBR(r.valor), 0), [despesas]);

  const balanceColor = (n: number) => n >= 0 ? "text-[#4edea3]" : "text-[#f87171]";

  return (
    <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-5">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between pb-4 border-b border-[#262a31]">
        <div>
          <h1 className="text-[20px] font-bold text-white tracking-[-0.3px]">
            Financeiro
          </h1>
          <p className="text-[11px] text-[#9ca3af] mt-1">
            Posto Carga Pesada — Lançamentos Manuais
          </p>
        </div>
        <div className="flex items-center gap-3">
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
              <div className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-[300px] bg-[#1d2027] border border-[#262a31] rounded-lg overflow-hidden z-30 shadow-[0_8px_32px_rgba(0,0,0,.5)]">
                {/* ── Year navigation: BOTH buttons visible ── */}
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

      {/* ══ CARD 1: CAIXAS ═══════════════════════════════ */}
      <SectionCard title="Caixas" icon={<Landmark size={13} className="text-[#4d8eff]" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#262a31]">
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Descrição</th>
                <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Valor (R$)</th>
                <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Recebido (R$)</th>
                <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Descontado (R$)</th>
                <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Pendente (R$)</th>
              </tr>
            </thead>
            <tbody>
              {/* ── Row 0: Número de Cancelamentos (special layout) ── */}
              {(() => {
                const row = caixas[0];
                const isAlert = cancelamentosAlerta;
                const bgColor = isAlert ? "bg-[rgba(239,68,68,.08)]" : "";
                const borderColor = isAlert ? "border-[rgba(239,68,68,.25)]" : "";
                return (
                  <tr
                    className={`border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)] ${bgColor} ${borderColor}`}
                  >
                    <td className="px-3 py-2 text-white font-medium">
                      <div className="flex items-center gap-2">
                        <span>{row.descricao}</span>
                        {isAlert && (
                          <span className="inline-flex items-center gap-1 bg-[rgba(239,68,68,.15)] border border-[rgba(239,68,68,.3)] text-[#f87171] text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
                            <AlertTriangle size={9} />
                            Alerta
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cancelamentosAtual}
                        onChange={(e) => {
                          let raw = e.target.value.replace(/[^0-9]/g, "");
                          setCancelamentosAtual(raw);
                        }}
                        placeholder="0"
                        className={`w-full bg-[#1d2027] border rounded px-2 py-1 text-[12px] text-white font-['JetBrains_Mono',monospace] text-right focus:outline-none transition-colors ${
                          isAlert
                            ? "border-[rgba(239,68,68,.4)] focus:border-[#f87171]"
                            : "border-[#262a31] focus:border-[#00a572]"
                        }`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[9px] text-[#6b7280] uppercase">Média:</span>
                        <span className="text-[12px] font-['JetBrains_Mono',monospace] text-[#9ca3af]">
                          {fmtBR(mediaCancelamentos, 1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2" colSpan={2}>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[9px] text-[#6b7280] uppercase">Diferença vs Média:</span>
                        {percentualDiferenca !== null ? (
                          <span
                            className={`text-[13px] font-bold font-['JetBrains_Mono',monospace] px-2 py-0.5 rounded ${
                              isAlert
                                ? "bg-[rgba(239,68,68,.12)] text-[#f87171]"
                                : "bg-[rgba(78,222,163,.08)] text-[#4edea3]"
                            }`}
                          >
                            {percentualDiferenca >= 0 ? "+" : ""}{percentualDiferenca.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-[12px] text-[#6b7280] font-['JetBrains_Mono',monospace]">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })()}

              {/* ── Rows 1-3: Other Caixas rows (standard layout) ── */}
              {caixas.slice(1).map((row, idx) => {
                const globalIdx = idx + 1;
                const pendenteVal = parseBR(row.valor) - parseBR(row.recebido) - parseBR(row.descontado);
                return (
                  <tr key={globalIdx} className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]">
                    <td className="px-3 py-2 text-white font-medium">{row.descricao}</td>
                    <td className="px-2 py-2">
                      <BRInput value={row.valor} onChange={(v) => handleCaixaChange(globalIdx, "valor", v)} />
                    </td>
                    <td className="px-2 py-2">
                      <BRInput value={row.recebido} onChange={(v) => handleCaixaChange(globalIdx, "recebido", v)} />
                    </td>
                    <td className="px-2 py-2">
                      <BRInput value={row.descontado} onChange={(v) => handleCaixaChange(globalIdx, "descontado", v)} />
                    </td>
                    <td className={`px-3 py-2 text-right font-['JetBrains_Mono',monospace] font-semibold ${balanceColor(pendenteVal)}`}>
                      {pendenteVal !== 0 ? fmtR(pendenteVal) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Histórico de Cancelamentos (12 meses — DYNAMIC from localStorage) ── */}
        <div className="mt-4 pt-3 border-t border-[#262a31]">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={11} className="text-[#6b7280]" />
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">
              Histórico de Cancelamentos — Últimos 12 Meses
            </span>
          </div>
          {historicoCancelamentos.length > 0 ? (
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {historicoCancelamentos.map((h) => (
                <div key={h.key} className="bg-[#1d2027] border border-[#262a31] rounded px-2 py-1.5 text-center">
                  <span className="text-[8px] text-[#6b7280] uppercase tracking-wider block">{h.mes.split("/")[0]}</span>
                  <span className="text-[11px] font-bold text-[#9ca3af] font-['JetBrains_Mono',monospace]">
                    {h.cancelamentos}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#1d2027] border border-[#262a31] border-dashed rounded px-4 py-3 text-center">
              <span className="text-[10px] text-[#6b7280]">
                Nenhum dado histórico disponível. A média será calculada quando houver dados dos últimos 12 meses.
              </span>
            </div>
          )}
          <div className="flex items-center justify-end gap-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">Média Mensal:</span>
              <span className="text-[12px] font-bold text-white font-['JetBrains_Mono',monospace]">
                {fmtBR(mediaCancelamentos, 1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#6b7280] uppercase tracking-wider font-semibold">Tolerância:</span>
              <span className="text-[11px] text-[#9ca3af] font-['JetBrains_Mono',monospace]">
                {`>${TOLERANCIA_CANCELAMENTOS}% acima`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-6 pt-3 mt-2 border-t border-[#262a31]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">Total Valor:</span>
            <span className="text-[13px] font-bold text-white font-['JetBrains_Mono',monospace]">{fmtR(totalCaixas)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">Recebido:</span>
            <span className="text-[13px] font-bold text-white font-['JetBrains_Mono',monospace]">{fmtR(totalCaixasRecebido)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">Descontado:</span>
            <span className="text-[13px] font-bold text-white font-['JetBrains_Mono',monospace]">{fmtR(totalCaixasDescontado)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">Saldo Pendente:</span>
            <span className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${balanceColor(totalCaixasPendente)}`}>
              {fmtR(totalCaixasPendente)}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* ══ CARD 2: NOTAS A PRAZO ═══════════════════════ */}
      <SectionCard title="Notas a Prazo" icon={<FileText size={13} className="text-[#a78bfa]" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#262a31]">
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Descrição</th>
                <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Valor (R$)</th>
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Justificativa quando houver</th>
              </tr>
            </thead>
            <tbody>
              {notasPrazo.map((row, idx) => (
                <tr key={idx} className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]">
                  <td className="px-3 py-2 text-white font-medium">{row.descricao}</td>
                  <td className="px-2 py-2">
                    <BRInput value={row.valor} onChange={(v) => handleNotaChange(idx, "valor", v)} />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.justificativa}
                      onChange={(e) => handleNotaChange(idx, "justificativa", e.target.value)}
                      placeholder="—"
                      className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[12px] text-[#9ca3af] focus:border-[#00a572] focus:outline-none transition-colors"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-4 pt-3 mt-2 border-t border-[#262a31]">
          <span className="text-[11px] text-[#9ca3af] font-semibold uppercase tracking-wider">Total Notas a Prazo</span>
          <span className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${balanceColor(totalNotas)}`}>
            {fmtR(totalNotas)}
          </span>
        </div>
      </SectionCard>

      {/* ══ CARD 3: CHEQUES ═════════════════════════════ */}
      <SectionCard title="Cheques" icon={<Receipt size={13} className="text-[#f59e0b]" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#262a31]">
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Descrição</th>
                <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Valor (R$)</th>
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Justificativa quando houver</th>
              </tr>
            </thead>
            <tbody>
              {cheques.map((row, idx) => (
                <tr key={idx} className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]">
                  <td className="px-3 py-2 text-white font-medium">{row.descricao}</td>
                  <td className="px-2 py-2">
                    <BRInput value={row.valor} onChange={(v) => handleChequeChange(idx, "valor", v)} />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.justificativa}
                      onChange={(e) => handleChequeChange(idx, "justificativa", e.target.value)}
                      placeholder="—"
                      className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[12px] text-[#9ca3af] focus:border-[#00a572] focus:outline-none transition-colors"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-4 pt-3 mt-2 border-t border-[#262a31]">
          <span className="text-[11px] text-[#9ca3af] font-semibold uppercase tracking-wider">Total Cheques</span>
          <span className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${balanceColor(totalCheques)}`}>
            {fmtR(totalCheques)}
          </span>
        </div>
      </SectionCard>

      {/* ══ CARD 4: DESCONTOS / AUTORIZAÇÕES ═════════════ */}
      <SectionCard title="Descontos / Autorizações" icon={<Percent size={13} className="text-[#f87171]" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#262a31]">
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Colaborador</th>
                <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Quantidade Autorizada</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {descontos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-[12px] text-[#6b7280]">
                    Nenhum colaborador cadastrado. Clique em <span className="text-[#4edea3] font-semibold">"+"</span> para adicionar.
                  </td>
                </tr>
              ) : (
                descontos.map((row, idx) => (
                  <tr key={idx} className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]">
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.colaborador}
                        onChange={(e) => handleDescontoChange(idx, "colaborador", e.target.value)}
                        placeholder="Nome do colaborador"
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <BRInput value={row.quantidade} onChange={(v) => handleDescontoChange(idx, "quantidade", v)} />
                    </td>
                    <td className="px-1">
                      <button
                        onClick={() => removeDesconto(idx)}
                        className="p-1 rounded hover:bg-[rgba(239,68,68,.1)] text-[#6b7280] hover:text-[#f87171] transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#262a31]">
          <button
            onClick={addDesconto}
            className="flex items-center gap-1.5 bg-[rgba(78,222,163,.08)] hover:bg-[rgba(78,222,163,.15)] border border-[rgba(78,222,163,.2)] text-[#4edea3] text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            <Plus size={13} />
            Adicionar Colaborador
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">Total Autorizado:</span>
            <span className={`text-[13px] font-bold font-['JetBrains_Mono',monospace] ${balanceColor(totalDescontos)}`}>
              {fmtBR(totalDescontos)}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* ══ CARD 5: DESPESAS ═══════════════════════════ */}
      <SectionCard title="Despesas" icon={<FileText size={13} className="text-[#f59e0b]" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#262a31]">
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Descrição</th>
                <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Valor (R$)</th>
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">Centro de Custo</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {despesas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-[12px] text-[#6b7280]">
                    Nenhuma despesa cadastrada. Clique em <span className="text-[#4edea3] font-semibold">"+"</span> para adicionar.
                  </td>
                </tr>
              ) : (
                despesas.map((row, idx) => (
                  <tr key={idx} className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]">
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.descricao}
                        onChange={(e) => handleDespesaChange(idx, "descricao", e.target.value)}
                        placeholder="Descrição da despesa"
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <BRInput value={row.valor} onChange={(v) => handleDespesaChange(idx, "valor", v)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={row.centroCusto}
                        onChange={(e) => handleDespesaChange(idx, "centroCusto", e.target.value)}
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] text-[#9ca3af] focus:border-[#00a572] focus:outline-none transition-colors appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
                      >
                        <option value="">Selecionar...</option>
                        {CENTROS_CUSTO.map((cc) => (
                          <option key={cc} value={cc}>{cc}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1">
                      <button
                        onClick={() => removeDespesa(idx)}
                        className="p-1 rounded hover:bg-[rgba(239,68,68,.1)] text-[#6b7280] hover:text-[#f87171] transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#262a31]">
          <button
            onClick={addDespesa}
            className="flex items-center gap-1.5 bg-[rgba(78,222,163,.08)] hover:bg-[rgba(78,222,163,.15)] border border-[rgba(78,222,163,.2)] text-[#4edea3] text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            <Plus size={13} />
            Adicionar Despesa
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">Total Despesas:</span>
            <span className="text-[14px] font-bold font-['JetBrains_Mono',monospace] text-[#f59e0b]">
              {fmtR(totalDespesas)}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* ══ CARD 6: MARGENS E CUSTOS OPERACIONAIS ═════════ */}
      <SectionCard title="Margens e Custos Operacionais" icon={<TrendingUp size={13} className="text-[#22d3ee]" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-2 font-semibold">
              Custo de Operação
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#6b7280]">R$</span>
              <BRInput value={margens.custoOperacao} onChange={(v) => handleMargemChange("custoOperacao", v)} placeholder="0,00" />
            </div>
          </div>

          <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-2 font-semibold">
              Margem Bruta Litros
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#6b7280]">R$</span>
              <BRInput value={margens.margemBrutaLitros} onChange={(v) => handleMargemChange("margemBrutaLitros", v)} placeholder="0,00" />
            </div>
          </div>

          <div className="bg-[#1d2027] border border-[#262a31] rounded-lg p-4">
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-2 font-semibold">
              Margem Bruta
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#6b7280]">R$</span>
              <BRInput value={margens.margemBruta} onChange={(v) => handleMargemChange("margemBruta", v)} placeholder="0,00" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-6 pt-4 mt-4 border-t border-[#262a31]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">Custo Operação:</span>
            <span className="text-[13px] font-bold text-white font-['JetBrains_Mono',monospace]">
              {parseBR(margens.custoOperacao) !== 0 ? fmtR(parseBR(margens.custoOperacao)) : "-"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">Margem Bruta Litros:</span>
            <span className={`text-[13px] font-bold font-['JetBrains_Mono',monospace] ${balanceColor(parseBR(margens.margemBrutaLitros))}`}>
              {parseBR(margens.margemBrutaLitros) !== 0 ? fmtR(parseBR(margens.margemBrutaLitros)) : "-"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">Margem Bruta:</span>
            <span className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${balanceColor(parseBR(margens.margemBruta))}`}>
              {parseBR(margens.margemBruta) !== 0 ? fmtR(parseBR(margens.margemBruta)) : "-"}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* ══ RESUMO GERAL ════════════════════════════════ */}
      <div className="bg-[#171717] border border-[#262a31] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={13} className="text-[#4edea3]" />
          <h3 className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-[0.08em]">
            Resumo Financeiro
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-[#1d2027] border border-[#262a31] rounded-md p-3 text-center">
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">Caixas (Pendente)</span>
            <span className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${balanceColor(totalCaixasPendente)}`}>
              {fmtR(totalCaixasPendente)}
            </span>
          </div>
          <div className="bg-[#1d2027] border border-[#262a31] rounded-md p-3 text-center">
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">Notas a Prazo</span>
            <span className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${balanceColor(totalNotas)}`}>
              {fmtR(totalNotas)}
            </span>
          </div>
          <div className="bg-[#1d2027] border border-[#262a31] rounded-md p-3 text-center">
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">Cheques</span>
            <span className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${balanceColor(totalCheques)}`}>
              {fmtR(totalCheques)}
            </span>
          </div>
          <div className="bg-[#1d2027] border border-[#262a31] rounded-md p-3 text-center">
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">Descontos</span>
            <span className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${balanceColor(totalDescontos)}`}>
              {fmtBR(totalDescontos)}
            </span>
          </div>
          <div className="bg-[#1d2027] border border-[#262a31] rounded-md p-3 text-center">
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">Despesas</span>
            <span className="text-[14px] font-bold font-['JetBrains_Mono',monospace] text-[#f59e0b]">
              {fmtR(totalDespesas)}
            </span>
          </div>
          <div className="bg-[#1d2027] border border-[#262a31] rounded-md p-3 text-center">
            <span className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">Margem Bruta</span>
            <span className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${balanceColor(parseBR(margens.margemBruta))}`}>
              {parseBR(margens.margemBruta) !== 0 ? fmtR(parseBR(margens.margemBruta)) : "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
