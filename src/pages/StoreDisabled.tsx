import React from 'react';
import { ShieldAlert, MessageCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WhatsappIcon } from '@/components/icons/WhatsappIcon';

const StoreDisabled = () => {
  const supportNumber = "75981284738";
  const whatsappUrl = `https://wa.me/55${supportNumber}?text=Olá,%20minha%20loja%20está%20desativada%20e%20gostaria%20de%20reativá-la.`;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#0a0a0a]">
      {/* Background Effects (Following the site aesthetics) */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl p-8 md:p-12 rounded-[40px] text-center shadow-2xl relative">
          {/* Neon Glow around the card */}
          <div className="absolute -inset-[1px] bg-gradient-to-br from-primary/30 to-secondary/30 rounded-[40px] -z-10 opacity-50"></div>
          
          <div className="mb-8 relative">
            <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <ShieldAlert className="w-12 h-12" />
            </div>
          </div>

          <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none mb-4">
            LOJA <span className="text-red-500">DESATIVADA</span>
          </h1>

          <p className="text-zinc-400 text-sm font-medium leading-relaxed mb-8">
            A plataforma para este endereço está temporariamente inativa. Se precisar reativá-la entre em contato com o nosso suporte. 
            <span className="block mt-2 font-bold text-zinc-300">Respondemos em até 24h.</span>
          </p>

          <div className="space-y-4">
            <Button 
              asChild 
              className="w-full h-14 bg-[#25D366] hover:bg-[#128C7E] text-white font-black text-lg shadow-xl shadow-green-500/10 gap-3 group transition-all"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsappIcon className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                FALAR COM SUPORTE
              </a>
            </Button>

            <Button 
                variant="ghost" 
                onClick={() => window.history.back()}
                className="w-full text-zinc-500 hover:text-white gap-2"
            >
                <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </div>
        </div>

        <div className="mt-8 text-center">
            <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-[0.2em]">
                Sistema de Gestão Lojit — Protocolo de Segurança Ativo
            </p>
        </div>
      </div>
    </div>
  );
};

export default StoreDisabled;
