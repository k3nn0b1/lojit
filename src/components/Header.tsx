import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as React from "react";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";

interface HeaderProps {
  cartItemCount?: number;
  onCartClick?: () => void;
  rightAction?: React.ReactNode;
  showCart?: boolean; // default true
  isStatic?: boolean;
}

const Header = ({ cartItemCount = 0, onCartClick = () => {}, rightAction, showCart = true, isStatic = false }: HeaderProps) => {
  const { settings } = useStoreSettings();
  const storeName = settings?.store_name || "";
  const [isVisible, setIsVisible] = React.useState(isStatic);

  React.useEffect(() => {
    if (isStatic) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      // Aparece após 100px de scroll OU se houver itens no carrinho
      if (window.scrollY > 150 || cartItemCount > 0) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, [cartItemCount]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80 transition-all duration-500 transform ${
      isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
    }`}>
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={storeName}
              className="h-10 md:h-14 w-auto object-contain cursor-pointer"
              onClick={() =>
                document
                  .getElementById("hero")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            />
          ) : (
            <span className="font-display text-xl md:text-2xl text-primary font-bold cursor-pointer"
              onClick={() =>
                document
                  .getElementById("hero")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              {storeName}
            </span>
          )}
        </div>

        {rightAction ? (
          rightAction
        ) : showCart ? (
          <Button
            onClick={onCartClick}
            variant="outline"
            size="lg"
            className="relative border-primary/30 hover:border-primary hover:bg-primary/10 hover:text-foreground transition-smooth"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartItemCount > 0 && (
              <Badge
                className="absolute -top-2 -right-2 bg-primary text-primary-foreground glow-soft"
                variant="default"
              >
                {cartItemCount}
              </Badge>
            )}
          </Button>
        ) : null}
      </div>
    </header>
  );
};

export default Header;
