import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  Edit3,
  History,
  Plus,
  Filter,
  Building2,
  BarChart3,
  X,
  FolderDown,
  FileUp,
  Copy,
  Search,
  Info,
  TrendingUp,
  GitBranch,
} from "lucide-react";
import JSZip from "jszip";
import { loadAllModuleData, saveAllModuleData, uploadFile, MODULE_NAMES } from "../services/supabasePersistence";

/* ══════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════ */

interface DocumentoVersion {
  id: string;
  versao: string;
  arquivo: string;
  tamanho: number;
  dataEnvio: string;
  usuario: string;
}

interface DocumentoHistorico {
  id: string;
  data: string;
  hora: string;
  acao: string;
  usuario: string;
}

interface Documento {
  id: string;
  nome: string;
  categoria: string;
  dataEmissao: string;
  dataVencimento: string;
  status: "valido" | "vencendo" | "vencido" | "pendente";
  observacoes: string;
  versoes: DocumentoVersion[];
  historico: DocumentoHistorico[];
  arquivoAtual: string;
  tamanhoAtual: number;
  dataEnvioAtual: string;
  usuarioAtual: string;
}

interface Orgao {
  id: string;
  nome: string;
  sigla: string;
  icon: string;
  checklistObrigatorio: string[];
}

/* ══════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════ */

const HOJE = new Date(2026, 5, 15); // 15 de Junho de 2026

const ORGAOS: Orgao[] = [
  {
    id: "ipem",
    nome: "Instituto Paranense de Metrologia",
    sigla: "IPEM",
    icon: "📏",
    checklistObrigatorio: [
      "Certificado das Bombas de Abastecimento",
      "Verificação Metrológica dos Bicos",
      "Aferição de Medidores",
      "Certificado de Calibração",
    ],
  },
  {
    id: "anp",
    nome: "Agência Nacional do Petróleo",
    sigla: "ANP",
    icon: "⛽",
    checklistObrigatorio: [
      "Licença de Funcionamento ANP",
      "Autorização de Funcionamento",
      "LMC (Livro de Registro de Combustíveis)",
      "Relatório de Movimentação de Combustíveis",
    ],
  },
  {
    id: "bombeiros",
    nome: "Corpo de Bombeiros",
    sigla: "CB",
    icon: "🚒",
    checklistObrigatorio: [
      "AVCB (Auto de Vistoria do Corpo de Bombeiros)",
      "Plano de Emergência",
      "Certificado de Extintores",
      "Inspetoria de Segurança",
    ],
  },
  {
    id: "prefeitura",
    nome: "Prefeitura Municipal",
    sigla: "PREF",
    icon: "🏛️",
    checklistObrigatorio: [
      "Alvará de Funcionamento",
      "Licença Ambiental Municipal",
      "Certificado de Regularidade Fiscal",
      "AVC (Auto de Vistoria do Corpo de Bombeiros Municipal)",
    ],
  },
  {
    id: "prf",
    nome: "Polícia Rodoviária Federal",
    sigla: "PRF",
    icon: "🚔",
    checklistObrigatorio: [
      "Autorização de Transporte de Combustíveis",
      "Registro no SISCOMB",
      "Certificado de Conformidade Veicular",
    ],
  },
  {
    id: "pmr",
    nome: "Polícia Militar Rodoviária",
    sigla: "PMR",
    icon: "👮",
    checklistObrigatorio: [
      "Certificado de Segurança Patrimonial",
      "Registro de Vigilância",
      "Plano de Segurança Interno",
    ],
  },
  {
    id: "sema",
    nome: "Secretaria de Meio Ambiente",
    sigla: "SEMA",
    icon: "🌿",
    checklistObrigatorio: [
      "Licença de Operação Ambiental",
      "Relatório de Monitoramento Ambiental",
      "Plano de Gerenciamento de Resíduos",
      "Licença de Captação de Água",
    ],
  },
  {
    id: "ibama",
    nome: "Instituto Brasileiro do Meio Ambiente",
    sigla: "IBAMA",
    icon: "🌍",
    checklistObrigatorio: [
      "Licença IBAMA",
      "Cadastro no CNEA",
      "Relatório de Impacto Ambiental",
    ],
  },
  {
    id: "crea",
    nome: "Conselho Regional de Engenharia",
    sigla: "CREA",
    icon: "🔧",
    checklistObrigatorio: [
      "ART (Anotação de Responsabilidade Técnica)",
      "Certificado de Instalação",
      "Laudo Técnico de Segurança",
    ],
  },
  {
    id: "vigilancia",
    nome: "Vigilância Sanitária",
    sigla: "VISA",
    icon: "🏥",
    checklistObrigatorio: [
      "Alvará Sanitário",
      "Licença de Funcionamento Sanitário",
      "Certificado de Potabilidade da Água",
    ],
  },
  {
    id: "mt",
    nome: "Ministério do Trabalho",
    sigla: "MT",
    icon: "👷",
    checklistObrigatorio: [
      "CND (Certidão Negativa de Débitos Trabalhistas)",
      "PCMSO",
      "PPRA / PGR",
      "ASO dos Colaboradores",
    ],
  },
  {
    id: "concessionaria",
    nome: "Concessionária da Rodovia",
    sigla: "CONC",
    icon: "🛣️",
    checklistObrigatorio: [
      "Contrato de Cessão de Uso",
      "Autorização de Instalação Rodoviária",
      "Certificado de Sinalização",
      "Termo de Responsabilidade",
    ],
  },
];

const CATEGORIAS = [
  "Licença",
  "Certificado",
  "Autorização",
  "Relatório",
  "Laudo",
  "Alvará",
  "Outro",
];

const STORAGE_KEY = "dadosRegulamentacao";
const MODULO_NAME = MODULE_NAMES.REGULAMENTACAO;

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function calcularStatus(dataVencimento: string): Documento["status"] {
  if (!dataVencimento) return "pendente";
  const venc = new Date(dataVencimento);
  const diff = venc.getTime() - HOJE.getTime();
  const dias = diff / (1000 * 60 * 60 * 24);
  if (dias < 0) return "vencido";
  if (dias <= 90) return "vencendo";
  return "valido";
}

function diasRestantes(dataVencimento: string): number {
  if (!dataVencimento) return 999;
  const venc = new Date(dataVencimento);
  return Math.ceil((venc.getTime() - HOJE.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtData(dataISO: string): string {
  if (!dataISO) return "—";
  const [y, m, d] = dataISO.split("-");
  return `${d}/${m}/${y}`;
}

function fmtDataHora(): { data: string; hora: string } {
  const now = new Date();
  return {
    data: now.toLocaleDateString("pt-BR"),
    hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function statusLabel(status: Documento["status"]): string {
  switch (status) {
    case "valido":
      return "Válido";
    case "vencendo":
      return "Vencendo";
    case "vencido":
      return "Vencido";
    case "pendente":
      return "Pendente";
  }
}

function statusCor(status: Documento["status"]): string {
  switch (status) {
    case "valido":
      return "bg-[#00a572]/15 text-[#00a572] border border-[#00a572]/30";
    case "vencendo":
      return "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30";
    case "vencido":
      return "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30";
    case "pendente":
      return "bg-[#6b7280]/15 text-[#9ca3af] border border-[#6b7280]/30";
  }
}

function statusBg(status: Documento["status"]): string {
  switch (status) {
    case "valido":
      return "#00a572";
    case "vencendo":
      return "#f59e0b";
    case "vencido":
      return "#ef4444";
    case "pendente":
      return "#6b7280";
  }
}

function carregarDados(): Record<string, Documento[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

function salvarDados(_dados: Record<string, Documento[]>) {
  /* salvar via Supabase — ver persistência no componente */
}

/* ══════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════ */

export default function Regulamentacao() {
  // ── State ────────────────────────────────────────────
  const [dados, setDados] = useState<Record<string, Documento[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [drawerAberto, setDrawerAberto] = useState<string | null>(null);
  const [modalUpload, setModalUpload] = useState(false);
  const [modalVersoes, setModalVersoes] = useState<string | null>(null);
  const [modalHistorico, setModalHistorico] = useState<string | null>(null);
  const [modalDetalhe, setModalDetalhe] = useState<{
    orgaoId: string;
    docId: string;
  } | null>(null);
  const [busca, setBusca] = useState("");
  const [mostrarChecklist, setMostrarChecklist] = useState(false);

  // Upload form state
  const [formNome, setFormNome] = useState("");
  const [formCategoria, setFormCategoria] = useState(CATEGORIAS[0]);
  const [formEmissao, setFormEmissao] = useState("");
  const [formVencimento, setFormVencimento] = useState("");
  const [formObs, setFormObs] = useState("");
  const [formArquivo, setFormArquivo] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // ── Persistência Supabase ────────────────────────────
  useEffect(() => {
    loadAllModuleData<Record<string, Documento[]>>(MODULO_NAME).then((data) => {
      setDados(data as Record<string, Documento[]>);
      setLoaded(true);
    }).catch(() => {
      setDados(carregarDados());
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      saveAllModuleData(MODULO_NAME, dados);
    }
  }, [dados, loaded]);

  // Fechar drawer com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modalUpload) setModalUpload(false);
        else if (modalDetalhe) setModalDetalhe(null);
        else if (modalVersoes) setModalVersoes(null);
        else if (modalHistorico) setModalHistorico(null);
        else if (drawerAberto) setDrawerAberto(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerAberto, modalUpload, modalVersoes, modalHistorico, modalDetalhe]);

  // ── Cálculos derivados ───────────────────────────────

  const todosDocumentos = useMemo(() => {
    const all: (Documento & { orgaoId: string; orgaoSigla: string })[] = [];
    ORGAOS.forEach((org) => {
      (dados[org.id] || []).forEach((doc) => {
        const statusCalc = calcularStatus(doc.dataVencimento);
        all.push({ ...doc, orgaoId: org.id, orgaoSigla: org.sigla, status: statusCalc });
      });
    });
    return all;
  }, [dados]);

  const totalDocumentos = todosDocumentos.length;
  const totalValidos = todosDocumentos.filter((d) => d.status === "valido").length;
  const totalVencendo = todosDocumentos.filter((d) => d.status === "vencendo").length;
  const totalVencidos = todosDocumentos.filter((d) => d.status === "vencido").length;
  const totalPendentes = todosDocumentos.filter((d) => d.status === "pendente").length;
  const percentualConformidade =
    totalDocumentos > 0 ? Math.round((totalValidos / totalDocumentos) * 100) : 0;

  const orgaosFiltrados = useMemo(() => {
    let filtered = ORGAOS;
    if (filtroStatus === "pendentes") {
      filtered = filtered.filter((org) => {
        const docs = dados[org.id] || [];
        return docs.length === 0 || docs.some((d) => calcularStatus(d.dataVencimento) === "pendente");
      });
    }
    return filtered;
  }, [filtroStatus, dados]);

  // ── Handlers ─────────────────────────────────────────

  const obterDocumentos = useCallback(
    (orgaoId: string): Documento[] => {
      return (dados[orgaoId] || []).map((doc) => ({
        ...doc,
        status: calcularStatus(doc.dataVencimento),
      }));
    },
    [dados]
  );

  const obterConformidade = useCallback(
    (orgaoId: string) => {
      const org = ORGAOS.find((o) => o.id === orgaoId);
      if (!org) return { atendidos: 0, total: 0, percentual: 0 };
      const docs = dados[orgaoId] || [];
      const nomesDoc = docs.map((d) => d.nome.toLowerCase());
      let atendidos = 0;
      org.checklistObrigatorio.forEach((item) => {
        if (nomesDoc.some((n) => n.includes(item.toLowerCase().slice(0, 8)))) {
          atendidos++;
        }
      });
      // Also count if there are any valid documents covering the category
      const validDocs = docs.filter((d) => calcularStatus(d.dataVencimento) === "valido");
      if (validDocs.length >= org.checklistObrigatorio.length) {
        atendidos = org.checklistObrigatorio.length;
      }
      return {
        atendidos,
        total: org.checklistObrigatorio.length,
        percentual: org.checklistObrigatorio.length > 0
          ? Math.round((atendidos / org.checklistObrigatorio.length) * 100)
          : 0,
      };
    },
    [dados]
  );

  const contarAlertas = useCallback(
    (orgaoId: string) => {
      const docs = dados[orgaoId] || [];
      let vencidos = 0;
      let vencendo = 0;
      docs.forEach((d) => {
        const s = calcularStatus(d.dataVencimento);
        if (s === "vencido") vencidos++;
        if (s === "vencendo") vencendo++;
      });
      return { vencidos, vencendo };
    },
    [dados]
  );

  const handleAdicionarDocumento = useCallback(() => {
    if (!drawerAberto || !formNome.trim()) return;

    const { data, hora } = fmtDataHora();
    const novoDoc: Documento = {
      id: gerarId(),
      nome: formNome.trim(),
      categoria: formCategoria,
      dataEmissao: formEmissao,
      dataVencimento: formVencimento,
      status: calcularStatus(formVencimento),
      observacoes: formObs,
      versoes: [
        {
          id: gerarId(),
          versao: "v1.0",
          arquivo: formArquivo?.name || "documento.pdf",
          tamanho: formArquivo?.size || 0,
          dataEnvio: data,
          usuario: "Usuário Atual",
        },
      ],
      historico: [
        {
          id: gerarId(),
          data,
          hora,
          acao: "Documento criado e arquivo enviado",
          usuario: "Usuário Atual",
        },
      ],
      arquivoAtual: formArquivo?.name || "documento.pdf",
      tamanhoAtual: formArquivo?.size || 0,
      dataEnvioAtual: data,
      usuarioAtual: "Usuário Atual",
    };

    setDados((prev) => ({
      ...prev,
      [drawerAberto]: [...(prev[drawerAberto] || []), novoDoc],
    }));

    // Reset form
    setFormNome("");
    setFormCategoria(CATEGORIAS[0]);
    setFormEmissao("");
    setFormVencimento("");
    setFormObs("");
    setFormArquivo(null);
    setModalUpload(false);
  }, [drawerAberto, formNome, formCategoria, formEmissao, formVencimento, formObs, formArquivo]);

  const handleExcluirDocumento = useCallback(
    (orgaoId: string, docId: string) => {
      setDados((prev) => ({
        ...prev,
        [orgaoId]: (prev[orgaoId] || []).filter((d) => d.id !== docId),
      }));
    },
    []
  );

  const handleSubstituirArquivo = useCallback(
    (orgaoId: string, docId: string, arquivo: File) => {
      const { data, hora } = fmtDataHora();
      setDados((prev) => ({
        ...prev,
        [orgaoId]: (prev[orgaoId] || []).map((doc) => {
          if (doc.id !== docId) return doc;
          const versaoNum = doc.versoes.length + 1;
          const novaVersao: DocumentoVersion = {
            id: gerarId(),
            versao: `v${versaoNum}.0`,
            arquivo: arquivo.name,
            tamanho: arquivo.size,
            dataEnvio: data,
            usuario: "Usuário Atual",
          };
          const novoHistorico: DocumentoHistorico = {
            id: gerarId(),
            data,
            hora,
            acao: `Arquivo substituído por Usuário Atual (versão ${novaVersao.versao})`,
            usuario: "Usuário Atual",
          };
          return {
            ...doc,
            versoes: [...doc.versoes, novaVersao],
            historico: [...doc.historico, novoHistorico],
            arquivoAtual: arquivo.name,
            tamanhoAtual: arquivo.size,
            dataEnvioAtual: data,
          };
        }),
      }));
    },
    []
  );

  const handleBaixarPasta = useCallback(
    async (orgaoId: string) => {
      const org = ORGAOS.find((o) => o.id === orgaoId);
      if (!org) return;

      const docs = (dados[orgaoId] || []).filter(
        (d) => calcularStatus(d.dataVencimento) === "valido"
      );

      if (docs.length === 0) {
        alert("Nenhum documento válido encontrado para esta pasta.");
        return;
      }

      const zip = new JSZip();
      docs.forEach((doc) => {
        const folder = zip.folder(`${org.sigla}_${doc.categoria.replace(/\s+/g, "_")}`);
        if (folder) {
          folder.file(`${doc.nome.replace(/\s+/g, "_")}.pdf`, `Conteúdo simulado: ${doc.nome}`);
          folder.file(
            "METADADOS.txt",
            [
              `Documento: ${doc.nome}`,
              `Categoria: ${doc.categoria}`,
              `Emissão: ${fmtData(doc.dataEmissao)}`,
              `Vencimento: ${fmtData(doc.dataVencimento)}`,
              `Status: ${statusLabel(calcularStatus(doc.dataVencimento))}`,
              `Versão Atual: ${doc.versoes[doc.versoes.length - 1]?.versao || "N/A"}`,
              `Arquivo: ${doc.arquivoAtual}`,
              `Tamanho: ${formatarTamanho(doc.tamanhoAtual)}`,
            ].join("\n")
          );
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const dataStr = HOJE.toISOString().slice(0, 10);
      const fileName = `Fiscalizacao_${org.sigla}_${dataStr}.zip`;
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [dados]
  );

  const handleVisualizarDocumento = useCallback(
    (orgaoId: string, docId: string) => {
      setModalDetalhe({ orgaoId, docId });
    },
    []
  );

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */

  const documentosDrawer = drawerAberto ? obterDocumentos(drawerAberto) : [];
  const conformidadeDrawer = drawerAberto ? obterConformidade(drawerAberto) : null;
  const orgaoDrawer = ORGAOS.find((o) => o.id === drawerAberto);

  return (
    <div className="min-h-screen bg-[#12141c] text-white">
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        {/* ── HEADER ─────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00a572]/15 flex items-center justify-center">
              <Shield size={22} className="text-[#00a572]" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-white tracking-tight">
                Regulamentação
              </h1>
              <p className="text-[12px] text-[#6b7280] mt-[-2px]">
                Central de Conformidade e Fiscalização
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMostrarChecklist(!mostrarChecklist)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                mostrarChecklist
                  ? "bg-[#00a572] text-white"
                  : "bg-[#1d2027] text-[#9ca3af] border border-[#262a31] hover:border-[#00a572]/50 hover:text-white"
              }`}
            >
              <CheckCircle2 size={14} />
              Matriz de Conformidade
            </button>
            <div className="text-[11px] text-[#6b7280] font-mono">
              Base: {HOJE.toLocaleDateString("pt-BR")}
            </div>
          </div>
        </div>

        {/* ── DASHBOARD INDICATORS ───────────────────── */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            {
              label: "Total de Documentos",
              value: totalDocumentos,
              icon: <FileText size={18} />,
              color: "#6366f1",
              bg: "bg-[#6366f1]/10",
            },
            {
              label: "Válidos",
              value: totalValidos,
              icon: <CheckCircle2 size={18} />,
              color: "#00a572",
              bg: "bg-[#00a572]/10",
            },
            {
              label: "Vencendo",
              value: totalVencendo,
              icon: <Clock size={18} />,
              color: "#f59e0b",
              bg: "bg-[#f59e0b]/10",
            },
            {
              label: "Vencidos",
              value: totalVencidos,
              icon: <XCircle size={18} />,
              color: "#ef4444",
              bg: "bg-[#ef4444]/10",
            },
            {
              label: "Conformidade Geral",
              value: `${percentualConformidade}%`,
              icon: <TrendingUp size={18} />,
              color: percentualConformidade >= 70 ? "#00a572" : percentualConformidade >= 40 ? "#f59e0b" : "#ef4444",
              bg: percentualConformidade >= 70 ? "bg-[#00a572]/10" : percentualConformidade >= 40 ? "bg-[#f59e0b]/10" : "bg-[#ef4444]/10",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`${card.bg} rounded-xl p-4 border border-[#262a31] flex items-center gap-3`}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${card.color}20` }}
              >
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
              <div>
                <div className="text-[20px] font-bold text-white leading-none">
                  {card.value}
                </div>
                <div className="text-[10px] text-[#6b7280] mt-1 font-medium uppercase tracking-wider">
                  {card.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── QUICK FILTERS ─────────────────────────── */}
        <div className="flex items-center gap-2 mb-5">
          <Filter size={14} className="text-[#6b7280]" />
          <span className="text-[11px] text-[#6b7280] font-medium uppercase tracking-wider mr-1">
            Filtrar:
          </span>
          {[
            { key: null, label: "Todos", color: "#9ca3af" },
            { key: "validos", label: "Válidos", color: "#00a572" },
            { key: "vencendo", label: "Vencendo", color: "#f59e0b" },
            { key: "vencidos", label: "Vencidos", color: "#ef4444" },
            { key: "pendentes", label: "Pendentes", color: "#6b7280" },
          ].map((f) => (
            <button
              key={f.label}
              onClick={() => setFiltroStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                filtroStatus === f.key
                  ? "text-white border-current"
                  : "text-[#6b7280] border-[#262a31] hover:border-current hover:text-[#9ca3af]"
              }`}
              style={
                filtroStatus === f.key
                  ? { color: f.color, borderColor: f.color, backgroundColor: `${f.color}15` }
                  : {}
              }
            >
              {f.label}
            </button>
          ))}
          {totalPendentes > 0 && (
            <span className="ml-2 text-[10px] bg-[#6b7280]/20 text-[#9ca3af] px-2 py-0.5 rounded-full">
              {totalPendentes} pendente{totalPendentes > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── MATRIZ DE CONFORMIDADE ────────────────── */}
        {mostrarChecklist && (
          <div className="mb-5 bg-[#1d2027] rounded-xl border border-[#262a31] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#262a31] flex items-center gap-2">
              <BarChart3 size={16} className="text-[#00a572]" />
              <h3 className="text-[13px] font-bold text-white">
                Matriz de Conformidade — Checklist Obrigatório
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#262a31]">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">
                      Órgão
                    </th>
                    {ORGAOS.map((org) => (
                      <th
                        key={org.id}
                        className="px-3 py-2.5 text-center text-[10px] font-bold text-[#6b7280] uppercase tracking-wider"
                      >
                        {org.sigla}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#262a31]">
                    <td className="px-4 py-3 text-[11px] font-semibold text-white">
                      Documentos Obrigatórios
                    </td>
                    {ORGAOS.map((org) => {
                      const conf = obterConformidade(org.id);
                      return (
                        <td key={org.id} className="px-3 py-3 text-center">
                          <div className="text-[13px] font-bold text-white">
                            {conf.atendidos}/{conf.total}
                          </div>
                          <div className="mt-1.5 w-full bg-[#262a31] rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${conf.percentual}%`,
                                backgroundColor: conf.percentual >= 70 ? "#00a572" : conf.percentual >= 40 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                          <div
                            className="text-[10px] font-bold mt-1"
                            style={{
                              color: conf.percentual >= 70 ? "#00a572" : conf.percentual >= 40 ? "#f59e0b" : "#ef4444",
                            }}
                          >
                            {conf.percentual}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-[11px] font-semibold text-white">
                      Itens Exigidos
                    </td>
                    {ORGAOS.map((org) => (
                      <td key={org.id} className="px-3 py-3 text-center">
                        <div className="text-[10px] text-[#6b7280] leading-relaxed">
                          {org.checklistObrigatorio.map((item, i) => (
                            <div key={i}>• {item}</div>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── GRID DE ÓRGÃOS ────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          {orgaosFiltrados.map((org) => {
            const conf = obterConformidade(org.id);
            const alertas = contarAlertas(org.id);
            const docs = obterDocumentos(org.id);
            const totalDocs = docs.length;

            return (
              <button
                key={org.id}
                onClick={() => setDrawerAberto(org.id)}
                className="bg-[#1d2027] rounded-xl p-4 border border-[#262a31] text-left hover:border-[#00a572]/50 hover:bg-[#1d2027]/80 transition-all group cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[20px]">{org.icon}</span>
                    <div>
                      <div className="text-[13px] font-bold text-white group-hover:text-[#00a572] transition-colors">
                        {org.sigla}
                      </div>
                      <div className="text-[10px] text-[#6b7280] leading-tight max-w-[140px] truncate">
                        {org.nome}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-[#6b7280] group-hover:text-[#00a572] transition-colors"
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-[11px] text-[#9ca3af]">
                    <span className="font-bold text-white">{totalDocs}</span> doc{totalDocs !== 1 ? "s" : ""}
                  </div>
                  {alertas.vencidos > 0 && (
                    <div className="text-[10px] font-bold text-[#ef4444] bg-[#ef4444]/10 px-1.5 py-0.5 rounded">
                      {alertas.vencidos} vencido{alertas.vencidos > 1 ? "s" : ""}
                    </div>
                  )}
                  {alertas.vencendo > 0 && (
                    <div className="text-[10px] font-bold text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">
                      {alertas.vencendo} vencendo
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[#6b7280]">Conformidade</span>
                    <span
                      className="text-[11px] font-bold"
                      style={{
                        color: conf.percentual >= 70 ? "#00a572" : conf.percentual >= 40 ? "#f59e0b" : "#ef4444",
                      }}
                    >
                      {conf.percentual}%
                    </span>
                  </div>
                  <div className="w-full bg-[#262a31] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${conf.percentual}%`,
                        backgroundColor:
                          conf.percentual >= 70 ? "#00a572" : conf.percentual >= 40 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-[#6b7280] mt-1">
                    {conf.atendidos}/{conf.total} itens obrigatórios
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          DRAWER — PAINEL LATERAL DO ÓRGÃO
          ════════════════════════════════════════════════ */}
      {drawerAberto && orgaoDrawer && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setDrawerAberto(null)}
          />

          {/* Drawer */}
          <div
            ref={drawerRef}
            className="fixed right-0 top-0 h-full w-[580px] bg-[#1d2027] shadow-2xl border-l border-[#262a31] z-50 flex flex-col"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-[#262a31] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-[22px]">{orgaoDrawer.icon}</span>
                  <div>
                    <h2 className="text-[16px] font-bold text-white">
                      {orgaoDrawer.sigla}
                    </h2>
                    <p className="text-[11px] text-[#6b7280]">{orgaoDrawer.nome}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerAberto(null)}
                  className="w-8 h-8 rounded-lg bg-[#262a31] flex items-center justify-center hover:bg-[#ef4444]/20 hover:text-[#ef4444] transition-colors text-[#6b7280]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Conformidade do órgão */}
              {conformidadeDrawer && (
                <div className="bg-[#12141c] rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold">
                      Conformidade
                    </span>
                    <span
                      className="text-[14px] font-bold"
                      style={{
                        color:
                          conformidadeDrawer.percentual >= 70
                            ? "#00a572"
                            : conformidadeDrawer.percentual >= 40
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {conformidadeDrawer.percentual}%
                    </span>
                  </div>
                  <div className="w-full bg-[#262a31] rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${conformidadeDrawer.percentual}%`,
                        backgroundColor:
                          conformidadeDrawer.percentual >= 70
                            ? "#00a572"
                            : conformidadeDrawer.percentual >= 40
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-[#6b7280] mt-1">
                    {conformidadeDrawer.atendidos}/{conformidadeDrawer.total} itens do checklist obrigatório atendidos
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalUpload(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00a572] text-white text-[11px] font-semibold hover:bg-[#00a572]/90 transition-colors"
                >
                  <Plus size={13} />
                  Adicionar Documento
                </button>
                <button
                  onClick={() => {
                    alert("Relatório gerado e pronto para download!");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#262a31] text-[#9ca3af] text-[11px] font-semibold hover:bg-[#262a31]/80 hover:text-white border border-[#262a31] transition-colors"
                >
                  <FileText size={13} />
                  Gerar Relatório
                </button>
                <button
                  onClick={() => handleBaixarPasta(drawerAberto)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366f1]/15 text-[#6366f1] text-[11px] font-semibold hover:bg-[#6366f1]/25 transition-colors border border-[#6366f1]/30"
                >
                  <FolderDown size={13} />
                  Baixar Pasta de Fiscalização
                </button>
              </div>
            </div>

            {/* Drawer Search */}
            <div className="px-5 py-3 border-b border-[#262a31] flex-shrink-0">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]"
                />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar documento..."
                  className="w-full bg-[#12141c] border border-[#262a31] rounded-lg pl-9 pr-3 py-2 text-[12px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#00a572]/50"
                />
              </div>
            </div>

            {/* Drawer Body — Documents Table */}
            <div className="flex-1 overflow-y-auto">
              {documentosDrawer.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#6b7280]">
                  <Building2 size={40} className="mb-3 opacity-30" />
                  <p className="text-[13px] font-medium">Nenhum documento registrado</p>
                  <p className="text-[11px] mt-1">
                    Clique em "Adicionar Documento" para começar
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px]">
                    <thead>
                      <tr className="border-b border-[#262a31]">
                        {["Documento", "Emissão", "Vencimento", "Status", "Arquivo", "Ações"].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-3 py-2.5 text-left text-[10px] font-bold text-[#6b7280] uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {documentosDrawer
                        .filter(
                          (doc) =>
                            !busca ||
                            doc.nome.toLowerCase().includes(busca.toLowerCase()) ||
                            doc.categoria.toLowerCase().includes(busca.toLowerCase())
                        )
                        .map((doc) => {
                          const dias = diasRestantes(doc.dataVencimento);
                          const status = calcularStatus(doc.dataVencimento);
                          return (
                            <tr
                              key={doc.id}
                              className="border-b border-[#262a31]/50 hover:bg-[#262a31]/20 transition-colors"
                            >
                              <td className="px-3 py-2.5">
                                <div className="text-[12px] font-semibold text-white">
                                  {doc.nome}
                                </div>
                                <div className="text-[10px] text-[#6b7280]">
                                  {doc.categoria}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-[11px] text-[#9ca3af]">
                                {fmtData(doc.dataEmissao)}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="text-[11px] text-[#9ca3af]">
                                  {fmtData(doc.dataVencimento)}
                                </div>
                                {status === "vencendo" && (
                                  <div className="text-[9px] text-[#f59e0b] font-semibold mt-0.5">
                                    {dias > 0 ? `${dias} dias restantes` : "Vence hoje"}
                                  </div>
                                )}
                                {status === "vencido" && (
                                  <div className="text-[9px] text-[#ef4444] font-semibold mt-0.5">
                                    Vencido há {Math.abs(dias)} dias
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${statusCor(
                                    status
                                  )}`}
                                >
                                  {statusLabel(status)}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1 text-[10px] text-[#6b7280]">
                                  <FileText size={11} />
                                  <span className="truncate max-w-[80px]">
                                    {doc.arquivoAtual}
                                  </span>
                                </div>
                                <div className="text-[9px] text-[#6b7280]/60">
                                  {formatarTamanho(doc.tamanhoAtual)}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1">
                                  {/* Visualizar */}
                                  <button
                                    onClick={() =>
                                      handleVisualizarDocumento(drawerAberto!, doc.id)
                                    }
                                    className="w-6 h-6 rounded flex items-center justify-center text-[#6b7280] hover:text-[#00a572] hover:bg-[#00a572]/10 transition-colors"
                                    title="Visualizar"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  {/* Download */}
                                  <button
                                    onClick={() =>
                                      alert(`Download: ${doc.arquivoAtual}`)
                                    }
                                    className="w-6 h-6 rounded flex items-center justify-center text-[#6b7280] hover:text-[#6366f1] hover:bg-[#6366f1]/10 transition-colors"
                                    title="Baixar"
                                  >
                                    <Download size={12} />
                                  </button>
                                  {/* Editar */}
                                  <button
                                    onClick={() =>
                                      alert(`Edição do documento: ${doc.nome}`)
                                    }
                                    className="w-6 h-6 rounded flex items-center justify-center text-[#6b7280] hover:text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-colors"
                                    title="Editar"
                                  >
                                    <Edit3 size={12} />
                                  </button>
                                  {/* Substituir */}
                                  <label
                                    className="w-6 h-6 rounded flex items-center justify-center text-[#6b7280] hover:text-[#6366f1] hover:bg-[#6366f1]/10 transition-colors cursor-pointer"
                                    title="Substituir Arquivo"
                                  >
                                    <Copy size={12} />
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.png,.jpg,.jpeg"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f)
                                          handleSubstituirArquivo(
                                            drawerAberto!,
                                            doc.id,
                                            f
                                          );
                                      }}
                                    />
                                  </label>
                                  {/* Excluir */}
                                  <button
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Excluir "${doc.nome}"? Esta ação não pode ser desfeita.`
                                        )
                                      )
                                        handleExcluirDocumento(
                                          drawerAberto!,
                                          doc.id
                                        );
                                    }}
                                    className="w-6 h-6 rounded flex items-center justify-center text-[#6b7280] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                  {/* Histórico */}
                                  <button
                                    onClick={() => setModalHistorico(doc.id)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-[#6b7280] hover:text-[#9ca3af] hover:bg-[#9ca3af]/10 transition-colors"
                                    title="Histórico"
                                  >
                                    <History size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-5 py-3 border-t border-[#262a31] flex-shrink-0 flex items-center justify-between">
              <div className="text-[10px] text-[#6b7280]">
                {documentosDrawer.length} documento{documentosDrawer.length !== 1 ? "s" : ""}
              </div>
              <div className="text-[10px] text-[#6b7280]">
                Última atualização: {new Date().toLocaleTimeString("pt-BR")}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════
          MODAL — UPLOAD / ADICIONAR DOCUMENTO
          ════════════════════════════════════════════════ */}
      {modalUpload && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={() => setModalUpload(false)}
          />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <div
              className="bg-[#1d2027] rounded-2xl border border-[#262a31] w-full max-w-[520px] max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#262a31] flex items-center justify-between sticky top-0 bg-[#1d2027] z-10">
                <div className="flex items-center gap-2">
                  <FileUp size={18} className="text-[#00a572]" />
                  <h3 className="text-[15px] font-bold text-white">
                    Adicionar Documento
                  </h3>
                </div>
                <button
                  onClick={() => setModalUpload(false)}
                  className="w-8 h-8 rounded-lg bg-[#262a31] flex items-center justify-center hover:bg-[#ef4444]/20 hover:text-[#ef4444] transition-colors text-[#6b7280]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-5 space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
                    Nome do Documento *
                  </label>
                  <input
                    type="text"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Certificado das Bombas 2026"
                    className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-3 py-2.5 text-[12px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#00a572]/50 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
                    Categoria
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value)}
                    className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-3 py-2.5 text-[12px] text-white focus:outline-none focus:border-[#00a572]/50 transition-colors appearance-none cursor-pointer"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
                      Data de Emissão
                    </label>
                    <input
                      type="date"
                      value={formEmissao}
                      onChange={(e) => setFormEmissao(e.target.value)}
                      className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-3 py-2.5 text-[12px] text-white focus:outline-none focus:border-[#00a572]/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
                      Data de Vencimento *
                    </label>
                    <input
                      type="date"
                      value={formVencimento}
                      onChange={(e) => setFormVencimento(e.target.value)}
                      className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-3 py-2.5 text-[12px] text-white focus:outline-none focus:border-[#00a572]/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
                    Observações
                  </label>
                  <textarea
                    value={formObs}
                    onChange={(e) => setFormObs(e.target.value)}
                    placeholder="Observações adicionais sobre o documento..."
                    rows={3}
                    className="w-full bg-[#12141c] border border-[#262a31] rounded-lg px-3 py-2.5 text-[12px] text-white placeholder-[#6b7280] focus:outline-none focus:border-[#00a572]/50 transition-colors resize-none"
                  />
                </div>

                {/* Drag Zone */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#9ca3af] mb-1.5 uppercase tracking-wider">
                    Arquivo (PDF, PNG, JPG)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("border-[#00a572]", "bg-[#00a572]/5");
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove("border-[#00a572]", "bg-[#00a572]/5");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-[#00a572]", "bg-[#00a572]/5");
                      const f = e.dataTransfer.files?.[0];
                      if (f) setFormArquivo(f);
                    }}
                    className="border-2 border-dashed border-[#262a31] rounded-xl p-6 text-center cursor-pointer hover:border-[#00a572]/50 hover:bg-[#00a572]/5 transition-all"
                  >
                    <Upload size={28} className="mx-auto mb-2 text-[#6b7280]" />
                    <p className="text-[12px] text-[#6b7280]">
                      {formArquivo ? (
                        <span className="text-[#00a572] font-semibold">
                          ✓ {formArquivo.name}
                        </span>
                      ) : (
                        <>
                          Arraste o arquivo aqui ou{" "}
                          <span className="text-[#00a572] font-semibold">
                            clique para selecionar
                          </span>
                        </>
                      )}
                    </p>
                    {formArquivo && (
                      <p className="text-[10px] text-[#6b7280] mt-1">
                        {formatarTamanho(formArquivo.size)} • Clique para substituir
                      </p>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setFormArquivo(f);
                    }}
                  />
                </div>

                {/* File metadata */}
                {formArquivo && (
                  <div className="bg-[#12141c] rounded-lg p-3 border border-[#262a31]">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-[#00a572] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold text-white truncate">
                          {formArquivo.name}
                        </div>
                        <div className="text-[10px] text-[#6b7280]">
                          {formatarTamanho(formArquivo.size)} • Enviado em{" "}
                          {new Date().toLocaleDateString("pt-BR")} • Usuário Atual
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-[#262a31] flex items-center justify-end gap-2">
                <button
                  onClick={() => setModalUpload(false)}
                  className="px-4 py-2 rounded-lg bg-[#262a31] text-[#9ca3af] text-[12px] font-semibold hover:bg-[#262a31]/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdicionarDocumento}
                  disabled={!formNome.trim()}
                  className="px-4 py-2 rounded-lg bg-[#00a572] text-white text-[12px] font-semibold hover:bg-[#00a572]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Salvar Documento
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════
          MODAL — DETALHE DO DOCUMENTO
          ════════════════════════════════════════════════ */}
      {modalDetalhe && (() => {
        const doc = (dados[modalDetalhe.orgaoId] || []).find(
          (d) => d.id === modalDetalhe.docId
        );
        const org = ORGAOS.find((o) => o.id === modalDetalhe.orgaoId);
        if (!doc || !org) return null;
        const status = calcularStatus(doc.dataVencimento);
        return (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[60]"
              onClick={() => setModalDetalhe(null)}
            />
            <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
              <div
                className="bg-[#1d2027] rounded-2xl border border-[#262a31] w-full max-w-[480px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-[#262a31] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info size={18} className="text-[#00a572]" />
                    <h3 className="text-[15px] font-bold text-white">
                      Detalhes do Documento
                    </h3>
                  </div>
                  <button
                    onClick={() => setModalDetalhe(null)}
                    className="w-8 h-8 rounded-lg bg-[#262a31] flex items-center justify-center hover:bg-[#ef4444]/20 hover:text-[#ef4444] transition-colors text-[#6b7280]"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[28px]">{org.icon}</span>
                    <div>
                      <div className="text-[14px] font-bold text-white">{doc.nome}</div>
                      <div className="text-[11px] text-[#6b7280]">
                        {org.sigla} • {doc.categoria}
                      </div>
                    </div>
                  </div>
                  {[
                    { label: "Status", value: statusLabel(status), custom: (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${statusCor(status)}`}>
                        {statusLabel(status)}
                      </span>
                    )},
                    { label: "Data de Emissão", value: fmtData(doc.dataEmissao) },
                    { label: "Data de Vencimento", value: fmtData(doc.dataVencimento) },
                    { label: "Arquivo Atual", value: doc.arquivoAtual },
                    { label: "Tamanho", value: formatarTamanho(doc.tamanhoAtual) },
                    { label: "Enviado em", value: doc.dataEnvioAtual },
                    { label: "Enviado por", value: doc.usuarioAtual },
                    { label: "Versões", value: `${doc.versoes.length} versão(ões)` },
                    { label: "Histórico", value: `${doc.historico.length} registro(s)` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[#262a31]/50 last:border-0">
                      <span className="text-[11px] text-[#6b7280]">{item.label}</span>
                      {item.custom || (
                        <span className="text-[12px] text-white font-medium">{item.value}</span>
                      )}
                    </div>
                  ))}
                  {doc.observacoes && (
                    <div className="mt-2 p-3 bg-[#12141c] rounded-lg border border-[#262a31]">
                      <div className="text-[10px] text-[#6b7280] uppercase tracking-wider font-semibold mb-1">
                        Observações
                      </div>
                      <p className="text-[12px] text-[#9ca3af]">{doc.observacoes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ════════════════════════════════════════════════
          MODAL — VERSIONAMENTO
          ════════════════════════════════════════════════ */}
      {modalVersoes && (() => {
        const doc = (dados[drawerAberto!] || []).find((d) => d.id === modalVersoes);
        if (!doc) return null;
        return (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[60]"
              onClick={() => setModalVersoes(null)}
            />
            <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
              <div
                className="bg-[#1d2027] rounded-2xl border border-[#262a31] w-full max-w-[440px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-[#262a31] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch size={18} className="text-[#6366f1]" />
                    <h3 className="text-[15px] font-bold text-white">
                      Versões — {doc.nome}
                    </h3>
                  </div>
                  <button
                    onClick={() => setModalVersoes(null)}
                    className="w-8 h-8 rounded-lg bg-[#262a31] flex items-center justify-center hover:bg-[#ef4444]/20 hover:text-[#ef4444] transition-colors text-[#6b7280]"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    {[...doc.versoes].reverse().map((v, i) => (
                      <div
                        key={v.id}
                        className={`p-3 rounded-lg border ${
                          i === 0
                            ? "bg-[#00a572]/5 border-[#00a572]/30"
                            : "bg-[#12141c] border-[#262a31]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                i === 0
                                  ? "bg-[#00a572]/20 text-[#00a572]"
                                  : "bg-[#262a31] text-[#6b7280]"
                              }`}
                            >
                              {v.versao}
                            </span>
                            {i === 0 && (
                              <span className="text-[9px] text-[#00a572] font-semibold uppercase">
                                Atual
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => alert(`Download: ${v.arquivo}`)}
                            className="text-[10px] text-[#6366f1] hover:text-[#6366f1]/80 font-semibold"
                          >
                            Baixar
                          </button>
                        </div>
                        <div className="text-[11px] text-[#9ca3af] mt-1.5">
                          {v.arquivo} • {formatarTamanho(v.tamanho)}
                        </div>
                        <div className="text-[10px] text-[#6b7280] mt-0.5">
                          Enviado por {v.usuario} em {v.dataEnvio}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ════════════════════════════════════════════════
          MODAL — HISTÓRICO
          ════════════════════════════════════════════════ */}
      {modalHistorico && (() => {
        const doc = (dados[drawerAberto!] || []).find((d) => d.id === modalHistorico);
        if (!doc) return null;
        return (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[60]"
              onClick={() => setModalHistorico(null)}
            />
            <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
              <div
                className="bg-[#1d2027] rounded-2xl border border-[#262a31] w-full max-w-[480px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-[#262a31] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-[#f59e0b]" />
                    <h3 className="text-[15px] font-bold text-white">
                      Histórico — {doc.nome}
                    </h3>
                  </div>
                  <button
                    onClick={() => setModalHistorico(null)}
                    className="w-8 h-8 rounded-lg bg-[#262a31] flex items-center justify-center hover:bg-[#ef4444]/20 hover:text-[#ef4444] transition-colors text-[#6b7280]"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="relative pl-4">
                    {/* Timeline line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#262a31]" />
                    <div className="space-y-4">
                      {[...doc.historico].reverse().map((h, i) => (
                        <div key={h.id} className="relative flex gap-3">
                          <div
                            className={`w-[14px] h-[14px] rounded-full border-2 flex-shrink-0 mt-0.5 z-10 ${
                              i === 0
                                ? "bg-[#00a572] border-[#00a572]"
                                : "bg-[#1d2027] border-[#262a31]"
                            }`}
                          />
                          <div className="flex-1">
                            <div className="text-[12px] text-white font-medium">
                              {h.acao}
                            </div>
                            <div className="text-[10px] text-[#6b7280] mt-0.5">
                              {h.data} às {h.hora} • {h.usuario}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
