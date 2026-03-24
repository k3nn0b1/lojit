import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
// Cloudinary
import { AdvancedImage } from "@cloudinary/react";
import { Cloudinary } from "@cloudinary/url-gen";
import { fill } from "@cloudinary/url-gen/actions/resize";
import { format } from "@cloudinary/url-gen/actions/delivery";
import { quality } from "@cloudinary/url-gen/actions/delivery";
import { formatBRL } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, X, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useStoreSettings } from "@/contexts/StoreSettingsContext";

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  image2?: string;
  image3?: string;
  sizes: string[];
  stock?: number; // quantidade em estoque opcional
  publicId?: string;
  publicId2?: string;
  publicId3?: string;
  stockBySize?: Record<string, number>; // estoque por tamanho
  colors?: { name: string, hex: string }[]; // cores disponíveis
  description?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, size: string, color?: string) => void;
}

const cld = new Cloudinary({ cloud: { cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dlmkynuni" } });

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const { settings } = useStoreSettings();
  const sizeOrder = ["PP", "P", "M", "G", "GG", "XG"];
  const normalize = (s: string) => s.trim().toUpperCase();

  const sortedSizes = useMemo(() => {
    const rank = (s: string) => {
      const idx = sizeOrder.indexOf(normalize(s));
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };
    const unique = Array.from(new Set((product.sizes || []).map((s) => s.trim())));
    return unique.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });
  }, [product.sizes]);

  const defaultSelectedSize = useMemo(() => {
    if (sortedSizes.length === 0) return (product.sizes?.[0] ?? "").trim();
    if (product.stockBySize && Object.keys(product.stockBySize).length > 0) {
      const available = sortedSizes.find((s) => {
        const t = s.trim();
        const qty = Number(product.stockBySize?.[t] ?? product.stockBySize?.[s] ?? 0);
        return qty > 0;
      });
      return (available ?? sortedSizes[0]).trim();
    }
    return sortedSizes[0].trim();
  }, [sortedSizes, product.stockBySize]);

  const [selectedSize, setSelectedSize] = useState(defaultSelectedSize);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const productPhotos = useMemo(() => {
    const photos = [
      { url: product.image, publicId: product.publicId },
      { url: product.image2, publicId: product.publicId2 },
      { url: product.image3, publicId: product.publicId3 },
    ].filter(p => p.url || p.publicId);
    return photos;
  }, [product]);

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % productPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + productPhotos.length) % productPhotos.length);
  };

  useEffect(() => {
    setSelectedSize(defaultSelectedSize);
  }, [defaultSelectedSize]);

  const handleAddToCart = () => {
    onAddToCart(product, selectedSize, selectedColor || undefined);
    toast.success("Adicionado ao carrinho!", {
      description: `${product.name} - ${selectedColor ? `Cor: ${selectedColor}, ` : ""}Tamanho ${selectedSize}`,
    });
    setIsDetailsOpen(false);
  };

  // Build Cloudinary image for a specific photo
  const getCldImage = (publicId?: string) => {
    if (!publicId) return null;
    return cld.image(publicId)
      .resize(fill().width(800).height(800))
      .delivery(format("auto"))
      .delivery(quality("auto"));
  };

  const mainCldImage = getCldImage(product.publicId);

  // Calcula o total a partir do estoque por tamanho (se existir)
  const hasStockBySize = !!(product.stockBySize && Object.keys(product.stockBySize).length > 0);
  const totalBySize = hasStockBySize
    ? Object.values(product.stockBySize!).reduce((sum, v) => sum + Number(v ?? 0), 0)
    : undefined;

  const isSoldOut = hasStockBySize
    ? (totalBySize ?? 0) <= 0
    : (product.stock !== undefined && product.stock <= 0);

  // Filtra tamanhos visíveis: remove tamanhos com estoque zero quando houver controle por tamanho
  const displaySizes = useMemo(() => {
    if (!hasStockBySize) return sortedSizes;
    return sortedSizes.filter((size) => {
      const key = size.trim();
      const qty = Number(product.stockBySize?.[key] ?? product.stockBySize?.[size] ?? 0);
      return qty > 0;
    });
  }, [sortedSizes, product.stockBySize, hasStockBySize]);

  return (
    <>
      <Card 
        className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-smooth hover:glow-soft flex flex-col h-full rounded-2xl md:rounded-[2rem]"
      >
        <div 
          className={`relative aspect-square overflow-hidden bg-muted shrink-0 cursor-pointer group ${isMobile ? "touch-pan-y" : "touch-none"}`}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={currentPhotoIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              drag={!isMobile && productPhotos.length > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={(_, info) => {
                const swipeThreshold = 30;
                if (info.offset.x > swipeThreshold) {
                  prevPhoto();
                } else if (info.offset.x < -swipeThreshold) {
                  nextPhoto();
                }
              }}
              onClick={() => setIsDetailsOpen(true)}
              className="w-full h-full absolute inset-0"
            >
              {productPhotos[currentPhotoIndex]?.publicId ? (
                <AdvancedImage
                  cldImg={getCldImage(productPhotos[currentPhotoIndex].publicId)!}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 md:group-hover:scale-110 pointer-events-none"
                />
              ) : (
                <img
                  src={productPhotos[currentPhotoIndex]?.url || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 md:group-hover:scale-110 pointer-events-none"
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="absolute top-2 left-2 flex flex-col gap-1 z-30">
            {isSoldOut && (
              <Badge className="bg-destructive text-destructive-foreground text-[8px] md:text-[10px] uppercase font-black px-2 py-0.5 rounded-sm">Esgotado</Badge>
            )}
            <Badge className="bg-primary/90 text-primary-foreground text-[8px] md:text-[10px] uppercase font-black px-2 py-0.5 rounded-sm">
              {product.category}
            </Badge>
          </div>
        </div>

        <CardContent className="p-3 md:p-5 flex-grow flex flex-col space-y-2">
          <h3 className="font-display text-sm md:text-lg text-foreground line-clamp-2 leading-tight uppercase font-black h-[2.5rem] md:h-[3rem]">
            {product.name}
          </h3>
          
          <div className="flex items-center justify-between mt-auto">
            <span className="text-lg md:text-2xl font-black text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.2)]">
              {formatBRL(product.price)}
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-3 md:p-5 pt-0 mt-auto">
          <Button
            onClick={() => setIsDetailsOpen(true)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black transition-smooth h-10 md:h-12 text-xs md:text-sm uppercase tracking-widest shadow-lg shadow-primary/20"
            size="lg"
            disabled={isSoldOut}
          >
            <ShoppingCart className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            COMPRAR
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border-primary/20 sm:rounded-lg h-[92vh] md:h-auto md:max-h-[90vh] flex flex-col">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Image Section */}
              <div className="relative aspect-square md:aspect-auto bg-muted group overflow-hidden touch-none">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={currentPhotoIndex}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={1}
                    onDragEnd={(_, info) => {
                      const swipeThreshold = 50;
                      if (info.offset.x > swipeThreshold) {
                        prevPhoto();
                      } else if (info.offset.x < -swipeThreshold) {
                        nextPhoto();
                      }
                    }}
                    className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing"
                  >
                    {productPhotos[currentPhotoIndex].publicId ? (
                      <AdvancedImage
                        cldImg={getCldImage(productPhotos[currentPhotoIndex].publicId)!}
                        alt={`${product.name} - Foto ${currentPhotoIndex + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <img
                        src={productPhotos[currentPhotoIndex].url}
                        alt={`${product.name} - Foto ${currentPhotoIndex + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
                
                {productPhotos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 hidden md:flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm border border-white/20 hover:bg-primary transition-all active:scale-90 z-20"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 hidden md:flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm border border-white/20 hover:bg-primary transition-all active:scale-90 z-20"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                      {productPhotos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPhotoIndex(i)}
                          className={`h-2 rounded-full transition-all ${
                            currentPhotoIndex === i ? "w-6 bg-primary" : "w-2 bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {isSoldOut && (
                  <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-lg px-4 py-1 z-30">Esgotado</Badge>
                )}
              </div>

              {/* Content Section */}
              <div className="p-6 md:p-8 flex flex-col">
                <DialogHeader className="text-left space-y-2 mb-6">
                  <Badge variant="outline" className="w-fit text-primary border-primary/30 uppercase tracking-[0.2em] text-[10px]">{product.category}</Badge>
                  <DialogTitle className="text-xl md:text-3xl font-display leading-tight">{product.name}</DialogTitle>
                  <div className="text-2xl font-bold text-primary">{formatBRL(product.price)}</div>
                </DialogHeader>

                <div className="space-y-6">
                  {product.description && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Sobre este produto</h4>
                      <p className="text-sm text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">{product.description}</p>
                    </div>
                  )}
                  
                  {product.colors && product.colors.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Escolha sua cor</h4>
                      <div className="flex flex-wrap gap-3">
                        {product.colors.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => setSelectedColor(c.name)}
                            className={`group relative flex flex-col items-center gap-2 transition-all p-1 rounded-xl border-2 ${
                              selectedColor === c.name 
                                ? "border-primary bg-primary/10 shadow-lg scale-110" 
                                : "border-background/50 bg-background/50 hover:border-primary/30"
                            }`}
                            title={c.name}
                          >
                            <div 
                              className="w-10 h-10 rounded-full border border-white/20 shadow-inner overflow-hidden"
                              style={{ backgroundColor: c.hex }}
                            >
                              <div className="w-full h-full bg-gradient-to-tr from-black/20 to-transparent" />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-tighter ${selectedColor === c.name ? "text-primary" : "text-muted-foreground"}`}>
                              {c.name}
                            </span>
                            {selectedColor === c.name && (
                              <motion.div 
                                layoutId="color-ring"
                                className="absolute inset-0 border-2 border-primary rounded-xl"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isSoldOut && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">{settings?.product_size_label || "Escolha seu tamanho"}</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {displaySizes.map((size) => {
                          const key = size.trim();
                          const qty = product.stockBySize ? Number(product.stockBySize[key] ?? product.stockBySize[size] ?? 0) : undefined;
                          const isSelected = selectedSize === key;
                          
                          return (
                            <div key={key} className="flex flex-col items-center gap-1.5">
                              <button
                                onClick={() => setSelectedSize(key)}
                                className={`min-w-[3.5rem] h-11 flex items-center justify-center rounded-xl border-2 transition-all font-black text-xs px-3 leading-tight text-center ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                                    : "border-border hover:border-primary/50 bg-background/50 text-foreground opacity-70"
                                }`}
                              >
                                {key}
                              </button>
                              <span className="text-[9px] text-muted-foreground font-bold">{qty ?? 0} un</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer for Add to Cart Button */}
          <div className="p-4 md:p-8 border-t border-border/50 bg-card/95 backdrop-blur-md z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
            <Button
              onClick={handleAddToCart}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-smooth h-14 text-lg"
              size="lg"
              disabled={
                hasStockBySize
                  ? Number(product.stockBySize?.[selectedSize] ?? 0) <= 0
                  : (product.stock !== undefined && product.stock <= 0)
              }
            >
              <ShoppingCart className="w-5 h-5 mr-3" />
              ADICIONAR AO CARRINHO
            </Button>
          </div>

          {/* Custom Close Button - Fixed Position */}
          <button
            onClick={() => setIsDetailsOpen(false)}
            className="absolute right-4 top-4 z-50 rounded-full h-11 w-11 flex items-center justify-center bg-background border-2 border-primary/20 text-foreground hover:bg-primary hover:text-white transition-all shadow-xl active:scale-90 group md:bg-background/20 md:backdrop-blur-md md:text-white md:border-white/20"
            aria-label="Voltar"
          >
            <X className="h-6 w-6 stroke-[3]" />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductCard;
