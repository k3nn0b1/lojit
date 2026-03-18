import { MapPin, Instagram, Phone, Clock } from "lucide-react";
import { WhatsappIcon } from "./icons/WhatsappIcon";
import { YoutubeIcon } from "./icons/YoutubeIcon";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";

interface FooterProps {
  minimal?: boolean;
}

const Footer = ({ minimal = false }: FooterProps) => {
  const { settings } = useStoreSettings();
  const storeName = settings?.store_name || "";
  const address = settings?.address || "";
  const whatsapp = settings?.whatsapp || "";
  const youtube = settings?.youtube_url || "";
  const footerInfo = (settings?.footer_info || "") 
    ? settings.footer_info.replace("lojit Store", storeName) 
    : storeName ? `© ${new Date().getFullYear()} ${storeName}. Todos os direitos reservados.` : `© ${new Date().getFullYear()} lojit. Todos os direitos reservados.`;

  // Flags de visibilidade (default para true se não existirem nas configurações antigas)
  const showInsta = settings?.show_instagram !== false;
  const showWhats = settings?.show_whatsapp !== false;
  const showYoutube = settings?.show_youtube === true;

  return (

    <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm mt-auto w-full">
      <div className="container mx-auto px-4 py-8">
        {minimal ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-2xl font-black tracking-tighter uppercase italic text-primary">Painel Master</h2>
            <div className="space-y-1 opacity-80 hover:opacity-100 transition-opacity">
              <p className="text-xs font-medium text-foreground tracking-widest uppercase">© 2026 Painel Master. Todos os direitos reservados.</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                Desenvolvemos soluções personalizadas pra empresas. Contato: {" "}
                <a 
                  href="https://wa.me/5575981284738" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                   75 98128-4738
                </a>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Brand */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {settings?.logo_url ? (
                    <img src={settings.logo_url} alt={storeName} className="h-12 sm:h-14 md:h-16 w-auto object-contain" />
                  ) : (
                    <span className="font-display text-xl text-primary font-bold">{storeName}</span>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-display text-lg text-foreground">INFORMAÇÕES</h4>
                <div className="space-y-2 text-muted-foreground text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{address}</span>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      {(settings?.opening_hours || "Segunda a Sexta: 9h às 18h\nSábado: 9h às 14h").split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Social */}
              <div className="space-y-3">
                <h4 className="font-display text-lg text-foreground">REDES SOCIAIS</h4>
                <div className="flex flex-col gap-2">
                  {showInsta && (
                    <a
                      href={settings?.instagram_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-smooth group text-sm"
                    >
                      <Instagram className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium">
                        {settings?.instagram_url 
                          ? `@${settings.instagram_url.split('/').filter(Boolean).pop()?.split('?')[0]}` 
                          : "Instagram"}
                      </span>
                    </a>
                  )}

                  {showWhats && (
                    <a
                      href={`https://wa.me/${(whatsapp || "").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-smooth group text-sm"
                    >
                      <WhatsappIcon className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium">{whatsapp}</span>
                    </a>
                  )}

                  {showYoutube && youtube && (
                    <a
                      href={youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-smooth group text-sm"
                    >
                      <YoutubeIcon className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium">YouTube</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/50 text-center space-y-2">
              <p className="text-muted-foreground text-xs">{footerInfo}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                Desenvolvedor: {" "}
                <a 
                  href="https://wa.me/5575981284738" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  Jonathan Costa
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </footer>
  );
};

export default Footer;
