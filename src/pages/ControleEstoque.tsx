import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  Save,
  Plus,
  Trash2,
  Package,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Truck,
  BarChart3,
} from "lucide-react";

// ── TYPES ──────────────────────────────────────────────
interface BicoData {
  bico: string;
  resultado: number;
  vendas: number;
  perdasSobras: number;
  tipo: string;
  preco: number;
  impacto: number;
}

interface PerdasSobrasLMC {
  produto: string;
  perdasSobras: number;
  impacto: number;
}

interface Pedido {
  fornecedor: string;
  descricao: string;
  valor: number;
  previsaoChega: string;
  classe: string;
}

interface Afericoes {
  diasComEstoque: number;
  qtdItensCadastrados: number;
  numItensVendidos: number;
  qtdTotalItens: number;
  precisaoEstoque: number;
  qtdItensPendentes: number;
  itensMalArmazenados: number;
  organizacaoEstoque: string;
  auditoriaEstoque: string;
  dataAuditoria: string;
}

// ── HELPERS ────────────────────────────────────────────
function parseBR(s: string): number {
  if (!s || !s.trim() || s.trim() === "-") return 0;
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

function fmtN(n: number, dec = 0): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmtR(n: number): string {
  return "R$ " + fmtN(n, 2);
}

function parseCsvRows(text: string, delim = ";") {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(delim).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(delim);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (vals[i] || "").trim()));
    return row;
  });
}

const PRECO_DEFAULTS: Record<string, number> = {
  ETANOL: 4.59,
  GASOLINA: 6.19,
  S500: 5.69,
  S10: 5.79,
  ARLA: 3.79,
};

const TIPO_PRECO_MAP: Record<string, string> = {
  ETANOL: "ETANOL",
  "ETANOL HIDRATADO COMUM": "ETANOL",
  GASOLINA: "GASOLINA",
  "GASOLINA C COMUM": "GASOLINA",
  S500: "S500",
  "OLEO DIESEL B S500 COMUM": "S500",
  S10: "S10",
  "OLEO DIESEL B S10 COMUM": "S10",
  ARLA: "ARLA",
  ARLA32: "ARLA",
};

function getPrecoKey(tipo: string): string {
  const upper = tipo.toUpperCase().trim();
  if (TIPO_PRECO_MAP[upper]) return TIPO_PRECO_MAP[upper];
  if (upper.includes("ETANOL")) return "ETANOL";
  if (upper.includes("GASOLINA")) return "GASOLINA";
  if (upper.includes("S500")) return "S500";
  if (upper.includes("S10")) return "S10";
  if (upper.includes("ARLA")) return "ARLA";
  return "GASOLINA";
}

const TIPO_BADGE: Record<string, string> = {
  ARLA: "b-amber",
  ETANOL: "b-purple",
  "ETANOL HIDRATADO COMUM": "b-purple",
  GASOLINA: "b-red",
  "GASOLINA C COMUM": "b-red",
  S500: "b-green",
  "OLEO DIESEL B S500 COMUM": "b-green",
  S10: "b-blue",
  "OLEO DIESEL B S10 COMUM": "b-blue",
};

function getBadgeClass(tipo: string): string {
  const upper = tipo.toUpperCase().trim();
  return TIPO_BADGE[upper] || TIPO_BADGE[getPrecoKey(upper)] || "b-amber";
}

const TIPO_COLORS: Record<string, string> = {
  ARLA: "#f59e0b",
  ETANOL: "#a78bfa",
  "ETANOL HIDRATADO COMUM": "#a78bfa",
  GASOLINA: "#f87171",
  "GASOLINA C COMUM": "#f87171",
  S500: "#4edea3",
  "OLEO DIESEL B S500 COMUM": "#4edea3",
  S10: "#4d8eff",
  "OLEO DIESEL B S10 COMUM": "#4d8eff",
};

function getTipoColor(tipo: string): string {
  const upper = tipo.toUpperCase().trim();
  return TIPO_COLORS[upper] || "#6b7280";
}

// ── Editable Input Component (stable — defined outside parent) ──
const EditInput = ({
  value,
  onChange,
  type = "number",
  prefix,
  suffix,
  className = "",
  mono = true,
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  mono?: boolean;
}) => (
  <div className={`flex items-center gap-1 ${className}`}>
    {prefix && (
      <span className="text-[10px] text-[#6b7280]">{prefix}</span>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[12px] text-white focus:border-[#00a572] focus:outline-none transition-colors ${
        mono ? "font-['JetBrains_Mono',monospace]" : ""
      }`}
    />
    {suffix && (
      <span className="text-[10px] text-[#6b7280] whitespace-nowrap">
        {suffix}
      </span>
    )}
  </div>
);

// ── Section Card (stable — defined outside parent) ──
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

// ── MAIN COMPONENT ─────────────────────────────────────
export default function ControleEstoque() {
  // ── State ──
  const [periodoInicio, setPeriodoInicio] = useState("2026-01-01");
  const [periodoFim, setPeriodoFim] = useState("2026-01-31");
  const [bicos, setBicos] = useState<BicoData[]>([]);
  const [rawResultado, setRawResultado] = useState<Record<number, string>>({});
  const [perdasSobras, setPerdasSobras] = useState<PerdasSobrasLMC[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [precios, setPrecios] = useState<Record<string, number>>({
    ...PRECO_DEFAULTS,
  });
  const [afericoes, setAfericoes] = useState<Afericoes>({
    diasComEstoque: 0,
    qtdItensCadastrados: 0,
    numItensVendidos: 0,
    qtdTotalItens: 0,
    precisaoEstoque: 0,
    qtdItensPendentes: 0,
    itensMalArmazenados: 0,
    organizacaoEstoque: "",
    auditoriaEstoque: "",
    dataAuditoria: "",
  });
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const monthSelectorRef = useRef<HTMLDivElement>(null);
  const [importStatus, setImportStatus] = useState<{
    bicos: boolean;
    perdas: boolean;
  }>({ bicos: false, perdas: false });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLog, setImportLog] = useState<
    { name: string; status: string; ok: boolean }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Month selector data ──
  const months = [
    { label: "Janeiro", value: "2026-01", days: "31" },
    { label: "Fevereiro", value: "2026-02", days: "28" },
    { label: "Março", value: "2026-03", days: "31" },
    { label: "Abril", value: "2026-04", days: "30" },
    { label: "Maio", value: "2026-05", days: "31" },
    { label: "Junho", value: "2026-06", days: "30" },
    { label: "Julho", value: "2026-07", days: "31" },
    { label: "Agosto", value: "2026-08", days: "31" },
    { label: "Setembro", value: "2026-09", days: "30" },
    { label: "Outubro", value: "2026-10", days: "31" },
    { label: "Novembro", value: "2026-11", days: "30" },
    { label: "Dezembro", value: "2026-12", days: "31" },
  ];

  const currentMonth = months.find((m) => m.value === periodoInicio.slice(0, 7));
  const monthLabel = currentMonth ? currentMonth.label + " 2026" : "Selecionar mês";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (monthSelectorRef.current && !monthSelectorRef.current.contains(e.target as Node)) {
        setShowMonthMenu(false);
      }
    };
    if (showMonthMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMonthMenu]);

  // ── Calculated values ──
  const totalImpactoBicos = useMemo(
    () => bicos.reduce((s, b) => s + b.impacto, 0),
    [bicos]
  );

  const totalPerdasSobras = useMemo(
    () => perdasSobras.reduce((s, p) => s + p.perdasSobras, 0),
    [perdasSobras]
  );

  const totalImpactoPerdas = useMemo(
    () => perdasSobras.reduce((s, p) => s + p.impacto, 0),
    [perdasSobras]
  );

  const totalPedidos = useMemo(
    () => pedidos.reduce((s, p) => s + p.valor, 0),
    [pedidos]
  );

  // ── Group bicos by type ──
  const bicosPorTipo = useMemo(() => {
    const groups: Record<string, BicoData[]> = {};
    bicos.forEach((b) => {
      const key = getPrecoKey(b.tipo);
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return groups;
  }, [bicos]);

  const tipoOrder = ["ETANOL", "GASOLINA", "S500", "S10", "ARLA"];

  // ── CSV Import ──
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const newLog: { name: string; status: string; ok: boolean }[] = [];

      files.forEach((file) => {
        const fn = file.name.toLowerCase();
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          if (fn.includes("bico")) {
            // Parse Vendas por Bico
            const rows = parseCsvRows(text);
            const parsed: BicoData[] = rows
              .map((r) => {
                const tipo = (
                  r["agrupamento"] ||
                  r["prl_ds_produto_lmc"] ||
                  ""
                ).trim();
                const precoKey = getPrecoKey(tipo);
                const vendas = parseBR(r["vei_vl_quantidade"]);
                const preco = parseBR(r["vei_vl_media"]) || precios[precoKey] || 0;
                return {
                  bico: r["bic_ds_referencia"] || "",
                  resultado: 0,
                  vendas,
                  perdasSobras: 0,
                  tipo,
                  preco,
                  impacto: 0,
                };
              })
              .filter((b) => b.bico);
            setBicos(parsed);
            setImportStatus((prev) => ({ ...prev, bicos: true }));
            newLog.push({
              name: file.name,
              status: `Bicos importados: ${parsed.length}`,
              ok: true,
            });
          } else if (fn.includes("perda") || fn.includes("sobra") || fn.includes("lmc")) {
            // Parse Perdas e Sobras LMC
            const rows = parseCsvRows(text);
            const parsed: PerdasSobrasLMC[] = rows
              .map((r) => {
                const produto = (r["prl_ds_produto_lmc"] || "").trim();
                const perdasSobras = parseBR(r["lmc_vl_perda_sobra"]);
                const precoKey = getPrecoKey(produto);
                const preco = precios[precoKey] || 0;
                return {
                  produto,
                  perdasSobras,
                  impacto: perdasSobras * preco,
                };
              })
              .filter((p) => p.produto);
            setPerdasSobras(parsed);
            setImportStatus((prev) => ({ ...prev, perdas: true }));
            newLog.push({
              name: file.name,
              status: `Produtos importados: ${parsed.length}`,
              ok: true,
            });
          } else {
            newLog.push({
              name: file.name,
              status: "Arquivo não reconhecido",
              ok: false,
            });
          }
          setImportLog((prev) => [...newLog, ...prev]);
        };
        reader.readAsText(file, "UTF-8");
      });
      e.target.value = "";
    },
    [precios]
  );

  // ── Recalculate bico impacts when prices change ──
  const recalcBicos = useCallback(
    (newPrecios: Record<string, number>) => {
      setBicos((prev) =>
        prev.map((b) => {
          const precoKey = getPrecoKey(b.tipo);
          const preco = newPrecios[precoKey] || b.preco;
          const perdasSobras = (b.vendas * b.resultado) / 20;
          const impacto = perdasSobras * preco;
          return { ...b, preco, perdasSobras, impacto };
        })
      );
    },
    []
  );

  const handleBicoResultado = (idx: number, val: number) => {
    setBicos((prev) =>
      prev.map((b, i) => {
        if (i !== idx) return b;
        const perdasSobras = (b.vendas * val) / 20;
        const impacto = perdasSobras * b.preco;
        return { ...b, resultado: val, perdasSobras, impacto };
      })
    );
  };

  const handlePrecoChange = (key: string, val: number) => {
    const newPrecios = { ...precios, [key]: val };
    setPrecios(newPrecios);
    recalcBicos(newPrecios);
    // Recalculate perdasSobras impact when prices change
    setPerdasSobras((prev) =>
      prev.map((p) => {
        const precoKey = getPrecoKey(p.produto);
        const preco = newPrecios[precoKey] || 0;
        return { ...p, impacto: p.perdasSobras * preco };
      })
    );
  };

  const handleAfericaoChange = (field: keyof Afericoes, val: string) => {
    setAfericoes((prev) => ({
      ...prev,
      [field]:
        field === "organizacaoEstoque" ||
        field === "auditoriaEstoque" ||
        field === "dataAuditoria"
          ? val
          : parseFloat(val) || 0,
    }));
  };

  // ── Pedidos CRUD ──
  const addPedido = () => {
    setPedidos((prev) => [
      ...prev,
      { fornecedor: "", descricao: "", valor: 0, previsaoChega: "", classe: "Consumo" },
    ]);
  };

  const removePedido = (idx: number) => {
    setPedidos((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePedido = (idx: number, field: keyof Pedido, val: string) => {
    setPedidos((prev) =>
      prev.map((p, i) =>
        i === idx
          ? {
              ...p,
              [field]:
                field === "valor" ? parseFloat(val) || 0 : val,
            }
          : p
      )
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-[#262a31]">
        <div>
          <h1 className="text-[20px] font-bold text-white tracking-[-0.3px]">
            Controle de Estoque
          </h1>
          <p className="text-[11px] text-[#9ca3af] mt-1">
            Posto Carga Pesada
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month Selector - estilo Gestão de Operações */}
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
              <div className="absolute top-[calc(100%+6px)] left-0 min-w-[260px] bg-[#1d2027] border border-[#262a31] rounded-lg overflow-hidden z-30 shadow-[0_8px_32px_rgba(0,0,0,.5)]">
                <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#6b7280] py-2.5 px-3.5 pb-1 font-['JetBrains_Mono',monospace]">
                  Meses disponíveis
                </div>
                {months.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => {
                      setPeriodoInicio(m.value + "-01");
                      setPeriodoFim(m.value + "-" + m.days);
                      setShowMonthMenu(false);
                    }}
                    className={`flex items-center justify-between w-full px-3.5 py-2.5 text-[12px] border-b border-[rgba(38,42,49,.4)] last:border-b-0 transition-colors ${
                      m.value + "-01" === periodoInicio
                        ? "text-white bg-[rgba(0,165,114,.08)]"
                        : "text-[#9ca3af] hover:bg-[#262a31] hover:text-white"
                    }`}
                  >
                    <span className="font-medium">{m.label}</span>
                    <span className="text-[9px] font-['JetBrains_Mono',monospace] text-[#6b7280]">{m.value}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Import Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-[#4d8eff] hover:bg-[#3d7eef] text-white text-[11px] font-bold px-4 py-2 rounded-md transition-colors tracking-wide"
          >
            <Upload size={13} strokeWidth={2} />
            Importar CSVs
          </button>
        </div>
      </div>

      {/* Import Status Badges */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 text-[10px] font-['JetBrains_Mono',monospace] px-3 py-1.5 rounded-md border ${
            importStatus.bicos
              ? "bg-[rgba(78,222,163,.08)] border-[rgba(78,222,163,.2)] text-[#4edea3]"
              : "bg-[#1d2027] border-[#262a31] text-[#6b7280]"
          }`}
        >
          {importStatus.bicos ? (
            <CheckCircle2 size={12} />
          ) : (
            <AlertCircle size={12} />
          )}
          Vendas por Bico
        </div>
        <div
          className={`flex items-center gap-2 text-[10px] font-['JetBrains_Mono',monospace] px-3 py-1.5 rounded-md border ${
            importStatus.perdas
              ? "bg-[rgba(78,222,163,.08)] border-[rgba(78,222,163,.2)] text-[#4edea3]"
              : "bg-[#1d2027] border-[#262a31] text-[#6b7280]"
          }`}
        >
          {importStatus.perdas ? (
            <CheckCircle2 size={12} />
          ) : (
            <AlertCircle size={12} />
          )}
          Perdas e Sobras LMC
        </div>
      </div>

      {/* ── SECTION: PRODUTOS ── */}
      <SectionCard
        title="PRODUTOS"
        icon={<BarChart3 size={13} className="text-[#4d8eff]" />}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">
              Dias com Estoque
            </label>
            <EditInput
              value={afericoes.diasComEstoque}
              onChange={(v) => handleAfericaoChange("diasComEstoque", v)}
            />
          </div>
          <div>
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">
              Qtd Itens Cadastrados
            </label>
            <EditInput
              value={afericoes.qtdItensCadastrados}
              onChange={(v) => handleAfericaoChange("qtdItensCadastrados", v)}
            />
          </div>
          <div>
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">
              Nº Itens Vendidos
            </label>
            <EditInput
              value={afericoes.numItensVendidos}
              onChange={(v) => handleAfericaoChange("numItensVendidos", v)}
            />
          </div>
          <div>
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">
              Qtd Total de Itens
            </label>
            <EditInput
              value={afericoes.qtdTotalItens}
              onChange={(v) => handleAfericaoChange("qtdTotalItens", v)}
            />
          </div>
          <div>
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">
              Precisão de Estoque
            </label>
            <EditInput
              value={afericoes.precisaoEstoque}
              onChange={(v) => handleAfericaoChange("precisaoEstoque", v)}
              suffix="%"
            />
          </div>
          <div>
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">
              Qtd Itens Pendentes
            </label>
            <EditInput
              value={afericoes.qtdItensPendentes}
              onChange={(v) => handleAfericaoChange("qtdItensPendentes", v)}
            />
          </div>
          <div>
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">
              Itens Mal/Fora Armaz.
            </label>
            <EditInput
              value={afericoes.itensMalArmazenados}
              onChange={(v) => handleAfericaoChange("itensMalArmazenados", v)}
            />
          </div>
          <div>
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">
              Organização Estoque
            </label>
            <EditInput
              value={afericoes.organizacaoEstoque}
              onChange={(v) => handleAfericaoChange("organizacaoEstoque", v)}
              type="text"
              mono={false}
            />
          </div>
          <div>
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">
              Auditoria Estoque
            </label>
            <EditInput
              value={afericoes.auditoriaEstoque}
              onChange={(v) => handleAfericaoChange("auditoriaEstoque", v)}
              type="text"
              mono={false}
            />
          </div>
          <div>
            <label className="text-[9px] text-[#6b7280] uppercase tracking-wider block mb-1">
              Data Auditoria
            </label>
            <EditInput
              value={afericoes.dataAuditoria}
              onChange={(v) => handleAfericaoChange("dataAuditoria", v)}
              type="text"
              mono={false}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── SECTION: Preços por Produto ── */}
      <SectionCard
        title="Preços por Produto (R$/L)"
        icon={<Edit3 size={13} className="text-[#4edea3]" />}
      >
        <div className="grid grid-cols-5 gap-4">
          {[
            { key: "ETANOL", label: "Etanol", color: "#a78bfa" },
            { key: "GASOLINA", label: "Gasolina", color: "#f87171" },
            { key: "S500", label: "S500", color: "#4edea3" },
            { key: "S10", label: "S10", color: "#4d8eff" },
            { key: "ARLA", label: "Arla", color: "#f59e0b" },
          ].map(({ key, label, color }) => (
            <div key={key}>
              <label
                className="text-[9px] uppercase tracking-wider block mb-1 font-semibold"
                style={{ color }}
              >
                {label}
              </label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#6b7280]">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={precios[key]}
                  onChange={(e) =>
                    handlePrecoChange(key, parseFloat(e.target.value) || 0)
                  }
                  className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[12px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors"
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── SECTION: Bicos Table ── */}
      <SectionCard
        title="Bicos — Vendas e Aferição"
        icon={<Package size={13} className="text-[#a78bfa]" />}
      >
        {bicos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[12px] text-[#6b7280]">
              Importe o CSV de{" "}
              <span className="text-[#4edea3] font-semibold">
                Vendas por Bico
              </span>{" "}
              para carregar os dados.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tipoOrder.map((tipo) => {
              const items = bicosPorTipo[tipo];
              if (!items || !items.length) return null;
              const tipoTotal = items.reduce((s, b) => s + b.vendas, 0);
              const tipoImpacto = items.reduce((s, b) => s + b.impacto, 0);
              const color = getTipoColor(tipo);
              const badgeClass = getBadgeClass(tipo);

              return (
                <div key={tipo}>
                  {/* Group Header */}
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-md mb-1"
                    style={{
                      background: `${color}11`,
                      border: `1px solid ${color}22`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border`}
                        style={{
                          background: `${color}18`,
                          color,
                          borderColor: `${color}30`,
                        }}
                      >
                        {tipo}
                      </span>
                      <span className="text-[11px] text-[#9ca3af]">
                        {items.length} bico{items.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 font-['JetBrains_Mono',monospace] text-[11px]">
                      <span className="text-white font-semibold">
                        {fmtN(tipoTotal, 0)} L
                      </span>
                      <span
                        className={
                          tipoImpacto >= 0 ? "text-[#4edea3]" : "text-[#f87171]"
                        }
                      >
                        {fmtR(tipoImpacto)}
                      </span>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-[#262a31]">
                          <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2">
                            Bico
                          </th>
                          <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2">
                            Resultado
                          </th>
                          <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2">
                            Vendas (L)
                          </th>
                          <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2">
                            Perdas/Sobras
                          </th>
                          <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2">
                            Preço (R$)
                          </th>
                          <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2">
                            Impacto (R$)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((b) => {
                          const globalIdx = bicos.indexOf(b);
                          return (
                            <tr
                              key={b.bico}
                              className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]"
                            >
                              <td className="px-2 py-1.5 text-white font-['JetBrains_Mono',monospace]">
                                {b.bico}
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={
                                    globalIdx in rawResultado
                                      ? rawResultado[globalIdx]
                                      : b.resultado === 0
                                      ? ""
                                      : String(b.resultado).replace(".", ",")
                                  }
                                  onChange={(e) => {
                                    let raw = e.target.value;
                                    // Allow only valid numeric chars (digits, comma, leading minus)
                                    raw = raw.replace(/[^0-9,\-]/g, "");
                                    // Only allow one minus at the start
                                    raw = raw.replace(/(?!^)-/g, "");
                                    // Only allow one comma
                                    const parts = raw.split(",");
                                    if (parts.length > 2) {
                                      raw = parts[0] + "," + parts.slice(1).join("");
                                    }
                                    setRawResultado((prev) => ({
                                      ...prev,
                                      [globalIdx]: raw,
                                    }));
                                    const parsed = parseFloat(
                                      raw.replace(",", ".")
                                    );
                                    if (!isNaN(parsed)) {
                                      handleBicoResultado(globalIdx, parsed);
                                    }
                                  }}
                                  onBlur={() => {
                                    const raw =
                                      rawResultado[globalIdx] ?? "";
                                    const parsed = parseFloat(
                                      raw.replace(",", ".")
                                    );
                                    handleBicoResultado(
                                      globalIdx,
                                      isNaN(parsed) ? 0 : parsed
                                    );
                                    setRawResultado((prev) => {
                                      const next = { ...prev };
                                      delete next[globalIdx];
                                      return next;
                                    });
                                  }}
                                  className="w-32 min-w-[128px] bg-[#1d2027] border border-[#262a31] rounded px-2.5 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors text-center"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-right text-white font-['JetBrains_Mono',monospace]">
                                {fmtN(b.vendas, 3)}
                              </td>
                              <td
                                className={`px-2 py-1.5 text-right font-['JetBrains_Mono',monospace] ${
                                  b.perdasSobras >= 0
                                    ? "text-[#4edea3]"
                                    : "text-[#f87171]"
                                }`}
                              >
                                {fmtN(b.perdasSobras, 3)}
                              </td>
                              <td className="px-2 py-1.5 text-right text-[#9ca3af] font-['JetBrains_Mono',monospace]">
                                {b.preco.toFixed(2)}
                              </td>
                              <td
                                className={`px-2 py-1.5 text-right font-['JetBrains_Mono',monospace] font-semibold ${
                                  b.impacto >= 0
                                    ? "text-[#4edea3]"
                                    : "text-[#f87171]"
                                }`}
                              >
                                {fmtR(b.impacto)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Total Impacto Bicos */}
            <div className="flex items-center justify-end gap-4 pt-3 border-t border-[#262a31]">
              <span className="text-[11px] text-[#9ca3af] font-semibold uppercase tracking-wider">
                Total Impacto Bicos
              </span>
              <span
                className={`text-[14px] font-bold font-['JetBrains_Mono',monospace] ${
                  totalImpactoBicos >= 0 ? "text-[#4edea3]" : "text-[#f87171]"
                }`}
              >
                {fmtR(totalImpactoBicos)}
              </span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── SECTION: Perdas e Sobras LMC ── */}
      <SectionCard
        title="Perdas e Sobras LMC"
        icon={<AlertCircle size={13} className="text-[#f59e0b]" />}
      >
        {perdasSobras.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[12px] text-[#6b7280]">
              Importe o CSV de{" "}
              <span className="text-[#f59e0b] font-semibold">
                Perdas e Sobras LMC
              </span>{" "}
              para carregar os dados.
            </p>
          </div>
        ) : (
          <div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#262a31]">
                  <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">
                    Produto LMC
                  </th>
                  <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">
                    Perdas/Sobras
                  </th>
                  <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">
                    Impacto Finan R$
                  </th>
                </tr>
              </thead>
              <tbody>
                {perdasSobras.map((p, idx) => (
                  <tr
                    key={p.produto}
                    className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]"
                  >
                    <td className="px-3 py-2 text-white">
                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border"
                        style={{
                          background: `${getTipoColor(p.produto)}18`,
                          color: getTipoColor(p.produto),
                          borderColor: `${getTipoColor(p.produto)}30`,
                        }}
                      >
                        {p.produto}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-['JetBrains_Mono',monospace]">
                      <input
                        type="number"
                        step="0.001"
                        value={p.perdasSobras || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const precoKey = getPrecoKey(p.produto);
                          const preco = precios[precoKey] || 0;
                          setPerdasSobras((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, perdasSobras: val, impacto: val * preco }
                                : x
                            )
                          );
                        }}
                        className="w-28 bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors text-right"
                      />
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-['JetBrains_Mono',monospace] font-semibold ${
                        p.impacto >= 0 ? "text-[#4edea3]" : "text-[#f87171]"
                      }`}
                    >
                      {fmtR(p.impacto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totais */}
            <div className="flex items-center justify-end gap-6 pt-3 mt-2 border-t border-[#262a31]">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">
                  Totais:
                </span>
                <span className="text-[13px] font-bold text-white font-['JetBrains_Mono',monospace]">
                  {fmtN(totalPerdasSobras, 3)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[13px] font-bold font-['JetBrains_Mono',monospace] ${totalImpactoPerdas >= 0 ? "text-[#4edea3]" : "text-[#f87171]"}`}>
                  {fmtR(totalImpactoPerdas)}
                </span>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── SECTION: Pedidos e Entregas ── */}
      <SectionCard
        title="Pedidos e Entregas"
        icon={<Truck size={13} className="text-[#22d3ee]" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#262a31]">
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">
                  Fornecedor
                </th>
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">
                  Descrição
                </th>
                <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">
                  Valor (R$)
                </th>
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">
                  Previsão Chega
                </th>
                <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">
                  Classe
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-[12px] text-[#6b7280]"
                  >
                    Nenhum pedido cadastrado. Clique em "+" para adicionar.
                  </td>
                </tr>
              ) : (
                pedidos.map((p, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]"
                  >
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={p.fornecedor}
                        onChange={(e) =>
                          updatePedido(idx, "fornecedor", e.target.value)
                        }
                        placeholder="Fornecedor"
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={p.descricao}
                        onChange={(e) =>
                          updatePedido(idx, "descricao", e.target.value)
                        }
                        placeholder="Descrição"
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        value={p.valor || ""}
                        placeholder="0"
                        onChange={(e) =>
                          updatePedido(idx, "valor", e.target.value)
                        }
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] text-right focus:border-[#00a572] focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="date"
                        value={p.previsaoChega}
                        onChange={(e) =>
                          updatePedido(idx, "previsaoChega", e.target.value)
                        }
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white font-['JetBrains_Mono',monospace] focus:border-[#00a572] focus:outline-none transition-colors"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={p.classe}
                        onChange={(e) =>
                          updatePedido(idx, "classe", e.target.value)
                        }
                        className="w-full bg-[#1d2027] border border-[#262a31] rounded px-2 py-1 text-[11px] text-white focus:border-[#00a572] focus:outline-none transition-colors"
                      >
                        <option value="Venda">Venda</option>
                        <option value="Consumo">Consumo</option>
                      </select>
                    </td>
                    <td className="px-1">
                      <button
                        onClick={() => removePedido(idx)}
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

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#262a31]">
          <button
            onClick={addPedido}
            className="flex items-center gap-1.5 bg-[rgba(78,222,163,.08)] hover:bg-[rgba(78,222,163,.15)] border border-[rgba(78,222,163,.2)] text-[#4edea3] text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors"
          >
            <Plus size={13} />
            Adicionar Pedido
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">
              Total
            </span>
            <span className="text-[13px] font-bold text-white font-['JetBrains_Mono',monospace]">
              {fmtR(totalPedidos)}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* ── IMPORT MODAL ── */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-[rgba(16,19,26,.9)] z-50 flex items-center justify-center"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="bg-[#171717] border border-[#32353c] rounded-xl p-7 w-[500px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[16px] font-bold text-white mb-1">
              Importar CSVs
            </h2>
            <p className="text-[11px] text-[#9ca3af] mb-4 leading-relaxed">
              Importe os relatórios de controle de estoque.
              <br />
              Arquivos:{" "}
              <strong className="text-[#4edea3]">Vendas por Bico</strong> ·{" "}
              <strong className="text-[#f59e0b]">Perdas e Sobras LMC</strong>
            </p>

            <div
              className="border-[1.5px] border-dashed border-[#32353c] rounded-lg p-7 text-center cursor-pointer hover:border-[#00a572] hover:bg-[rgba(0,165,114,.04)] transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload
                size={32}
                className="mx-auto mb-2 text-[#6b7280]"
                strokeWidth={1.5}
              />
              <p className="text-[12px] text-[#9ca3af]">
                Clique para selecionar arquivos
              </p>
              <small className="text-[10px] text-[#6b7280]">
                Múltiplos arquivos · .csv
              </small>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Import Log */}
            {importLog.length > 0 && (
              <div className="flex flex-col gap-2 mt-3 max-h-40 overflow-y-auto">
                {importLog.map((l, i) => (
                  <div
                    key={i}
                    className="bg-[#1d2027] rounded-md px-3 py-2 flex items-center justify-between text-[11px]"
                  >
                    <span className="text-white font-medium truncate max-w-[280px]">
                      {l.name}
                    </span>
                    <span
                      className={`text-[9px] font-['JetBrains_Mono',monospace] px-2 py-0.5 rounded border ${
                        l.ok
                          ? "bg-[rgba(78,222,163,.1)] border-[rgba(78,222,163,.2)] text-[#4edea3]"
                          : "bg-[rgba(239,68,68,.1)] border-[rgba(239,68,68,.2)] text-[#f87171]"
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowImportModal(false)}
              className="w-full mt-4 bg-[#1d2027] border border-[#262a31] text-[#9ca3af] rounded-md py-2 text-[12px] hover:text-white hover:border-[#32353c] transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
