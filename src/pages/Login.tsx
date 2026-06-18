import { useState } from "react";
import { Fuel, Lock, Mail, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await onLogin(email, password);
    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "Email ou senha incorretos."
          : error.message.includes("Email not confirmed")
          ? "Confirme seu email antes de entrar."
          : error.message
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#10131a] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <span className="font-extrabold text-[22px] text-white tracking-[-0.5px]">FuelOps</span>
          <span className="font-semibold text-[22px] text-[#00a572] tracking-[-0.5px]">Pro</span>
        </div>

        {/* Card */}
        <div className="bg-[#171717] border border-[#262a31] rounded-xl p-8">
          <h1 className="text-[16px] font-semibold text-white mb-1">Entrar no sistema</h1>
          <p className="text-[12px] text-[#6b7280] mb-6">Acesse com sua conta autorizada</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-[0.06em]">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="w-full bg-[#1d2027] border border-[#262a31] rounded-lg pl-9 pr-4 py-2.5 text-[13px] text-white placeholder-[#4b5563] focus:outline-none focus:border-[#00a572] transition-colors"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-[0.06em]">Senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-[#1d2027] border border-[#262a31] rounded-lg pl-9 pr-10 py-2.5 text-[13px] text-white placeholder-[#4b5563] focus:outline-none focus:border-[#00a572] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#9ca3af] transition-colors"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-center gap-2 bg-[rgba(239,68,68,.1)] border border-[rgba(239,68,68,.2)] rounded-lg px-3 py-2.5">
                <AlertCircle size={13} className="text-[#f87171] shrink-0" />
                <span className="text-[12px] text-[#f87171]">{error}</span>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00a572] hover:bg-[#009065] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[13px] rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors mt-1"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Fuel size={14} />}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#4b5563] mt-5">
          FuelOps Pro · Sistema de Gestão de Postos
        </p>
      </div>
    </div>
  );
}
