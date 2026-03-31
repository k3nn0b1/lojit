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
import { formatBRL, sizeOrder, rankSize } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, X, ChevronLeft, ChevronRight, Package } from "lucide-react";
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
import { CLOUD_NAME } from "@/lib/constants";

const cld = new Cloudinary({ cloud: { cloudName: CLOUD_NAME } });

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const { settings } = useStoreSettings();
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
    <div className="h-full">
      <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="h-full"
      >
        <Card 
          className="group overflow-hidden border-white/5 bg-[#121214]/80 backdrop-blur-sm lg:backdrop-blur-md hover:border-primary/40 transition-all duration-500 hover:shadow-[0_20px_60px_-20px_rgba(var(--primary),0.3)] flex flex-col h-full rounded-2xl md:rounded-[2.5rem]"
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
              drag={productPhotos.length > 1 ? "x" : false}
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
              className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing"
            >
              {productPhotos[currentPhotoIndex]?.publicId ? (
                <AdvancedImage
                  cldImg={getCldImage(productPhotos[currentPhotoIndex].publicId)!}
                  alt={product.name}
                  width={400}
                  height={400}
                  className="w-full h-full object-cover transition-transform duration-500 md:group-hover:scale-110 pointer-events-none"
                />
              ) : (
                <img
                  src={productPhotos[currentPhotoIndex]?.url || product.image}
                  alt={product.name}
                  width={400}
                  height={400}
                  loading="lazy"
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

          {/* Indicadores de página (Pontinhos do Slider) */}
          {productPhotos.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30 p-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
              {productPhotos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex(i);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    currentPhotoIndex === i ? "w-4 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" : "w-1.5 bg-white/40 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          )}
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
            className="w-full bg-primary hover:bg-primary/90 text-[#0a0a0b] font-black transition-all hover:scale-[1.02] active:scale-[0.98] h-10 md:h-12 text-[10px] uppercase tracking-wider rounded-xl md:rounded-2xl shadow-lg shadow-primary/20 px-2"
            disabled={isSoldOut}
          >
            {isSoldOut ? (
              "ESGOTADO"
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5 mr-2" />
                COMPRAR
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  </div>
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-[500px] w-[92vw] p-0 overflow-hidden bg-[#121214] border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col animate-in zoom-in duration-500 max-h-[90svh]">
          {/* Botão Fechar Customizado - Fixo no topo direito */}
          <button
            onClick={() => setIsDetailsOpen(false)}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full bg-[#121214]/80 backdrop-blur-md border border-white/5 hover:bg-white/10 text-zinc-400 transition-all z-50 shadow-xl active:scale-95"
          >
            <X size={20} />
          </button>

          {/* Container com Scroll */}
          <div className="flex-1 overflow-y-auto p-6 pt-16 md:p-8 md:pt-20 scrollbar-hide">
            {/* Topo: Imagem e Info básica */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              {/* Imagem do Produto */}
              <div className="w-full md:w-[180px] aspect-square md:h-[180px] shrink-0 relative order-2 md:order-1 overflow-hidden rounded-2xl md:rounded-[1.5rem]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPhotoIndex}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="w-full h-full touch-pan-y cursor-grab active:cursor-grabbing"
                    drag={productPhotos.length > 1 ? "x" : false}
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
                  >
                    {productPhotos[currentPhotoIndex]?.publicId ? (
                      <AdvancedImage
                        cldImg={getCldImage(productPhotos[currentPhotoIndex].publicId)!}
                        alt={product.name}
                        className="w-full h-full object-cover shadow-xl pointer-events-none"
                      />
                    ) : (
                      <img
                        src={productPhotos[currentPhotoIndex]?.url || product.image}
                        alt={product.name}
                        className="w-full h-full object-cover shadow-xl pointer-events-none"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
                
                {productPhotos.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                    {productPhotos.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex(i);
                        }}
                        className={`h-1.5 rounded-full transition-all ${
                          currentPhotoIndex === i ? "w-4 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" : "w-1.5 bg-white/40 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Info Principal */}
              <div className="flex flex-col pt-2 order-1 md:order-2">
                <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-1">
                  {product.category}
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight leading-tight mb-2 uppercase">
                  {product.name}
                </h2>
                <div className="text-3xl font-medium text-white mb-6">
                  {formatBRL(product.price)}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                    <Package className="w-4 h-4 text-primary" />
                    <span>
                      {product.stockBySize 
                        ? (Number(product.stockBySize[selectedSize] ?? product.stockBySize[selectedSize.trim()] ?? 0))
                        : (product.stock || 0)
                      } unidades disponíveis
                    </span>
                  </div>
                  
                  {displaySizes.length > 0 && (
                     <div className="flex flex-wrap gap-2">
                        {displaySizes.map((size) => (
                          <button 
                            key={size}
                            onClick={() => setSelectedSize(size.trim())}
                            className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all ${
                              selectedSize === size.trim() 
                                ? "bg-primary/20 border-primary text-primary" 
                                : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                     </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divisor Sutil */}
            <div className="h-[1px] w-full bg-white/5 mb-6" />

            {/* Descrição */}
            {product.description && (
              <div className="mb-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-3 ml-1 opacity-90">Sobre este produto</h4>
                <p className="text-zinc-400 text-sm italic leading-relaxed pl-1 whitespace-pre-wrap">
                  "{product.description}"
                </p>
              </div>
            )}
          </div>

          {/* Botão Adicionar ao Carrinho - Fixo no rodapé */}
          <div className="p-4 md:p-6 bg-[#121214]/90 backdrop-blur-xl border-t border-white/5 relative z-10">
            <button 
              onClick={handleAddToCart}
              disabled={isSoldOut}
              className="group w-full bg-primary hover:bg-primary/90 text-[#0a0a0b] py-4 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_10px_30px_-5px_rgba(var(--primary),0.3)] disabled:opacity-50 disabled:grayscale"
            >
              {isSoldOut ? (
                "Produto Esgotado"
              ) : (
                <>
                  <ShoppingCart size={18} className="group-hover:rotate-12 transition-transform" />
                  Adicionar ao Carrinho
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductCard;
