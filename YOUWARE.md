# FuelOps Pro - Sistema de Gestão de Postos de Combustível

## Visão Geral
Sistema completo para gestão de operações e estoque de postos de combustível, construído com React 18, TypeScript, Vite e Tailwind CSS.

## Estrutura de Abas (Tabs)
| Aba | Componente | Descrição |
|-----|-----------|-----------|
| **Gestão de Operações** | `GestaoOperacoes.tsx` | Controle completo de operações: bicos, abastecimentos, vendas, LMC, pedidos, auditorias. Renderiza via iframe (`gestao-operacoes.html`). |
| **Controle de Estoque** | `ControleEstoque.tsx` | Gestão de estoque com upload CSV, cálculos de resultado/vendas/perdas, painel de aferições, pedidos a fornecedores, gráfico de impacto. |
| **Financeiro** | `Financeiro.tsx` | Lançamentos manuais financeiros: Caixas (com alerta de cancelamentos vs média histórica 12 meses), Notas a Prazo, Cheques, Descontos/Autorizações, Margens e Custos Operacionais. Validação BR (parseBR/fmtBR), cores condicionais (verde/vermelho), alerta visual vermelho quando cancelamentos >15% acima da média. |
| **Gestão de Equipe** | `GestaoEquipe.tsx` | Aba "Ponto": leitura automática de planilha Excel (upload com drag & drop). Parsing de Turno 1/2 (Frentistas + Caixas), Noite e Outros Colaboradores (Gerentes, Limpeza, Segurança, Troca de Óleo, Segurança Dia), Classificação de Vendas Caixas com cálculo automático de participação %. Persistência por data no localStorage (`fuelops_ponto_data`). Interface 100% read-only. |
| **Regulamentação** | `Regulamentacao.tsx` | Central de Conformidade e Fiscalização para posto de combustíveis. Dashboard de indicadores, grid de 12 órgãos fiscalizadores (IPEM, ANP, CB, Prefeitura, PRF, PMR, SEMA, IBAMA, CREA, VISA, MT, Concessionária), painel lateral (drawer) com tabela de documentos, versionamento, histórico, matriz de conformidade/checklist obrigatório, upload com drag & drop, persistência no localStorage (`dadosRegulamentacao`), download de Pasta de Fiscalização (ZIP via JSZip). Base temporal: Junho 2026. |
| **Estratégia de Vendas** | `EstrategiaVendas.tsx` | Central de Estratégia Comercial e Gestão de KPIs. Dashboard de 8 indicadores com progresso visual, Funil Comercial visual (5 etapas com cálculos de eficiência em tempo real), Planos de Ação dinâmicos (CRUD completo com prioridades coloridas), persistência por período no localStorage (`dadosEstrategia`). Seletor de data sincronizado com navegação de anos. |
| **Manutenção** | `Manutencao.tsx` | Central de Controle de Manutenção e Custos Operacionais. Dashboard de indicadores com semáforo visual, Controle de Bombas/Bicos com histórico, Registro de Manutenções (Corretivas/Preventivas), Controle do Gerador (horímetro, consumo), Gastos com Limpeza, Teto Orçamentário, exportação de relatórios. Persistência no localStorage (`dadosManutencao`) indexada por ano/mês. |
| **Atendimento ao Cliente** | `AtendimentoCliente.tsx` | Central de Experiência do Cliente (CX) e Gestão de Qualidade. Dashboard de 7 indicadores (NPS Google, Nota Google, Índice Totem, Índice Presencial, Reclamações, Taxa de Resolução, Satisfação Geral) com semáforo visual, Painel de Alertas Automáticos (quedas, pendências, atrasos), Módulo Google (nota, avaliações, NPS, mini-indicadores de evolução), Módulo Totem (avaliações, negativas, barra de distribuição), Módulo Presencial (reclamações externas + tabela CRUD), Sugestões de Melhoria (CRUD com origem/status), Planos de Ação (CRUD com prioridade/status). Persistência no localStorage (`dadosAtendimento`) indexada por ano/mês. |
| **Configurações** | `Configuracoes.tsx` | Central de Governança do Sistema. Menu principal com 2 cards clicáveis (Parâmetros do Sistema, Central de Arquivos). Parâmetros: formulário corporativo (Nome, CNPJ, Endereço, Telefone, E-mail) com botão Salvar + notificação toast. Central de Arquivos: dashboard com 3 mini-cards métricos (Total, Espaço Utilizado, Enviados no Mês), tabela global de arquivos com busca/filtro por módulo, ações por linha (Download, Ver Origem, Excluir), modal de exclusão segura com confirmação crítica, painel de arquivos órfãos/duplicados com limpeza em lote. Persistência no localStorage (`dadosConfiguracoes`). |
| **Troca de Óleo e Lubrificação** | `TrocaOleoLubrificacao.tsx` | Central de Lubrificação e Pós-Venda Automotiva. Dashboard de 8 indicadores (Lubrificações, Trocas, Receita Serviços, Receita Produtos, Custo Insumos, Lucro Bruto, Consumo Graxa, Ticket Médio), Controle de Tambores de Graxa (cadastro, cálculo custo/kg, barra de nível com semáforo), Registro Rápido de Serviços com 12 tipos (Lubrificações e Trocas de Óleo), Insumos vinculados (Graxa, Filtros, Lubrificantes), Resultado Financeiro Individual, DRE Mensal consolidada. Persistência no localStorage (`dadosLubrificacao`) indexada por ano/mês. |

## Checkpoints / Versões

### v9.0-supabase-complete (2026-06-17)
- **Status:** ✅ Migração Completa localStorage → Supabase
- **Descrição:** Migração definitiva de todos os 8 módulos do FuelOps Pro do localStorage para Supabase PostgreSQL. Persistência via tabela `module_data` (JSONB) com fallback localStorage para modo offline. Build de produção sem erros.
- **Arquivos criados:**
  - `src/services/supabasePersistence.ts` — Camada de persistência abstrata com load/save genéricos, upload de arquivos, e migração localStorage→Supabase
  - `.env` — Variáveis de ambiente (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- **Tabelas criadas no Supabase:**
  - `module_data` — Persistência genérica JSONB por módulo/período (substitui localStorage)
  - `usuarios` — Usuários do sistema
  - `parametros_sistema` — Dados cadastrais do posto
  - `arquivos` — Central global de metadados de arquivos
  - RLS policies permissivas para desenvolvimento (anon access)
- **Módulos migrados (8):**
  1. Regulamentacao.tsx → `regulamentacao`
  2. Manutencao.tsx → `manutencao`
  3. Financeiro.tsx → `financeiro`
  4. EstrategiaVendas.tsx → `estrategia`
  5. AtendimentoCliente.tsx → `atendimento`
  6. Configuracoes.tsx → `configuracoes` (empresa params)
  7. TrocaOleoLubrificacao.tsx → `lubrificacao`
  8. GestaoEquipe.tsx → `ponto`
- **Padrão de migração:** Cada módulo usa `loadAllModuleData()` no mount (useEffect) e `saveAllModuleData()` no auto-save, com `loaded` flag para evitar sobrescrita no boot. Fallback localStorage mantido para resiliência offline.
- **Próximos passos:** Habilitar Supabase Auth, restringir RLS policies, configurar Supabase Storage para uploads de arquivo

### v8.1-supabase-migration (2026-06-16)
- **Status:** ✅ Infraestrutura de Migração para Supabase
- **Descrição:** Criação do script SQL completo de migração e do cliente Supabase para conectar o FuelOps Pro ao banco de dados PostgreSQL, substituindo a persistência local (localStorage).
- **Arquivos criados:**
  - `src/database/supabase_migration.sql` — Script SQL completo com 18 tabelas, triggers, índices e políticas RLS
  - `src/database/supabaseClient.ts` — Cliente Supabase inicializado + Types TypeScript completos para todas as tabelas
  - `.env.example` — Template de variáveis de ambiente para o Supabase
- **Tabelas criadas (18):** usuarios, parametros_sistema, arquivos, regulamentacao_documentos, regulamentacao_historico, manutencao_bombas, manutencao_bicos, manutencao_registros, manutencao_preventivas, controle_gerador, gastos_limpeza, teto_orcamentario, comercial_kpis, comercial_estrategias, atendimento_satisfacao, atendimento_reclamacoes, atendimento_elogios, atendimento_planos_acao
- **Dependência adicionada:** @supabase/supabase-js v2.108.2
- **Próximos passos:** Executar o SQL no Supabase SQL Editor, criar arquivo .env, e migrar as chamadas localStorage dos módulos para consultas Supabase

### v8.0-lubrificacao (2026-06-16)
- **Status:** ✅ Aba Troca de Óleo e Lubrificação — Central de Lubrificação e Pós-Venda Automotiva
- **Descrição:** Implementação completa da aba "Troca de Óleo e Lubrificação" como Central de Lubrificação e Pós-Venda Automotiva para o FuelOps Pro. Interface dark theme seguindo padrão visual do projeto.
- **Funcionalidades:**
  - Seletor de data (Mês/Ano) sincronizado com navegação de anos (◀ Anterior / Próximo ▶)
  - Dashboard de 8 indicadores: Lubrificações, Trocas de Óleo, Receita Serviços, Receita Produtos, Custo Insumos, Lucro Bruto, Consumo Graxa, Ticket Médio
  - Destaques Gerenciais: Serviço Mais Vendido, Produto Mais Vendido, Consumo Médio de Graxa
  - Controle de Tambor (Graxa): cadastro com Nome, Marca, Peso Total, Valor, Quantidade Atual
  - Cálculo automático de Valor por Kg e indicador visual de nível (barra de progresso: 🟢 >50%, 🟡 20-50%, 🔴 <20%)
  - Registro Rápido de Serviços: formulário com Data, Veículo, Placa, Funcionário, Tipo (12 opções dropdown), Valor, Observações
  - Insumos vinculados por serviço: Graxa (kg + cálculo automático de custo), Filtros (tipo, qtd, custo, venda), Lubrificantes (produto, qtd, custo, venda)
  - Resultado Financeiro Individual por serviço: Lucro Bruto = (Receita + Venda Produtos) - (Custo Graxa + Custo Produtos)
  - Fechamento/DRE Mensal: tabela consolidada com todos os indicadores financeiros e margem %
  - Persistência completa no localStorage (`dadosLubrificacao[ano][mes]`) indexada por período
  - Auto-save a cada alteração de dados
  - IDs estáveis via `crypto.randomUUID()` para prevenir bugs de foco do cursor
- **Interface:** Dark theme (`#12141c` fundo, `#1d2027` cards, `#262a31` bordas, `#00a572` acentos verdes)

### v7.0-configuracoes (2026-06-16)
- **Status:** ✅ Aba Configurações — Central de Governança do Sistema
- **Descrição:** Implementação completa da aba "Configurações" como Central de Governança do Sistema para o FuelOps Pro. Interface dark theme seguindo padrão visual do projeto.
- **Funcionalidades:**
  - Menu principal com 2 cards clicáveis em destaque (Parâmetros do Sistema, Central de Arquivos)
  - Navegação interna sem redirecionamento de URL (drawer/inline)
  - Seletor de data (Mês/Ano) sincronizado com navegação de anos
  - Parâmetros do Sistema: Formulário corporativo (Nome, CNPJ, Endereço, Telefone, E-mail, Cidade, Estado)
  - Botão "Salvar Configurações" com notificação toast temporária
  - Central de Arquivos: Dashboard com 3 mini-cards métricos (Total de Arquivos, Espaço Utilizado, Enviados no Mês)
  - Tabela Global de Arquivos: lista unificada de anexos de todas as abas (Regulamentação, Manutenção, Estratégia Comercial, Atendimento ao Cliente)
  - Colunas: Nome, Módulo de Origem (badge colorido), Registro Relacionado, Data Upload, Tamanho, Ações
  - Ações por linha: Download (simulado), Ver Origem (alert), Excluir (modal de confirmação)
  - Modal de Exclusão Segura: confirmação crítica com fundo escuro, bordas vermelhas, exibição de nome/módulo/registro
  - Painel de Arquivos Órfãos/Duplicados: detecção automatizada + botão "Exclusão Rápida / Limpar Cache"
  - Filtros: busca por texto + filtro por módulo de origem
  - Persistência completa no localStorage (`dadosConfiguracoes`)
  - IDs estáveis via `crypto.randomUUID()` para prevenir bugs de foco do cursor
- **Interface:** Dark theme (`#12141c` fundo, `#1d2027` cards, `#262a31` bordas, `#00a572` acentos verdes)

### v6.0-atendimento (2026-06-16)
- **Status:** ✅ Aba Atendimento ao Cliente — Central de Experiência do Cliente (CX) e Gestão de Qualidade
- **Descrição:** Implementação completa da aba "Atendimento ao Cliente" como Central de Experiência do Cliente (CX) e Gestão de Qualidade para o FuelOps Pro. Interface dark theme seguindo padrão visual do projeto.
- **Funcionalidades:**
  - Seletor de data (Mês/Ano) sincronizado com navegação de anos (◀ Anterior / Próximo ▶)
  - Dashboard de Indicadores: 7 cards (NPS Google, Nota Google, Índice Totem, Índice Presencial, Reclamações, Taxa de Resolução, Satisfação Geral)
  - Semáforo visual: 🟢 Excelente/Normal, 🟡 Atenção, 🔴 Crítico para todos os indicadores
  - Classificação automática do NPS (Excelente, Muito Bom, Bom, Regular, Crítico)
  - Comparativo com mês anterior via setas ▲/▼ e variação percentual
  - Painel de Alertas Automáticos: quedas de NPS, reclamações pendentes/em atraso, queda no Totem, queda na nota Google, planos atrasados
  - Módulo Google: inputs de Nota Média, Total de Avaliações, Negativas, NPS com mini-indicadores de evolução
  - Módulo Totem: inputs de Avaliações e Negativas com barra de distribuição visual (positivas vs negativas)
  - Módulo Presencial: registro de reclamações externas + botão para CRUD de reclamações na pista
  - Tabela de Reclamações: Data, Cliente, Avaliação (Select), Comentário, Responsável, Status (Select) com busca e filtros
  - Sugestões de Melhoria: CRUD completo com origem (Google/Totem/Presencial/Interna) e status
  - Planos de Ação: CRUD completo com título, descrição, responsável, prazo, prioridade e status
  - Índice de Satisfação Presencial calculado por pesos das avaliações (5-1 escala)
  - Taxa de Resolução calculada automaticamente (Resolvidas / Total)
  - Índice de Satisfação Geral composto (média de NPS normalizado + Google + Totem + Presencial)
  - Persistência completa no localStorage (`dadosAtendimento[ano][mes]`) indexada por período
  - Auto-save a cada alteração de dados
  - IDs estáveis via `crypto.randomUUID()` para prevenir bugs de foco do cursor
  - Todas as tabelas dinâmicas usam chaves estáveis como key
- **Interface:** Dark theme (`#12141c` fundo, `#1d2027` cards, `#262a31` bordas, `#00a572` acentos verdes)

### v5.0-manutencao (2026-06-15)
- **Status:** ✅ Aba Manutenção — Central de Controle de Manutenção e Custos Operacionais
- **Descrição:** Implementação completa da aba "Manutenção" como Central de Controle de Manutenção e Custos Operacionais para o FuelOps Pro. Interface dark theme seguindo padrão visual do projeto.
- **Funcionalidades:**
  - Seletor de data (Mês/Ano) sincronizado com navegação de anos (◀ Anterior / Próximo ▶)
  - Dashboard de Indicadores: 5 cards (Manutenções, Equipamentos em Manutenção, Gasto Total, Gerador, Teto Orçamentário)
  - Semáforo visual: 🟢 Normal, 🟡 Atenção, 🔴 Crítico para todos os indicadores
  - Teto Orçamentário com cálculo reativo: Gasto, Saldo, % Utilização com barra de progresso
  - Controle de Bombas e Bicos: CRUD completo com status (Operando, Em manutenção, Interditada/Substituído)
  - Histórico Rápido: Modal interno com ocorrências, última manutenção e custo acumulado por equipamento
  - Registro de Manutenções: Tabs Corretivas/Preventivas com formulário completo (Data, Hora, Equipamento, Tipo, Descrição, Responsável, Peça, Mão de Obra, Cálculo Automático do Total)
  - Seção Preventivas: Programação com status (Programada, Em andamento, Concluída, Atrasada) e alertas automáticos
  - Controle do Gerador: Horímetro Inicial/Final, Litros, Cálculo Automático (Horas Trabalhadas, Consumo L/h)
  - Métricas consolidadas do gerador: Horas totais, Litros, Média geral, Último abastecimento
  - Gastos com Limpeza: Select de produtos, quantidade, valor, indicadores acumulados (Mês, Ano, Produto mais consumido)
  - Filtros e Relatórios: Busca, filtros por Equipamento/Tipo/Status, exportação de relatório em TXT
  - Persistência completa no localStorage (`dadosManutencao[ano][mes]`) indexada por período
  - Auto-save a cada alteração de dados
  - IDs estáveis via `crypto.randomUUID()` para prevenir bugs de foco do cursor
- **Interface:** Dark theme (`#12141c` fundo, `#1d2027` cards, `#262a31` bordas, `#00a572` acentos verdes)

### v4.0-estrategia (2026-06-15)
- **Status:** ✅ Aba Estratégia de Vendas — Central de Estratégia Comercial e Gestão de KPIs
- **Descrição:** Implementação completa da aba "Estratégia de Vendas" como Central de Estratégia Comercial e Gestão de KPIs para o FuelOps Pro. Interface dark theme seguindo padrão visual do projeto.
- **Funcionalidades:**
  - Seletor de data (Mês/Ano) sincronizado com navegação de anos (◀ Anterior / Próximo ▶)
  - Dashboard Comercial: Grid de 8 cards KPI (Leads Captados, Propostas Enviadas, Novos Clientes, Atividades de Onboarding, Taxa de Conversão %, Taxa de Retenção %, Comissão Prevista, Comissão Realizada)
  - Cada KPI: Resultado Atual, Meta, % Atingido com barra de progresso visual, Comparativo Mês Anterior
  - Taxa de Conversão (%) calculada automaticamente (Novos Clientes / Leads × 100)
  - Funil Comercial Visual (5 etapas decrescentes): Prospecção, Propostas, Negociações (3 inputs), Fechamentos, Onboarding & Retenção
  - Metas sugeridas por etapa (dropdown com valores pré-definidos)
  - Painel lateral de Eficiência com 4 indicadores de conversão entre etapas
  - Área de Estratégias Comerciais: CRUD dinâmico com campos: Nome, Objetivo, Descrição, Data Início/Término, Prioridade (Baixa/Média/Alta/Crítica com cores), Resultado Esperado/Obtido, Observações
  - Botão "+ Adicionar Estratégia" e exclusão com ícone de lixeira
  - Persistência completa no localStorage (`dadosEstrategia[ano][mes]`) indexada por período
  - Auto-save a cada alteração de dados
  - IDs estáveis via `crypto.randomUUID()` para prevenir bugs de foco do cursor
- **Interface:** Dark theme (`#12141c` fundo, `#1d2027` cards, `#262a31` bordas, `#00a572` acentos verdes)

### v3.0-regulamentacao (2026-06-15)
- **Status:** ✅ Aba Regulamentação — Central de Conformidade e Fiscalização
- **Descrição:** Implementação completa da aba "Regulamentação" como Central de Conformidade e Fiscalização para o posto de combustíveis. Interface dark theme seguindo padrão visual do FuelOps Pro.
- **Dependência:** `jszip` (3.10.1) para geração de ZIP na Pasta de Fiscalização.
- **Funcionalidades:**
  - Dashboard de Indicadores: 5 cards (Total, Válidos, Vencendo, Vencidos, % Conformidade)
  - Filtros rápidos por Status com cores (Verde/Amarelo/Vermelho/Cinza)
  - Grid de 12 Órgãos Fiscalizadores (IPEM, ANP, CB, Prefeitura, PRF, PMR, SEMA, IBAMA, CREA, VISA, MT, Concessionária)
  - Painel Lateral (Drawer) com tabela de documentos, busca e ações
  - Matriz de Conformidade com Checklist Obrigatório por órgão
  - Upload de documentos com Drag & Drop (PDF, PNG, JPG)
  - Versionamento de documentos (empilhamento de versões)
  - Histórico inalterável com Data/Hora/Ação
  - Cálculo reativo de Status (Válido/Vencendo/Vencido/Pendente) baseado em Junho 2026
  - Download de Pasta de Fiscalização (ZIP) via JSZip
  - Persistência completa no localStorage (`dadosRegulamentacao`)
  - Modal de detalhes do documento com metadados
  - Modais de versões e histórico com timeline visual
  - Fechamento via Escape e backdrop click

### v2.0-ponto (2026-06-10)
- **Status:** ✅ Aba Ponto (Gestão de Equipe) — Leitura Automática de Documentos
- **Descrição:** Refatoração completa da aba "Gestão de Equipe" para operar exclusivamente via upload de planilha Excel. Removido todo o lançamento manual de dados. Interface 100% read-only.
- **Dependência:** `xlsx` (SheetJS 0.18.5) para parsing de planilhas no cliente.
- **Funcionalidades:**
  - Upload de planilha com drag & drop (DropZone)
  - Nome do arquivo `FECHAMENTO Gestão de Equipe MM-AA.xlsx` define mês/ano
  - Parsing completo: Turno 1/2 (Frentistas + Caixas), staff categorizado (Gerentes, Limpeza, Segurança, Troca de Óleo, Segurança Dia), Vendas Frentistas (Diesel/Gasolina), Vendas Noite, Classificação de Vendas Caixas
  - Conversão automática de valores Excel (frações de tempo, serial dates)
  - Cálculo automático de PARTICIPAÇÃO (%) por operadora
  - Persistência por período no localStorage (`fuelops_ponto_data`)
  - Seletor de data (Mês/Ano) com navegação de anos — exibe badge ✓ quando período tem dados
  - Botão para remover dados do período
  - IDs estáveis via `crypto.randomUUID()`
- **Interface:** Dark theme, tabelas read-only, grid 2 colunas para turnos, cards agrupados por categoria

### v1.2-equipe (2026-06-09)
- **Tag Git:** `v1.2-equipe`
- **Status:** ✅ Aba Gestão de Equipe completa e funcional
- **Descrição:** Nova aba "Gestão de Equipe" com escalas de turnos e férias (Turno 1, Turno 2, Noite e Outros), classificação de vendas por operadoras com cálculo automático de participação, persistência por data no localStorage, seletor de mês/ano sincronizado.
- **Funcionalidades:**
  - Seletor de data (Mês/Ano) com navegação de anos (Anterior/Próximo)
  - 3 tabelas de turnos com lançamento manual de colaboradores (horários, nome, líder, férias, demissão)
  - Tabela de classificação de vendas com cálculo automático de participação %
  - Persistência por período no localStorage (`fuelops_equipe_data`)
  - IDs estáveis via `crypto.randomUUID()` para evitar bugs de foco

> Para voltar a esta versão: `git checkout v1.2-equipe`

### v1.1-financeiro (2026-06-08)
- **Tag Git:** `v1.1-financeiro`
- **Commit:** `8ee2533`
- **Status:** ✅ Aba Financeiro completa e funcional
- **Descrição:** Todas as funcionalidades da aba Financeiro implementadas: Caixas (com alerta de cancelamentos vs média histórica 12 meses), Notas a Prazo, Cheques, Descontos/Autorizações, Margens e Custos Operacionais. Correção do dropdown do seletor de meses centralizado para evitar corte na navegação de ano.
- **Funcionalidades:**
  - Lançamentos manuais financeiros completos
  - Validação BR (parseBR/fmtBR) para valores monetários
  - Cores condicionais (verde/vermelho) para valores positivos/negativos
  - Alerta visual vermelho quando cancelamentos >15% acima da média
  - Seletor de meses com navegação de ano centralizado

> Para voltar a esta versão: `git checkout v1.1-financeiro`

### v1.0-baseline (2026-06-08)
- **Tag Git:** `v1.0-baseline`
- **Commit:** `59515ee`
- **Status:** ✅ Baseline estable - todas as abas funcionando perfeitamente
- **Descrição:** Versão estável com Gestão de Operações e Controle de Estoque. Ponto de retorno seguro.

> Para voltar a esta versão: `git checkout v1.0-baseline`

## Stack Técnico
- **Framework:** React 18 + TypeScript
- **Build:** Vite 7.x
- **Estilo:** Tailwind CSS 3.x
- **Ícones:** Lucide React
- **Estado:** React hooks (useState, useCallback, useMemo)
- **Idioma:** Português Brasileiro (pt-BR)

## Convenções
- Componentes em `src/pages/` são responsáveis por cada aba
- O App.tsx controla a navegação por tabs via estado local
- Interface dark theme com paleta (#10131a bg, #00a572 accent)
- Formatação numérica pt-BR com separadores brasileiros
- CSV delimiter padrão: `;` (ponto e vírgula)
- Validação financeira: `parseBR()` para parse "37.997,84" → 37997.84, `fmtBR()` para formatação
- Cores condicionais: `text-[#4edea3]` (verde, >=0), `text-[#f87171]` (vermelho, <0)
- Componente `BRInput` reutilizável para entrada de valores monetários
