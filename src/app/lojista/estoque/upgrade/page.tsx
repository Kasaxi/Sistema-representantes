"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, BarChart3, PackageCheck, AlertCircle, CreditCard, Smartphone, Check, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [opticId, setOpticId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const status = searchParams.get("status");

  useEffect(() => {
    async function getOpticId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("cnpj")
        .eq("id", user.id)
        .single();

      if (profile?.cnpj) {
        const { data: optic } = await supabase
          .from("optics")
          .select("id")
          .eq("cnpj", profile.cnpj)
          .single();

        if (optic) {
          setOpticId(optic.id);
        }
      }
    }

    getOpticId();
  }, [router, supabase]);

  useEffect(() => {
    if (status === "completed") {
      toast.success("Pagamento aprovado! Plano Pro ativado.", {
        description: "Você agora tem acesso completo ao módulo de estoque.",
      });
      router.replace("/lojista/estoque");
    } else if (status === "cancelled") {
      toast.info("Pagamento cancelado. Tente novamente quando quiser.");
    }
  }, [status, router]);

  const handleCheckout = async (method: "CARD" | "PIX") => {
    if (!opticId) {
      toast.error("Erro ao identificar sua loja. Tente novamente.");
      return;
    }

    setLoading(method);

    try {
      const response = await fetch("/api/checkout/abacatepay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          optic_id: opticId,
          method,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        setLoading(null);
        return;
      }

      if (method === "CARD") {
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        setCheckoutUrl(data.url);
        setShowPixModal(true);
        setLoading(null);
      }
    } catch (error) {
      console.error("Erro ao criar checkout:", error);
      toast.error("Erro ao processar pagamento. Tente novamente.");
      setLoading(null);
    }
  };

  const whatsappNumber = "5511999999999";
  const message = encodeURIComponent("Olá! Vi a ferramenta de Gestão de Estoque no sistema e gostaria de entender como posso implanti na minha ótica.");

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const planPrice = 3970;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Banner Section */}
        <div className="bg-gradient-to-br from-[#0066FF] to-blue-800 px-8 py-16 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-md mb-6 shadow-xl">
              <Lock className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
              Desbloqueie o Poder do seu Estoque
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto font-medium">
              Pare de perder vendas por falta de controle. Nossa Inteligência de Gestão foi desenhada exclusivamente para quem quer escalar.
            </p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="px-8 py-12 bg-gray-50/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 text-[#0066FF]">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Visão Estratégica</h3>
              <p className="text-gray-500 text-sm">Dashboard completo com giro de estoque, markup médio e distribuição por marcas.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 text-emerald-600">
                <PackageCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Controle Automático</h3>
              <p className="text-gray-500 text-sm">O estoque dá baixa automaticamente a cada venda aprovada pelo sistema.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100/50 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Prevenção de Furtos</h3>
              <p className="text-gray-500 text-sm">Auditoria completa de entradas e saídas e alertas de nível mínimo para nunca faltar peça.</p>
            </div>
          </div>
        </div>

        {/* Plan Section */}
        <div className="px-8 py-12 border-t border-gray-100 bg-white">
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border-2 border-emerald-200">
              <div className="text-center mb-6">
                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-full mb-3">
                  Plano Pro
                </span>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900">{formatPrice(planPrice)}</span>
                  <span className="text-gray-500">/mês</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {[
                  "Controle total de estoque",
                  "Dashboard com métricas",
                  "Alertas de reposição",
                  "Histórico de movimentações",
                  "Suporte prioritário",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-700">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3">
                <button
                  onClick={() => handleCheckout("PIX")}
                  disabled={loading !== null}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl transition-colors"
                >
                  {loading === "PIX" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Smartphone className="w-5 h-5" />
                      Pagar com PIX
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleCheckout("CARD")}
                  disabled={loading !== null}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#0066FF] hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition-colors"
                >
                  {loading === "CARD" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pagar com Cartão
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 mt-4">
                Pagamento seguro via AbacatePay
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm mb-4">
              Prefere falar com um representante?
            </p>
            <a 
              href={`https://wa.me/${whatsappNumber}?text=${message}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Falar com representante
            </a>
          </div>
          
          <div className="mt-8 text-sm text-gray-400 font-medium text-center">
            <Link href="/dashboard" className="hover:text-gray-600 transition-colors">Voltar para visão geral</Link>
          </div>
        </div>

      </div>

      {/* PIX Modal */}
      {showPixModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Pagamento PIX
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Escaneie o QR Code ou copie o código para pagar
              </p>
              
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors"
                >
                  Abrir página de pagamento
                </a>
              )}
              
              <button
                onClick={() => {
                  setShowPixModal(false);
                  router.push("/lojista/estoque");
                }}
                className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Continuar depois
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
      </div>
    }>
      <UpgradeContent />
    </Suspense>
  );
}
