import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Users,
  BarChart3,
  Calendar,
  Upload,
  FileSpreadsheet,
  Shield,
  Trash2,
  Eye,
  Clock,
} from "lucide-react";
import * as XLSX from "xlsx";
import { loadAllModuleData, saveAllModuleData, MODULE_NAMES } from "../services/supabasePersistence";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ShiftEntry {
  id: string;
  horaInicio: string;
  horaIntervalo: string;
  nome: string;
  tipo: "FRENTISTA" | "CAIXA";
  lider: string;
  dataInicio: string;
  limiteFerias: string;
  previsaoFerias: string;
  previsaoDemissao: string;
}

interface StaffEntry {
  id: string;
  categoria: string;
  nome: string;
  dataInicio: string;
  escala: string;
}

interface SalesEntry {
  id: string;
  nome: string;
  litros: number;
  atendimentos: number;
}

interface OperatorEntry {
  id: string;
  codigo: string;
  nome: string;
  valorVendido: number;
  participacao: number;
}

interface PontoData {
  turno1: ShiftEntry[];
  turno2: ShiftEntry[];
  staff: StaffEntry[];
  vendasFrentistas: SalesEntry[];
  vendasNoite: SalesEntry[];
  operadoras: OperatorEntry[];
  totalFrentistas: number;
  importedAt: string;
  fileName: string;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = "fuelops_ponto_data";
const MODULO_NAME = MODULE_NAMES.PONTO;
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

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

function cellStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  return s === "NaN" || s === "NaT" || s === "undefined" ? "" : s;
}

function formatExcelTime(val: unknown): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number" && val >= 0 && val < 1) {
    const totalMinutes = Math.round(val * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const s = cellStr(val);
  const match = s.match(/^(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
  return s;
}

function formatExcelDate(val: unknown): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number" && val > 30000 && val < 60000) {
    const d = new Date((val - 25569) * 86400000);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const da = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  const s = cellStr(val);
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return s;
}

// ═══════════════════════════════════════════════════════════
// EXCEL PARSING
// ═══════════════════════════════════════════════════════════

function parseExcelFile(
  file: File
): Promise<{ data: PontoData; month: number; year: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bytes = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(bytes, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          defval: "",
        });

        const nameMatch = file.name.match(/(\d{2})-(\d{2})/);
        if (!nameMatch) {
          reject(new Error("Nome do arquivo não contém MM-AA"));
          return;
        }
        const month = parseInt(nameMatch[1], 10);
        const year = 2000 + parseInt(nameMatch[2], 10);
        if (month < 1 || month > 12) {
          reject(new Error("Mês inválido no nome do arquivo"));
          return;
        }

        const data = parseSheetRows(rows);
        data.importedAt = new Date().toISOString();
        data.fileName = file.name;

        resolve({ data, month: month - 1, year });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

function parseSheetRows(rows: unknown[][]): PontoData {
  const result: PontoData = {
    turno1: [],
    turno2: [],
    staff: [],
    vendasFrentistas: [],
    vendasNoite: [],
    operadoras: [],
    totalFrentistas: 0,
    importedAt: "",
    fileName: "",
  };

  // ── Phase 1: Identify section boundaries ──
  const sectionMap: Record<string, number> = {};
  for (let i = 0; i < rows.length; i++) {
    const a = cellStr(rows[i]?.[0]).toLowerCase();
    const k = cellStr(rows[i]?.[11]).toLowerCase();

    if (a.includes("turno 1") || k.includes("turno 1")) {
      sectionMap["turno_start"] = i;
    }
    if (a === "caixa" && !sectionMap["caixa_start"]) {
      sectionMap["caixa_start"] = i;
    }
    if (a === "gerentes") {
      sectionMap["gerentes_start"] = i;
    }
    if (a === "limpeza") {
      sectionMap["limpeza_start"] = i;
    }
    if (a === "segurança" || a === "seguranca") {
      sectionMap["seguranca_start"] = i;
    }
    if (a.includes("trocador de oleo") || a.includes("troca de")) {
      sectionMap["trocador_start"] = i;
    }
    if (a.includes("segurança dia") || a.includes("seguranca dia")) {
      sectionMap["segdia_start"] = i;
    }
    if (a.includes("classificação de vendas frenti") || a.includes("classificacao de vendas frenti")) {
      sectionMap["vendas_frent_start"] = i;
    }
    if (a.includes("noite e outros colaboradores")) {
      sectionMap["noite_start"] = i;
    }
    if (a.includes("classificação de vendas caixas") || a.includes("classificacao de vendas caixas")) {
      sectionMap["vendas_caixas_start"] = i;
    }
    if (a === "total:" || a === "total") {
      if (!sectionMap["total_frent_row"]) sectionMap["total_frent_row"] = i;
      sectionMap["total_last"] = i;
    }
  }

  // ── Phase 2: Parse Turno data ──
  // Turno data runs from turno_start+4 to caixa_start-1 (header at +4, data from +5)
  // Caixa data runs from caixa_start+2 to gerentes_start-1 (header at +2, data from +3)
  const turnoHeaderRow = (sectionMap["turno_start"] ?? 3) + 3; // R006 = "Hora Inicio" row
  const caixaStart = sectionMap["caixa_start"] ?? 25;
  const gerentesStart = sectionMap["gerentes_start"] ?? 33;

  // Parse FRENTISTA rows (turnoHeaderRow+1 to caixaStart-1)
  for (let i = turnoHeaderRow + 1; i < caixaStart; i++) {
    const row = rows[i];
    if (!row) continue;

    const t1 = parseShiftRow(row, 0, "FRENTISTA");
    if (t1.nome) result.turno1.push({ id: crypto.randomUUID(), ...t1 });

    const t2 = parseShiftRow(row, 11, "FRENTISTA");
    if (t2.nome) result.turno2.push({ id: crypto.randomUUID(), ...t2 });
  }

  // Parse CAIXA rows (caixaStart+2 to gerentesStart-1)
  const caixaHeaderRow = caixaStart + 1;
  for (let i = caixaHeaderRow + 1; i < gerentesStart; i++) {
    const row = rows[i];
    if (!row) continue;

    const t1 = parseShiftRow(row, 0, "CAIXA");
    if (t1.nome) result.turno1.push({ id: crypto.randomUUID(), ...t1 });

    const t2 = parseShiftRow(row, 11, "CAIXA");
    if (t2.nome) result.turno2.push({ id: crypto.randomUUID(), ...t2 });
  }

  // ── Phase 3: Parse Staff sections ──
  const staffSections: { key: string; category: string }[] = [
    { key: "gerentes_start", category: "Gerentes" },
    { key: "limpeza_start", category: "Limpeza" },
    { key: "seguranca_start", category: "Segurança" },
    { key: "trocador_start", category: "Troca de Óleo" },
    { key: "segdia_start", category: "Segurança Dia" },
  ];

  // Find the end boundary for staff (next section after last staff section)
  const staffEndCandidates = [
    sectionMap["vendas_frent_start"],
    sectionMap["noite_start"],
    sectionMap["vendas_caixas_start"],
    rows.length,
  ].filter((v) => v !== undefined) as number[];
  const staffEnd = staffEndCandidates.length > 0 ? Math.min(...staffEndCandidates) : rows.length;

  for (const { key, category } of staffSections) {
    const startRow = sectionMap[key];
    if (startRow === undefined) continue;

    // Find next section start
    const allStarts = Object.values(sectionMap)
      .filter((v) => v > startRow && v !== sectionMap[key])
      .sort((a, b) => a - b);
    const nextSection = allStarts.length > 0 ? allStarts[0] : staffEnd;

    // Parse data rows between header+1 and next section
    // Some sections have a sub-header row (Data inicio, Limite de ferias, etc.)
    // We skip rows that are sub-headers or empty markers
    for (let i = startRow + 1; i < nextSection; i++) {
      const row = rows[i];
      if (!row) continue;

      const left = parseStaffRow(row, 0, category);
      if (left.nome) result.staff.push({ id: crypto.randomUUID(), ...left });

      const right = parseStaffRow(row, 11, category);
      if (right.nome) result.staff.push({ id: crypto.randomUUID(), ...right });
    }
  }

  // ── Phase 4: Parse Vendas Frentistas ──
  const vendasFrentStart = sectionMap["vendas_frent_start"];
  const noiteStart = sectionMap["noite_start"];
  if (vendasFrentStart !== undefined) {
    const endRow = noiteStart ?? sectionMap["vendas_caixas_start"] ?? rows.length;
    // Find the first data row after "LITROS | ATENDIMENTOS" header
    for (let i = vendasFrentStart + 1; i < endRow; i++) {
      const row = rows[i];
      if (!row) continue;
      const a = cellStr(row[0]);
      // Skip headers and markers
      if (
        !a ||
        a.includes("▼") ||
        a.toUpperCase() === "LITROS" ||
        a.toUpperCase().includes("ATENDIMENTOS") ||
        a.toUpperCase().includes("CLASSIFICAÇÃO") ||
        a.toUpperCase().includes("CLASSIFICACAO")
      )
        continue;

      const litros = typeof row[3] === "number" ? row[3] : parseFloat(cellStr(row[3])) || 0;
      const atendimentos = typeof row[4] === "number" ? row[4] : parseInt(cellStr(row[4])) || 0;

      if (a && (litros > 0 || atendimentos > 0)) {
        result.vendasFrentistas.push({
          id: crypto.randomUUID(),
          nome: a,
          litros,
          atendimentos,
        });
      }
    }
  }

  // ── Phase 5: Parse Vendas Noite ──
  if (noiteStart !== undefined) {
    const vendasCaixasStart = sectionMap["vendas_caixas_start"] ?? rows.length;
    for (let i = noiteStart + 1; i < vendasCaixasStart; i++) {
      const row = rows[i];
      if (!row) continue;
      const a = cellStr(row[0]);
      if (
        !a ||
        a.toUpperCase() === "TOTAL:" ||
        a.toUpperCase() === "TOTAL" ||
        a.toUpperCase().includes("CLASSIFICAÇÃO") ||
        a.toUpperCase().includes("CLASSIFICACAO")
      )
        continue;

      const litros = typeof row[3] === "number" ? row[3] : parseFloat(cellStr(row[3])) || 0;
      const atendimentos = typeof row[4] === "number" ? row[4] : parseInt(cellStr(row[4])) || 0;

      if (a && (litros > 0 || atendimentos > 0)) {
        result.vendasNoite.push({
          id: crypto.randomUUID(),
          nome: a,
          litros,
          atendimentos,
        });
      }
    }

    // Get total
    const totalRow = sectionMap["total_frent_row"];
    if (totalRow !== undefined) {
      const totalVal =
        typeof rows[totalRow][3] === "number"
          ? rows[totalRow][3]
          : parseFloat(cellStr(rows[totalRow][3])) || 0;
      result.totalFrentistas = totalVal;
    }
  }

  // ── Phase 6: Parse Classificação de Vendas Caixas ──
  const caixasStart = sectionMap["vendas_caixas_start"];
  if (caixasStart !== undefined) {
    // Find "OPERAORAS" or "OPERADORAS" header row
    let headerRow = -1;
    for (let i = caixasStart; i < rows.length; i++) {
      const a = cellStr(rows[i]?.[0]).toLowerCase();
      if (a === "operaoras" || a === "operadoras") {
        headerRow = i;
        break;
      }
    }

    if (headerRow >= 0) {
      let totalVendido = 0;
      const operators: OperatorEntry[] = [];

      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const a = cellStr(row[0]);
        if (
          !a ||
          a.toLowerCase() === "média" ||
          a.toLowerCase() === "media" ||
          a.toLowerCase() === "total"
        )
          break;

        // Parse "00244 - JANAINA AP FERREIRA SANTANA"
        const codeMatch = a.match(/^(\d+)\s*-\s*(.+)$/);
        const codigo = codeMatch ? codeMatch[1] : "";
        const nome = codeMatch ? codeMatch[2].trim() : a;

        // VALOR VEND is in col 4
        const valor =
          typeof row[4] === "number" ? row[4] : parseFloat(cellStr(row[4])) || 0;

        if (nome && valor > 0) {
          totalVendido += valor;
          operators.push({
            id: crypto.randomUUID(),
            codigo,
            nome,
            valorVendido: valor,
            participacao: 0,
          });
        }
      }

      // Calculate participation
      result.operadoras = operators.map((op) => ({
        ...op,
        participacao: totalVendido > 0 ? (op.valorVendido / totalVendido) * 100 : 0,
      }));
    }
  }

  return result;
}

function parseShiftRow(
  row: unknown[],
  startCol: number,
  tipo: "FRENTISTA" | "CAIXA"
): Omit<ShiftEntry, "id"> {
  const c = (offset: number) => cellStr(row[startCol + offset]);
  return {
    horaInicio: formatExcelTime(row[startCol]),
    horaIntervalo: formatExcelTime(row[startCol + 1]),
    nome: c(2),
    tipo,
    lider: c(5),
    dataInicio: formatExcelDate(row[startCol + 6]),
    limiteFerias: c(7),
    previsaoFerias: formatExcelDate(row[startCol + 8]),
    previsaoDemissao: formatExcelDate(row[startCol + 9]),
  };
}

function parseStaffRow(
  row: unknown[],
  startCol: number,
  categoria: string
): Omit<StaffEntry, "id"> {
  // Name is in col startCol+1 (after number) or startCol+2 (SEGURANÇA style)
  let nome = cellStr(row[startCol + 1]);
  if (!nome || !isNaN(Number(nome))) {
    nome = cellStr(row[startCol + 2]);
  }
  if (!nome) return { categoria, nome: "", dataInicio: "", escala: "" };

  // Scan cols 3-8 for dates and patterns
  let dataInicio = "";
  let escala = "";
  for (let c = 3; c <= 8; c++) {
    const val = row[startCol + c];
    const dateStr = formatExcelDate(val);
    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/) && !dataInicio) {
      dataInicio = dateStr;
    }
    const s = cellStr(val);
    if (s.match(/^\d+X\d+$/i) && !escala) {
      escala = s;
    }
  }

  return { categoria, nome, dataInicio, escala };
}

// ═══════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════

function loadFromStorage(): Record<string, PontoData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(_data: Record<string, PontoData>): void {
  /* salvar via Supabase — ver persistência no componente */
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

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
      {badge && (
        <span className="text-[10px] font-semibold text-[#00a572] bg-[rgba(0,165,114,.08)] px-2 py-0.5 rounded font-['JetBrains_Mono',monospace]">
          {badge}
        </span>
      )}
    </div>
    {children}
  </div>
);

const MonthSelector = ({
  selectedMonth,
  selectedYear,
  onMonthSelect,
  onYearChange,
  hasData,
}: {
  selectedMonth: number;
  selectedYear: number;
  onMonthSelect: (m: number) => void;
  onYearChange: (y: number) => void;
  hasData: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentKey = makeKey(selectedYear, selectedMonth);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-[#1d2027] border border-[#262a31] rounded-md px-3 py-2 cursor-pointer hover:border-[#00a572] transition-colors"
      >
        <span className="w-[7px] h-[7px] rounded-full bg-[#00a572] flex-shrink-0" />
        <span className="text-[11px] text-white font-semibold uppercase tracking-[0.06em] font-['JetBrains_Mono',monospace]">
          {MONTH_LABELS[selectedMonth]} {selectedYear}
        </span>
        {hasData && (
          <span className="ml-1 text-[9px] text-[#00a572] bg-[rgba(0,165,114,.1)] px-1.5 py-0.5 rounded">
            ✓
          </span>
        )}
        <span
          className="text-[10px] text-[#6b7280] ml-1 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 w-[300px] bg-[#1d2027] border border-[#262a31] rounded-lg overflow-hidden z-30 shadow-[0_8px_32px_rgba(0,0,0,.5)]">
          <div className="flex items-center justify-between px-2 py-2 border-b border-[#262a31]">
            <button
              onClick={() => onYearChange(selectedYear - 1)}
              className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] hover:text-white transition-colors px-2.5 py-1.5 rounded hover:bg-[#262a31]"
            >
              <span className="text-[10px]">◀</span>
              <span>Anterior</span>
            </button>
            <span className="text-[13px] font-bold text-white font-['JetBrains_Mono',monospace] px-3">
              {selectedYear}
            </span>
            <button
              onClick={() => onYearChange(selectedYear + 1)}
              className="flex items-center gap-1.5 text-[11px] text-[#9ca3af] hover:text-white transition-colors px-2.5 py-1.5 rounded hover:bg-[#262a31]"
            >
              <span>Próximo</span>
              <span className="text-[10px]">▶</span>
            </button>
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#6b7280] py-2.5 px-3.5 pb-1 font-['JetBrains_Mono',monospace]">
            Meses disponíveis
          </div>
          {MONTH_LABELS.map((label, idx) => {
            const key = makeKey(selectedYear, idx);
            return (
              <button
                key={key}
                onClick={() => {
                  onMonthSelect(idx);
                  setOpen(false);
                }}
                className={`flex items-center justify-between w-full px-3.5 py-2.5 text-[12px] border-b border-[rgba(38,42,49,.4)] last:border-b-0 transition-colors ${
                  key === currentKey
                    ? "text-white bg-[rgba(0,165,114,.08)]"
                    : "text-[#9ca3af] hover:bg-[#262a31] hover:text-white"
                }`}
              >
                <span className="font-medium">{label}</span>
                <span className="text-[9px] font-['JetBrains_Mono',monospace] text-[#6b7280]">
                  {key}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DropZone = ({
  onFile,
  uploading,
}: {
  onFile: (f: File) => void;
  uploading: boolean;
}) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${
        dragging
          ? "border-[#00a572] bg-[rgba(0,165,114,.04)]"
          : "border-[#262a31] hover:border-[#3a3f4a] bg-[#171717]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#00a572] border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] text-[#9ca3af]">Processando planilha...</span>
        </div>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-[rgba(0,165,114,.08)] flex items-center justify-center mb-4">
            <Upload size={24} className="text-[#00a572]" />
          </div>
          <p className="text-[13px] text-white font-semibold mb-1">
            Nenhum documento lido para este período
          </p>
          <p className="text-[11px] text-[#6b7280] mb-3">
            Arraste a planilha de ponto correspondente aqui
          </p>
          <p className="text-[10px] text-[#4b5563] font-['JetBrains_Mono',monospace]">
            Padrão: FECHAMENTO Gestão de Equipe MM-AA.xlsx
          </p>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// READ-ONLY TABLE HELPERS
// ═══════════════════════════════════════════════════════════

const ReadonlyCell = ({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) => (
  <span
    className={`block px-2 py-1.5 text-[11px] text-[#e1e2ec] font-['JetBrains_Mono',monospace] ${className}`}
  >
    {value || "—"}
  </span>
);

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function GestaoEquipe() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Persistence ──
  const allDataRef = useRef<Record<string, PontoData>>({});
  const [loaded, setLoaded] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const currentKey = makeKey(selectedYear, selectedMonth);
  const currentData = allDataRef.current[currentKey] ?? null;

  // Carregar dados do Supabase ao montar
  useEffect(() => {
    loadAllModuleData<PontoData>(MODULO_NAME).then((data) => {
      allDataRef.current = data;
      setLoaded(true);
      setRenderKey((k) => k + 1);
    }).catch(() => {
      allDataRef.current = loadFromStorage();
      setLoaded(true);
    });
  }, []);

  // Check which months have data
  const monthsWithData = useMemo(() => {
    const set = new Set(Object.keys(allDataRef.current));
    return set;
  }, []);

  // ── File Upload ──
  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const { data, month, year } = await parseExcelFile(file);
        const key = makeKey(year, month);
        allDataRef.current[key] = data;
        saveAllModuleData(MODULO_NAME, allDataRef.current);
        // Navigate to the imported month
        setSelectedMonth(month);
        setSelectedYear(year);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao processar arquivo";
        setError(msg);
        setTimeout(() => setError(null), 5000);
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const handleMonthSelect = useCallback((m: number) => {
    setSelectedMonth(m);
  }, []);

  const handleYearChange = useCallback((y: number) => {
    setSelectedYear(y);
  }, []);

  // ── Derived data ──
  const turno1Frentistas = useMemo(
    () => currentData?.turno1.filter((e) => e.tipo === "FRENTISTA") ?? [],
    [currentData]
  );
  const turno1Caixas = useMemo(
    () => currentData?.turno1.filter((e) => e.tipo === "CAIXA") ?? [],
    [currentData]
  );
  const turno2Frentistas = useMemo(
    () => currentData?.turno2.filter((e) => e.tipo === "FRENTISTA") ?? [],
    [currentData]
  );
  const turno2Caixas = useMemo(
    () => currentData?.turno2.filter((e) => e.tipo === "CAIXA") ?? [],
    [currentData]
  );

  const staffByCategory = useMemo(() => {
    if (!currentData) return {};
    const groups: Record<string, StaffEntry[]> = {};
    for (const entry of currentData.staff) {
      if (!groups[entry.categoria]) groups[entry.categoria] = [];
      groups[entry.categoria].push(entry);
    }
    return groups;
  }, [currentData]);

  const vendasTotal = useMemo(() => {
    if (!currentData) return 0;
    return currentData.vendasFrentistas.reduce((s, v) => s + v.litros, 0);
  }, [currentData]);

  const operadorasTotal = useMemo(() => {
    if (!currentData) return 0;
    return currentData.operadoras.reduce((s, o) => s + o.valorVendido, 0);
  }, [currentData]);

  // ── Render ──
  return (
    <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-5">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between pb-4 border-b border-[#262a31]">
        <div>
          <h1 className="text-[20px] font-bold text-white tracking-[-0.3px]">
            Ponto — Gestão de Equipe
          </h1>
          <p className="text-[11px] text-[#9ca3af] mt-1">
            Posto Carga Pesada — Leitura automática de documentos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentData && (
            <div className="flex items-center gap-2 text-[10px] text-[#6b7280] font-['JetBrains_Mono',monospace]">
              <FileSpreadsheet size={12} className="text-[#00a572]" />
              <span className="max-w-[200px] truncate">{currentData.fileName}</span>
            </div>
          )}
          <MonthSelector
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthSelect={handleMonthSelect}
            onYearChange={handleYearChange}
            hasData={!!currentData}
          />
        </div>
      </div>

      {/* ── Error toast ── */}
      {error && (
        <div className="bg-[rgba(239,68,68,.1)] border border-[rgba(239,68,68,.3)] rounded-lg px-4 py-3 text-[12px] text-[#f87171]">
          {error}
        </div>
      )}

      {/* ── CONTENT ── */}
      {!currentData ? (
        <DropZone onFile={handleFile} uploading={uploading} />
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════
              SEÇÃO 1: ESCALA DE TURNOS
             ═══════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-[#4d8eff]" />
            <h2 className="text-[13px] font-bold text-white tracking-[-0.2px]">
              Escala de Turnos
            </h2>
          </div>

          {/* ── Turno 1 & Turno 2 side by side ── */}
          <div className="grid grid-cols-2 gap-5">
            {/* ── TURNO 1 ── */}
            <div className="flex flex-col gap-4">
              {/* Frentistas T1 */}
              <SectionCard
                title="Turno 1 — Frentistas"
                icon={<Users size={13} className="text-[#4d8eff]" />}
                badge={`${turno1Frentistas.length}`}
              >
                <ShiftTable data={turno1Frentistas} />
              </SectionCard>

              {/* Caixas T1 */}
              <SectionCard
                title="Turno 1 — Caixas"
                icon={<Users size={13} className="text-[#60a5fa]" />}
                badge={`${turno1Caixas.length}`}
              >
                <ShiftTable data={turno1Caixas} />
              </SectionCard>
            </div>

            {/* ── TURNO 2 ── */}
            <div className="flex flex-col gap-4">
              {/* Frentistas T2 */}
              <SectionCard
                title="Turno 2 — Frentistas"
                icon={<Users size={13} className="text-[#a78bfa]" />}
                badge={`${turno2Frentistas.length}`}
              >
                <ShiftTable data={turno2Frentistas} />
              </SectionCard>

              {/* Caixas T2 */}
              <SectionCard
                title="Turno 2 — Caixas"
                icon={<Users size={13} className="text-[#c4b5fd]" />}
                badge={`${turno2Caixas.length}`}
              >
                <ShiftTable data={turno2Caixas} />
              </SectionCard>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              SEÇÃO 2: NOITE E OUTROS COLABORADORES
             ═══════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 mb-1 mt-2">
            <Shield size={14} className="text-[#f59e0b]" />
            <h2 className="text-[13px] font-bold text-white tracking-[-0.2px]">
              Noite e Outros Colaboradores
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Staff categories */}
            <div className="flex flex-col gap-4">
              {Object.entries(staffByCategory).map(([category, entries]) => (
                <SectionCard
                  key={category}
                  title={category}
                  icon={<Shield size={13} className="text-[#f59e0b]" />}
                  badge={`${entries.length}`}
                >
                  <StaffTable entries={entries} />
                </SectionCard>
              ))}
              {Object.keys(staffByCategory).length === 0 && (
                <SectionCard
                  title="Outros Colaboradores"
                  icon={<Shield size={13} className="text-[#f59e0b]" />}
                >
                  <p className="text-[11px] text-[#6b7280] text-center py-4">
                    Nenhum colaborador encontrado nesta seção
                  </p>
                </SectionCard>
              )}
            </div>

            {/* Vendas Noite */}
            <div className="flex flex-col gap-4">
              <SectionCard
                title="Vendas — Noite e Outros"
                icon={<BarChart3 size={13} className="text-[#f59e0b]" />}
                badge={`${currentData.vendasNoite.length}`}
              >
                <SalesTable
                  entries={currentData.vendasNoite}
                  total={currentData.totalFrentistas}
                />
              </SectionCard>

              {/* Vendas Frentistas summary */}
              <SectionCard
                title="Vendas — Frentistas (Diesel + Gasolina)"
                icon={<BarChart3 size={13} className="text-[#4d8eff]" />}
                badge={`${currentData.vendasFrentistas.length}`}
              >
                <SalesTable
                  entries={currentData.vendasFrentistas}
                  total={currentData.totalFrentistas}
                />
              </SectionCard>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              SEÇÃO 3: CLASSIFICAÇÃO DE VENDAS CAIXAS
             ═══════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 mb-1 mt-2">
            <BarChart3 size={14} className="text-[#00a572]" />
            <h2 className="text-[13px] font-bold text-white tracking-[-0.2px]">
              Classificação de Vendas — Caixas / Operadoras
            </h2>
          </div>

          <SectionCard
            title="Ranking de Performance — Operadoras"
            icon={<BarChart3 size={13} className="text-[#00a572]" />}
            badge={`${currentData.operadoras.length}`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#262a31]">
                    <th className="text-center text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2 w-[60px]">
                      #
                    </th>
                    <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">
                      Operadora
                    </th>
                    <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2 min-w-[140px]">
                      Valor Vendido (R$)
                    </th>
                    <th className="text-center text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2 min-w-[100px]">
                      Participação (%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.operadoras.map((op, idx) => (
                    <tr
                      key={op.id}
                      className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]"
                    >
                      <td className="px-3 py-2 text-center text-[10px] text-[#6b7280] font-['JetBrains_Mono',monospace]">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-white font-medium">
                            {op.nome}
                          </span>
                          {op.codigo && (
                            <span className="text-[9px] text-[#6b7280] font-['JetBrains_Mono',monospace]">
                              #{op.codigo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-[12px] text-white font-['JetBrains_Mono',monospace]">
                          {fmtR(op.valorVendido)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded text-[12px] font-bold font-['JetBrains_Mono',monospace] ${
                            op.participacao > 0
                              ? "bg-[rgba(0,165,114,.08)] text-[#4edea3]"
                              : "text-[#6b7280]"
                          }`}
                        >
                          {op.participacao > 0
                            ? op.participacao.toFixed(1) + "%"
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {currentData.operadoras.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center">
                        <span className="text-[10px] text-[#6b7280]">
                          Nenhuma operadora encontrada
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
                {currentData.operadoras.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#00a572]">
                      <td className="px-3 py-3 text-[10px] font-bold text-[#6b7280]">
                        {currentData.operadoras.length} ops
                      </td>
                      <td className="px-3 py-3 text-[12px] font-bold text-white uppercase tracking-wider">
                        TOTAL VENDIDO
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-[13px] font-bold text-[#4edea3] font-['JetBrains_Mono',monospace]">
                          {fmtR(operadorasTotal)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-[13px] font-bold text-[#4edea3] font-['JetBrains_Mono',monospace]">
                          {operadorasTotal > 0 ? "100,0%" : "—"}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </SectionCard>

          {/* ── Import info ── */}
          <div className="flex items-center justify-between text-[10px] text-[#4b5563] font-['JetBrains_Mono',monospace] pt-2">
            <span>
              Importado:{" "}
              {new Date(currentData.importedAt).toLocaleString("pt-BR")}
            </span>
            <button
              onClick={() => {
                if (confirm("Remover dados deste período?")) {
                  delete allDataRef.current[currentKey];
                  saveAllModuleData(MODULO_NAME, allDataRef.current);
                  // Force re-render
                  setSelectedMonth((p) => p);
                }
              }}
              className="flex items-center gap-1 text-[#6b7280] hover:text-[#f87171] transition-colors"
            >
              <Trash2 size={10} />
              Remover dados do período
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TABLE SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function ShiftTable({ data }: { data: ShiftEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[#262a31]">
            <th className="text-center text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2 min-w-[55px]">
              Início
            </th>
            <th className="text-center text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2 min-w-[55px]">
              Intervalo
            </th>
            <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2 min-w-[140px]">
              Nome
            </th>
            <th className="text-center text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2 min-w-[80px]">
              Início
            </th>
            <th className="text-center text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2 min-w-[80px]">
              Lim. Férias
            </th>
            <th className="text-center text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2 min-w-[80px]">
              Prev. Férias
            </th>
            <th className="text-center text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-2 py-2 min-w-[80px]">
              Prev. Demissão
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]"
            >
              <td className="px-2 py-1.5 text-center">
                <ReadonlyCell
                  value={row.horaInicio}
                  className="text-center"
                />
              </td>
              <td className="px-2 py-1.5 text-center">
                <ReadonlyCell
                  value={row.horaIntervalo}
                  className="text-center"
                />
              </td>
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <ReadonlyCell value={row.nome} className="text-left" />
                  {row.lider && (
                    <span className="text-[8px] bg-[rgba(0,165,114,.12)] text-[#00a572] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">
                      Líder
                    </span>
                  )}
                </div>
              </td>
              <td className="px-2 py-1.5 text-center">
                <ReadonlyCell
                  value={row.dataInicio}
                  className="text-center text-[10px]"
                />
              </td>
              <td className="px-2 py-1.5 text-center">
                <ReadonlyCell
                  value={row.limiteFerias}
                  className="text-center text-[10px]"
                />
              </td>
              <td className="px-2 py-1.5 text-center">
                <ReadonlyCell
                  value={row.previsaoFerias}
                  className="text-center text-[10px]"
                />
              </td>
              <td className="px-2 py-1.5 text-center">
                <ReadonlyCell
                  value={row.previsaoDemissao}
                  className="text-center text-[10px]"
                />
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-4 text-center">
                <span className="text-[10px] text-[#6b7280]">
                  Nenhum registro encontrado
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StaffTable({ entries }: { entries: StaffEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[#262a31]">
            <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">
              Nome
            </th>
            <th className="text-center text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2 min-w-[90px]">
              Início
            </th>
            <th className="text-center text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2 min-w-[70px]">
              Escala
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]"
            >
              <td className="px-3 py-2">
                <ReadonlyCell value={entry.nome} className="text-left" />
              </td>
              <td className="px-3 py-2 text-center">
                <ReadonlyCell
                  value={entry.dataInicio}
                  className="text-center text-[10px]"
                />
              </td>
              <td className="px-3 py-2 text-center">
                {entry.escala && (
                  <span className="text-[10px] text-[#f59e0b] bg-[rgba(245,158,11,.08)] px-2 py-0.5 rounded font-['JetBrains_Mono',monospace] font-bold">
                    {entry.escala}
                  </span>
                )}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-4 text-center">
                <span className="text-[10px] text-[#6b7280]">—</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SalesTable({
  entries,
  total,
}: {
  entries: SalesEntry[];
  total: number;
}) {
  const totalLitros = useMemo(
    () => entries.reduce((s, e) => s + e.litros, 0),
    [entries]
  );
  const totalAtendimentos = useMemo(
    () => entries.reduce((s, e) => s + e.atendimentos, 0),
    [entries]
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-[#262a31]">
            <th className="text-left text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2">
              Colaborador
            </th>
            <th className="text-right text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2 min-w-[100px]">
              Litros
            </th>
            <th className="text-center text-[9px] font-semibold text-[#6b7280] uppercase tracking-wider px-3 py-2 min-w-[80px]">
              Atendimentos
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-[rgba(38,42,49,.3)] hover:bg-[rgba(255,255,255,.015)]"
            >
              <td className="px-3 py-2">
                <ReadonlyCell value={entry.nome} className="text-left" />
              </td>
              <td className="px-3 py-2 text-right">
                <span className="text-[11px] text-white font-['JetBrains_Mono',monospace]">
                  {fmtBR(entry.litros)}
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                <span className="text-[11px] text-white font-['JetBrains_Mono',monospace]">
                  {entry.atendimentos.toLocaleString("pt-BR")}
                </span>
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-4 text-center">
                <span className="text-[10px] text-[#6b7280]">
                  Nenhum registro encontrado
                </span>
              </td>
            </tr>
          )}
        </tbody>
        {entries.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-[#f59e0b]">
              <td className="px-3 py-2 text-[11px] font-bold text-white uppercase tracking-wider">
                Subtotal
              </td>
              <td className="px-3 py-2 text-right">
                <span className="text-[12px] font-bold text-[#fbbf24] font-['JetBrains_Mono',monospace]">
                  {fmtBR(totalLitros)}
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                <span className="text-[12px] font-bold text-[#fbbf24] font-['JetBrains_Mono',monospace]">
                  {totalAtendimentos.toLocaleString("pt-BR")}
                </span>
              </td>
            </tr>
            {total > 0 && (
              <tr className="border-t border-[#262a31]">
                <td
                  colSpan={2}
                  className="px-3 py-2 text-[10px] text-[#6b7280] italic"
                >
                  Total Frentistas (planilha):
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="text-[11px] font-bold text-[#4edea3] font-['JetBrains_Mono',monospace]">
                    {fmtBR(total)}
                  </span>
                </td>
              </tr>
            )}
          </tfoot>
        )}
      </table>
    </div>
  );
}
