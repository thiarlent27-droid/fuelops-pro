
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

function loadAllFromLocalStorage<T>(moduleName: string): Record<string, T> {
  const result: Record<string, T> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(moduleName + "_")) {
      const periodKey = key.substring(moduleName.length + 1);
      const raw = localStorage.getItem(key);
      if (raw) result[periodKey] = JSON.parse(raw);
    }
  }
  return result;
}

export async function loadModuleData<T>(moduleName:string, periodKey:string):Promise<T|null>{
  const raw=localStorage.getItem(`${moduleName}_${periodKey}`);
  return raw ? JSON.parse(raw) : null;
}
export async function loadAllModuleData<T>(moduleName:string):Promise<Record<string,T>>{
  return loadAllFromLocalStorage<T>(moduleName);
}
export async function saveModuleData<T>(moduleName:string, periodKey:string, data:T):Promise<void>{
  localStorage.setItem(`${moduleName}_${periodKey}`, JSON.stringify(data));
}
export async function saveAllModuleData<T>(moduleName:string, allData:Record<string,T>):Promise<void>{
  Object.entries(allData).forEach(([k,v])=>localStorage.setItem(`${moduleName}_${k}`, JSON.stringify(v)));
}
export async function loadSimpleData<T>(moduleName: string): Promise<T | null> {
  const raw = localStorage.getItem(moduleName);
  return raw ? JSON.parse(raw) : null;
}

export async function saveSimpleData<T>(moduleName: string, data: T): Promise<void> {
  localStorage.setItem(moduleName, JSON.stringify(data));
}