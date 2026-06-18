import { supabase } from "../database/supabaseClient";

export const MODULE_NAMES = {
  REGULAMENTACAO: "regulamentacao",
  MANUTENCAO: "manutencao",
  FINANCEIRO: "financeiro",
  ESTRATEGIA: "estrategia",
  ATENDIMENTO: "atendimento",
  CONFIGURACOES: "configuracoes",
  LUBRIFICACAO: "lubrificacao",
  PONTO: "ponto",
} as const;

export async function loadModuleData<T>(moduleName: string, periodKey: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("modulos_dados")
    .select("dados")
    .eq("modulo", moduleName)
    .eq("periodo", periodKey)
    .maybeSingle();
  if (error) { console.error("loadModuleData", error); return null; }
  return data ? (data.dados as T) : null;
}

export async function loadAllModuleData<T>(moduleName: string): Promise<Record<string, T>> {
  const { data, error } = await supabase
    .from("modulos_dados")
    .select("periodo, dados")
    .eq("modulo", moduleName);
  if (error) { console.error("loadAllModuleData", error); return {}; }
  const result: Record<string, T> = {};
  for (const row of data ?? []) result[row.periodo] = row.dados as T;
  return result;
}

export async function saveModuleData<T>(moduleName: string, periodKey: string, data: T): Promise<void> {
  const { error } = await supabase
    .from("modulos_dados")
    .upsert({ modulo: moduleName, periodo: periodKey, dados: data, updated_at: new Date().toISOString() },
             { onConflict: "modulo,periodo" });
  if (error) console.error("saveModuleData", error);
}

export async function saveAllModuleData<T>(moduleName: string, allData: Record<string, T>): Promise<void> {
  const rows = Object.entries(allData).map(([periodo, dados]) => ({
    modulo: moduleName,
    periodo,
    dados,
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return;
  const { error } = await supabase
    .from("modulos_dados")
    .upsert(rows, { onConflict: "modulo,periodo" });
  if (error) console.error("saveAllModuleData", error);
}

export async function loadSimpleData<T>(moduleName: string, key = "default", defaultValue?: T): Promise<T | null> {
  const result = await loadModuleData<T>(moduleName, key);
  if (result === null && defaultValue !== undefined) return defaultValue;
  return result;
}

export async function uploadFile(bucket: string, path: string, file: File): Promise<string | null> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) { console.error("uploadFile", error); return null; }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
