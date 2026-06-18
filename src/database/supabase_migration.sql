-- ============================================================================
-- FuelOps Pro — Script de Migração Completo para Supabase
-- Versão: 2.0.0 | Data: 2026-06-16
-- Descrição: Criação do banco de dados completo do FuelOps Pro, substituindo
--            a persistência local (localStorage) por PostgreSQL no Supabase.
--            
-- INSTRUÇÕES:
--   1. Acesse o painel do Supabase → SQL Editor
--   2. Cole este script completo e execute
--   3. Verifique se todas as tabelas foram criadas no menu "Table Editor"
--
-- PADRÕES:
--   • Chaves primárias: UUID (gen_random_uuid() — nativo PostgreSQL 13+)
--   • Chaves estrangeiras: ON DELETE CASCADE / SET NULL conforme contexto
--   • Campos de data/hora: TIMESTAMPTZ DEFAULT NOW()
--   • Nomenclatura: português, snake_case
--   • Valores CHECK: sem espaços (usar underscores)
-- ============================================================================


-- ############################################################################
-- ############################################################################
--   MÓDULO: ADMINISTRAÇÃO E USUÁRIOS
--   Estrutura base de governança, permissões e configurações do sistema.
-- ############################################################################
-- ############################################################################

-- ============================================================================
-- 1. TABELA: USUÁRIOS (Governança e Permissões)
-- ============================================================================
-- Controla todos os usuários do sistema com perfis de acesso por cargo.
-- Cada módulo pode consultar esta tabela para identificar responsável/autor.
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    cargo       TEXT NOT NULL CHECK (cargo IN ('frentista', 'caixa', 'gerente', 'administrador')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  usuarios IS 'Usuários do sistema FuelOps Pro com controle de acesso por cargo';
COMMENT ON COLUMN usuarios.cargo IS 'Perfil de acesso: frentista, caixa, gerente ou administrador';

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);

-- ============================================================================
-- 2. TABELA: PARÂMETROS DO SISTEMA (Configurações Cadastrais da Empresa)
-- ============================================================================
-- Armazena os dados cadastrais da empresa/posto.
-- updated_at é atualizado automaticamente via trigger.
-- ============================================================================
CREATE TABLE IF NOT EXISTS parametros_sistema (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_empresa        TEXT NOT NULL DEFAULT 'Posto Carga Pesada',
    cnpj                TEXT NOT NULL UNIQUE,
    endereco            TEXT,
    telefone            TEXT,
    email_corporativo   TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE parametros_sistema IS 'Dados cadastrais e configurações gerais do posto de combustível';

-- ============================================================================
-- 3. TABELA: ARQUIVOS (Central Global de Armazenamento)
-- ============================================================================
-- Registro metadados de todos os arquivos enviados em qualquer módulo.
-- O upload real ocorre no Supabase Storage; esta tabela indexa os metadados.
-- Campos de URL e tamanho são nullable para suportar uploads pendentes.
-- ============================================================================
CREATE TABLE IF NOT EXISTS arquivos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_arquivo            TEXT NOT NULL,
    modulo_origem           TEXT NOT NULL,
    registro_relacionado_id UUID,
    tamanho_bytes           BIGINT,
    url_supabase_storage    TEXT,
    usuario_id              UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    is_orfao                BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  arquivos IS 'Central global de metadados de arquivos de todos os módulos';
COMMENT ON COLUMN arquivos.modulo_origem IS 'Módulo que originou o arquivo (regulamentacao, manutencao, etc.)';
COMMENT ON COLUMN arquivos.is_orfao IS 'true se o arquivo não está vinculado a nenhum registro ativo';

CREATE INDEX IF NOT EXISTS idx_arquivos_modulo      ON arquivos (modulo_origem);
CREATE INDEX IF NOT EXISTS idx_arquivos_orfaos      ON arquivos (is_orfao) WHERE is_orfao = true;
CREATE INDEX IF NOT EXISTS idx_arquivos_registro    ON arquivos (registro_relacionado_id);


-- ############################################################################
-- ############################################################################
--   MÓDULO: REGULAMENTAÇÃO
--   Controle de conformidade e fiscalização do posto de combustíveis.
-- ############################################################################
-- ############################################################################

-- ============================================================================
-- 4. TABELA: REGULAMENTAÇÃO — DOCUMENTOS
-- ============================================================================
-- Documentos normativos/legais vinculados a órgãos fiscalizadores.
-- Controle de versão e validade (data de emissão → vencimento).
-- ============================================================================
CREATE TABLE IF NOT EXISTS regulamentacao_documentos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_documento      TEXT NOT NULL,
    categoria           TEXT NOT NULL,
    orgao_fiscalizador  TEXT NOT NULL,
    data_emissao        DATE NOT NULL,
    data_vencimento     DATE NOT NULL,
    versao              INTEGER NOT NULL DEFAULT 1,
    observacoes         TEXT,
    arquivo_id          UUID REFERENCES arquivos(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  regulamentacao_documentos IS 'Documentos de conformidade e fiscalização do posto';
COMMENT ON COLUMN regulamentacao_documentos.orgao_fiscalizador IS 'Órgão emissor/responsável pela fiscalização';

CREATE INDEX IF NOT EXISTS idx_reg_doc_orgao     ON regulamentacao_documentos (orgao_fiscalizador);
CREATE INDEX IF NOT EXISTS idx_reg_doc_vencimento ON regulamentacao_documentos (data_vencimento);

-- ============================================================================
-- 5. TABELA: REGULAMENTAÇÃO — HISTÓRICO
-- ============================================================================
-- Trilha de auditoria: cada ação (criação, edição, exclusão, download)
-- realizada sobre um documento de regulamentação.
-- ============================================================================
CREATE TABLE IF NOT EXISTS regulamentacao_historico (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id    UUID NOT NULL REFERENCES regulamentacao_documentos(id) ON DELETE CASCADE,
    acao            TEXT NOT NULL,
    justificativa   TEXT,
    usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE regulamentacao_historico IS 'Histórico de ações sobre documentos de regulamentação (audit trail)';

CREATE INDEX IF NOT EXISTS idx_reg_hist_doc ON regulamentacao_historico (documento_id);


-- ############################################################################
-- ############################################################################
--   MÓDULO: MANUTENÇÃO
--   Controle de bombas, bicos, registros de manutenção, gerador e limpeza.
-- ############################################################################
-- ############################################################################

-- ============================================================================
-- 6. TABELA: MANUTENÇÃO — BOMBAS
-- ============================================================================
-- Cadastro das bombas de abastecimento do posto.
-- ============================================================================
CREATE TABLE IF NOT EXISTS manutencao_bombas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identificacao   TEXT NOT NULL UNIQUE,
    qtd_bicos       INTEGER NOT NULL DEFAULT 1,
    combustivel     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'operando' CHECK (status IN ('operando', 'manutencao', 'interditada')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE manutencao_bombas IS 'Cadastro de bombas de abastecimento do posto';

-- ============================================================================
-- 7. TABELA: MANUTENÇÃO — BICOS
-- ============================================================================
-- Bicos (dispensadores) vinculados a cada bomba.
-- ============================================================================
CREATE TABLE IF NOT EXISTS manutencao_bicos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bomba_id        UUID NOT NULL REFERENCES manutencao_bombas(id) ON DELETE CASCADE,
    identificacao   TEXT NOT NULL,
    produto         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'operando' CHECK (status IN ('operando', 'manutencao', 'substituido')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE manutencao_bicos IS 'Bicos/dispensadores vinculados às bombas';

CREATE INDEX IF NOT EXISTS idx_manut_bicos_bomba ON manutencao_bicos (bomba_id);

-- ============================================================================
-- 8. TABELA: MANUTENÇÃO — REGISTROS
-- ============================================================================
-- Registro detalhado de cada serviço de manutenção realizado.
-- Pode ser vinculado a bomba, bico, ou ambos (Nullable).
-- custo_total é calculado automaticamente (STORED).
-- ============================================================================
CREATE TABLE IF NOT EXISTS manutencao_registros (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_hora           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    equipamento_tipo    TEXT NOT NULL,
    bomba_id            UUID REFERENCES manutencao_bombas(id) ON DELETE SET NULL,
    bico_id             UUID REFERENCES manutencao_bicos(id) ON DELETE SET NULL,
    tipo_manutencao     TEXT NOT NULL,
    descricao           TEXT NOT NULL,
    responsavel         TEXT NOT NULL,
    valor_peca          NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    valor_mao_obra      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    custo_total         NUMERIC(10,2) GENERATED ALWAYS AS (valor_peca + valor_mao_obra) STORED,
    observacoes         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  manutencao_registros IS 'Registro de todos os serviços de manutenção (corretiva/preventiva)';
COMMENT ON COLUMN manutencao_registros.custo_total IS 'Calculado automaticamente: valor_peca + valor_mao_obra';
COMMENT ON COLUMN manutencao_registros.equipamento_tipo IS 'Tipo do equipamento: bomba, bico, gerador, etc.';

CREATE INDEX IF NOT EXISTS idx_manut_reg_data      ON manutencao_registros (data_hora);
CREATE INDEX IF NOT EXISTS idx_manut_reg_bomba     ON manutencao_registros (bomba_id);
CREATE INDEX IF NOT EXISTS idx_manut_reg_bico      ON manutencao_registros (bico_id);

-- ============================================================================
-- 9. TABELA: MANUTENÇÃO — PREVENTIVAS
-- ============================================================================
-- Agenda de manutenções preventivas com status de acompanhamento.
-- ============================================================================
CREATE TABLE IF NOT EXISTS manutencao_preventivas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipamento     TEXT NOT NULL,
    tipo            TEXT NOT NULL,
    data_prevista   DATE NOT NULL,
    responsavel     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'programada' CHECK (status IN ('programada', 'em_andamento', 'concluida', 'atrasada')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE manutencao_preventivas IS 'Agenda e acompanhamento de manutenções preventivas';

CREATE INDEX IF NOT EXISTS idx_manut_prev_status ON manutencao_preventivas (status);
CREATE INDEX IF NOT EXISTS idx_manut_prev_data   ON manutencao_preventivas (data_prevista);

-- ============================================================================
-- 10. TABELA: MANUTENÇÃO — CONTROLE DO GERADOR
-- ============================================================================
-- Registro diário de operação do gerador (horímetro, consumo de combustível).
-- horas_trabalhadas e consumo_medio são calculados automaticamente (STORED).
-- ============================================================================
CREATE TABLE IF NOT EXISTS controle_gerador (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data                DATE NOT NULL DEFAULT CURRENT_DATE,
    horimetro_inicial   NUMERIC(10,2) NOT NULL,
    horimetro_final     NUMERIC(10,2) NOT NULL,
    horas_trabalhadas   NUMERIC(10,2) GENERATED ALWAYS AS (horimetro_final - horimetro_inicial) STORED,
    litros_abastecidos  NUMERIC(10,2) NOT NULL,
    consumo_medio       NUMERIC(10,4) GENERATED ALWAYS AS (
                            CASE
                                WHEN (horimetro_final - horimetro_inicial) = 0 THEN 0
                                ELSE litros_abastecidos / (horimetro_final - horimetro_inicial)
                            END
                        ) STORED,
    responsavel         TEXT NOT NULL,
    observacoes         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE controle_gerador IS 'Controle diário de operação e consumo do gerador elétrico';
COMMENT ON COLUMN controle_gerador.horas_trabalhadas IS 'Calculado: horimetro_final - horimetro_inicial';
COMMENT ON COLUMN controle_gerador.consumo_medio IS 'Calculado: litros_abastecidos / horas_trabalhadas';

CREATE INDEX IF NOT EXISTS idx_gerador_data ON controle_gerador (data);

-- ============================================================================
-- 11. TABELA: MANUTENÇÃO — GASTOS COM LIMPEZA
-- ============================================================================
-- Registro de gastos com produtos de limpeza do posto.
-- ============================================================================
CREATE TABLE IF NOT EXISTS gastos_limpeza (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data            DATE NOT NULL,
    produto         TEXT NOT NULL,
    quantidade      NUMERIC(10,2) NOT NULL,
    valor_total     NUMERIC(10,2) NOT NULL,
    observacao      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE gastos_limpeza IS 'Registro de gastos com produtos de limpeza do posto';

CREATE INDEX IF NOT EXISTS idx_gastos_limpeza_data ON gastos_limpeza (data);

-- ============================================================================
-- 12. TABELA: MANUTENÇÃO — TETO ORÇAMENTÁRIO
-- ============================================================================
-- Limite mensal de orçamento para o módulo de manutenção.
-- ============================================================================
CREATE TABLE IF NOT EXISTS teto_orcamentario (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano_mes     TEXT NOT NULL UNIQUE,
    valor_teto  NUMERIC(14,2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE teto_orcamentario IS 'Teto orçamentário mensal para o módulo de manutenção';


-- ############################################################################
-- ############################################################################
--   MÓDULO: COMERCIAL
--   KPIs de vendas, funil comercial e estratégias.
-- ############################################################################
-- ############################################################################

-- ============================================================================
-- 13. TABELA: COMERCIAL — KPIs
-- ============================================================================
-- Indicadores consolidados de performance comercial por período (mês/ano).
-- ============================================================================
CREATE TABLE IF NOT EXISTS comercial_kpis (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano_mes                 TEXT NOT NULL UNIQUE,
    leads_captados          INTEGER NOT NULL DEFAULT 0,
    propostas_enviadas      INTEGER NOT NULL DEFAULT 0,
    novos_clientes          INTEGER NOT NULL DEFAULT 0,
    atividades_onboarding   INTEGER NOT NULL DEFAULT 0,
    taxa_retencao           NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    comissao_prevista       NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    comissao_realizada      NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE comercial_kpis IS 'Indicadores de performance comercial consolidados por período';

-- ============================================================================
-- 14. TABELA: COMERCIAL — ESTRATÉGIAS
-- ============================================================================
-- Planos estratégicos comerciais com ciclo de vida (início → término).
-- ============================================================================
CREATE TABLE IF NOT EXISTS comercial_estrategias (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano_mes             TEXT NOT NULL,
    nome_estrategia     TEXT NOT NULL,
    objetivo            TEXT NOT NULL,
    descricao           TEXT,
    data_inicio         DATE,
    data_termino        DATE,
    prioridade          TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
    resultado_esperado  TEXT,
    resultado_obtido    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE comercial_estrategias IS 'Estratégias e planos de ação comercial';

CREATE INDEX IF NOT EXISTS idx_com_estrat_periodo ON comercial_estrategias (ano_mes);
CREATE INDEX IF NOT EXISTS idx_com_estrat_prior   ON comercial_estrategias (prioridade);


-- ############################################################################
-- ############################################################################
--   MÓDULO: ATENDIMENTO AO CLIENTE
--   NPS, reclamações, elogios e planos de ação de CX.
-- ############################################################################
-- ############################################################################

-- ============================================================================
-- 15. TABELA: ATENDIMENTO — SATISFAÇÃO
-- ============================================================================
-- Indicadores de satisfação do cliente consolidados por período.
-- ============================================================================
CREATE TABLE IF NOT EXISTS atendimento_satisfacao (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano_mes                 TEXT NOT NULL UNIQUE,
    nps_google              NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    nota_google             NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    qtd_avaliacoes_google   INTEGER NOT NULL DEFAULT 0,
    indice_totem            NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    indice_presencial       NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE atendimento_satisfacao IS 'Indicadores consolidados de satisfação do cliente por período';

-- ============================================================================
-- 16. TABELA: ATENDIMENTO — RECLAMAÇÕES
-- ============================================================================
-- Registro de todas as reclamações recebidas, com ciclo de vida.
-- ============================================================================
CREATE TABLE IF NOT EXISTS atendimento_reclamacoes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data                DATE NOT NULL,
    cliente             TEXT,
    canal_origem        TEXT NOT NULL,
    tipo_reclamacao     TEXT NOT NULL,
    descricao           TEXT NOT NULL,
    responsavel         TEXT,
    status              TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_analise', 'em_andamento', 'resolvida', 'encerrada')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE atendimento_reclamacoes IS 'Registro e acompanhamento de reclamações de clientes';
COMMENT ON COLUMN atendimento_reclamacoes.canal_origem IS 'Canal de origem: Google, Totem, Presencial, etc.';

CREATE INDEX IF NOT EXISTS idx_atend_reclam_status ON atendimento_reclamacoes (status);
CREATE INDEX IF NOT EXISTS idx_atend_reclam_data   ON atendimento_reclamacoes (data);

-- ============================================================================
-- 17. TABELA: ATENDIMENTO — ELOGIOS
-- ============================================================================
-- Registro de elogios e feedbacks positivos de clientes.
-- ============================================================================
CREATE TABLE IF NOT EXISTS atendimento_elogios (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data                DATE NOT NULL,
    cliente             TEXT,
    funcionario_citado  TEXT NOT NULL,
    descricao           TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE atendimento_elogios IS 'Registro de elogios e feedbacks positivos de clientes';

-- ============================================================================
-- 18. TABELA: ATENDIMENTO — PLANOS DE AÇÃO
-- ============================================================================
-- Planos de ação para melhoria da experiência do cliente (CX).
-- ============================================================================
CREATE TABLE IF NOT EXISTS atendimento_planos_acao (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_plano              TEXT NOT NULL,
    problema_identificado   TEXT NOT NULL,
    objetivo                TEXT NOT NULL,
    responsavel             TEXT NOT NULL,
    data_inicio             DATE,
    data_conclusao          DATE,
    status                  TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_andamento', 'concluido', 'cancelado')),
    resultado_esperado      TEXT,
    resultado_obtido        TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE atendimento_planos_acao IS 'Planos de ação para melhoria da experiência do cliente';

CREATE INDEX IF NOT EXISTS idx_atend_plano_status ON atendimento_planos_acao (status);


-- ############################################################################
-- ############################################################################
--   FUNÇÕES E TRIGGERS
-- ############################################################################
-- ############################################################################

-- ============================================================================
-- FUNÇÃO: Atualizar `updated_at` automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica trigger de updated_at na tabela parametros_sistema
CREATE TRIGGER trg_parametros_updated_at
    BEFORE UPDATE ON parametros_sistema
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_at();

-- ============================================================================
-- FUNÇÃO: Validar unicidade de períodos em tabelas mensais
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_validar_unicidade_periodo()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'comercial_kpis' THEN
        IF EXISTS (SELECT 1 FROM comercial_kpis WHERE ano_mes = NEW.ano_mes AND id != NEW.id) THEN
            RAISE EXCEPTION 'Já existe um registro de KPIs para o período %', NEW.ano_mes;
        END IF;
    ELSIF TG_TABLE_NAME = 'atendimento_satisfacao' THEN
        IF EXISTS (SELECT 1 FROM atendimento_satisfacao WHERE ano_mes = NEW.ano_mes AND id != NEW.id) THEN
            RAISE EXCEPTION 'Já existe um registro de satisfação para o período %', NEW.ano_mes;
        END IF;
    ELSIF TG_TABLE_NAME = 'teto_orcamentario' THEN
        IF EXISTS (SELECT 1 FROM teto_orcamentario WHERE ano_mes = NEW.ano_mes AND id != NEW.id) THEN
            RAISE EXCEPTION 'Já existe teto orçamentário para o período %', NEW.ano_mes;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kpis_unicidade
    BEFORE INSERT OR UPDATE ON comercial_kpis
    FOR EACH ROW EXECUTE FUNCTION fn_validar_unicidade_periodo();

CREATE TRIGGER trg_satisfacao_unicidade
    BEFORE INSERT OR UPDATE ON atendimento_satisfacao
    FOR EACH ROW EXECUTE FUNCTION fn_validar_unicidade_periodo();

CREATE TRIGGER trg_teto_unicidade
    BEFORE INSERT OR UPDATE ON teto_orcamentario
    FOR EACH ROW EXECUTE FUNCTION fn_validar_unicidade_periodo();


-- ############################################################################
-- ############################################################################
--   POLÍTICAS DE ACESSO (RLS — Row Level Security)
-- ############################################################################
-- ############################################################################

-- Habilita RLS em todas as tabelas (recomendado para produção).
-- Em desenvolvimento, desative temporariamente ou use a chave 'anon'.
-- ############################################################################

ALTER TABLE usuarios                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametros_sistema        ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulamentacao_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulamentacao_historico  ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutencao_bombas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutencao_bicos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutencao_registros      ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutencao_preventivas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE controle_gerador          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_limpeza            ENABLE ROW LEVEL SECURITY;
ALTER TABLE teto_orcamentario         ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial_kpis            ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial_estrategias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimento_satisfacao    ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimento_reclamacoes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimento_elogios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimento_planos_acao   ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS PERMISSIVAS (desenvolvimento)
-- ============================================================================
-- Leitura para todos os autenticados, escrita para todos os autenticados.
-- Em produção, refine conforme perfis de cargo (frentista, caixa, etc.).
-- ============================================================================

-- Leitura: todos os autenticados
CREATE POLICY "leitura_usuarios" ON usuarios
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "leitura_parametros" ON parametros_sistema
    FOR SELECT USING (auth.role() = 'authenticated');

-- Escrita em parametros_sistema: apenas administradores
CREATE POLICY "escrita_parametros_admin" ON parametros_sistema
    FOR ALL USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.email = auth.email()
            AND usuarios.cargo = 'administrador'
        )
    );

-- Escrita em usuarios: apenas administradores
CREATE POLICY "escrita_usuarios_admin" ON usuarios
    FOR ALL USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM usuarios
            WHERE usuarios.email = auth.email()
            AND usuarios.cargo = 'administrador'
        )
    );

-- Políticas gerais: acesso completo para autenticados
CREATE POLICY "acesso_arquivos" ON arquivos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_reg_docs" ON regulamentacao_documentos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_reg_hist" ON regulamentacao_historico
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_manut_bombas" ON manutencao_bombas
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_manut_bicos" ON manutencao_bicos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_manut_registros" ON manutencao_registros
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_manut_preventivas" ON manutencao_preventivas
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_gerador" ON controle_gerador
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_limpeza" ON gastos_limpeza
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_teto" ON teto_orcamentario
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_com_kpis" ON comercial_kpis
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_com_estrat" ON comercial_estrategias
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_atend_satisf" ON atendimento_satisfacao
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_atend_reclam" ON atendimento_reclamacoes
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_atend_elogios" ON atendimento_elogios
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "acesso_atend_planos" ON atendimento_planos_acao
    FOR ALL USING (auth.role() = 'authenticated');


-- ============================================================================
-- FIM DO SCRIPT DE MIGRAÇÃO v2.0.0
-- ============================================================================
-- Próximos passos:
--   1. Execute este script no SQL Editor do Supabase
--   2. Configure .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
--   3. Substitua as chamadas localStorage por consultas Supabase
-- ============================================================================
