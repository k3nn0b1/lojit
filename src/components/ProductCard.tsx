import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
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
import { Info, X, ChevronLeft, ChevronRight, Package, ZoomIn } from "lucide-react";
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
  const [isHovered, setIsHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="h-full"
      >
        <Card 
          className="group relative flex flex-col bg-[#111111] rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-white/5 transition-all duration-500 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(var(--primary),0.15)] h-full w-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
        <div 
          className={`relative aspect-square overflow-hidden bg-[#0a0a0a] shrink-0 cursor-pointer group ${isMobile ? "touch-pan-y" : "touch-none"}`}
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
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <img
                  src={productPhotos[currentPhotoIndex]?.url || product.image}
                  alt={product.name}
                  width={400}
                  height={400}
                  loading="lazy"
                  className="w-full h-full object-cover pointer-events-none"
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="absolute top-3 left-3 flex flex-col gap-1 z-30">
            {isSoldOut && (
              <Badge className="bg-destructive text-destructive-foreground text-[8px] md:text-[10px] uppercase font-black px-2 py-0.5 rounded-sm mb-1">Esgotado</Badge>
            )}
            <Badge className="bg-primary/90 text-primary-foreground text-[8px] md:text-[10px] uppercase font-black px-2 py-0.5 rounded-sm">
              {product.category}
            </Badge>
          </div>

          {/* Descrição do Produto no Hover */}
          <div className={`absolute inset-0 bg-black/80 flex flex-col items-center justify-center transition-opacity duration-300 text-center px-6 pointer-events-none z-20 ${isHovered && !isMobile ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`transform transition-transform duration-500 w-[90%] mx-auto ${isHovered ? 'translate-y-0' : 'translate-y-2'}`}>
              <p className="text-primary text-[10px] font-black tracking-[0.2em] uppercase mb-2">Detalhes</p>
              <p className="text-gray-200 text-xs leading-relaxed font-medium line-clamp-4">
                {product.description || "Nenhuma descrição disponível."}
              </p>
            </div>
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

        <div className="p-4 md:p-5 flex flex-col flex-grow bg-[#111111]">
          <h3 className="text-gray-400 text-sm font-medium mb-1 transition-colors group-hover:text-gray-200 uppercase line-clamp-2 h-[2.5rem]">
            {product.name}
          </h3>
          
          <div className="mt-auto mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-primary text-xl md:text-2xl font-black tracking-tight leading-none drop-shadow-[0_0_10px_rgba(var(--primary),0.2)]">
                {formatBRL(product.price)}
              </span>
            </div>
          </div>

          <button 
            onClick={() => setIsDetailsOpen(true)}
            disabled={isSoldOut}
            className={`relative overflow-hidden w-full h-11 md:h-12 rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed ${
              isAdded 
              ? 'bg-green-500 text-white' 
              : isHovered 
                ? 'bg-primary text-[#0a0a0b] shadow-[0_0_20px_rgba(var(--primary),0.4)]' 
                : 'bg-white/5 text-primary border border-primary/20'
            }`}
          >
            {isSoldOut ? (
              "ESGOTADO"
            ) : isAdded ? (
              <>
                <CheckCircle2 size={18} />
                Adicionado
              </>
            ) : (
              <>
                <ShoppingCart size={18} className={isHovered ? 'animate-bounce' : ''} />
                {isHovered ? "Comprar Agora" : "Comprar"}
              </>
            )}
            <div className={`absolute top-0 -left-[100%] w-1/2 h-full bg-white/20 skew-x-[-30deg] transition-all duration-700 pointer-events-none ${isHovered ? 'left-[150%]' : ''}`} />
          </button>
        </div>
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
              <div 
                className="w-full md:w-[180px] aspect-square md:h-[180px] shrink-0 relative order-2 md:order-1 overflow-hidden rounded-2xl md:rounded-[1.5rem] group cursor-zoom-in"
                onClick={() => setIsLightboxOpen(true)}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPhotoIndex}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="w-full h-full touch-pan-y"
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
                        className="w-full h-full object-cover shadow-xl pointer-events-none transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <img
                        src={productPhotos[currentPhotoIndex]?.url || product.image}
                        alt={product.name}
                        className="w-full h-full object-cover shadow-xl pointer-events-none transition-transform duration-500 group-hover:scale-110"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
                
                {/* Lupa overlay no Hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none z-20">
                  <ZoomIn className="w-8 h-8 text-white/80 drop-shadow-md transform scale-50 group-hover:scale-100 transition-transform duration-300" />
                </div>
                
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
      
      {/* Lightbox / Fullscreen Image Viewer */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-[100vw] h-[100dvh] md:max-w-[90vw] md:h-[90vh] p-0 bg-transparent border-none shadow-none flex items-center justify-center overflow-hidden">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all border border-white/20 active:scale-95"
          >
            <X size={24} />
          </button>
          
          <div className="relative w-full h-full flex items-center justify-center">
            {productPhotos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                  className="absolute left-4 z-50 p-3 md:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all border border-white/20 active:scale-95"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                  className="absolute right-4 z-50 p-3 md:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all border border-white/20 active:scale-95"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
            
            <AnimatePresence mode="wait">
              <motion.div
                key={`lightbox-${currentPhotoIndex}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex items-center justify-center p-4 md:p-12 cursor-default"
                drag={productPhotos.length > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.8}
                onDragEnd={(_, info) => {
                  const swipeThreshold = 50;
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
                    className="max-w-full max-h-full object-contain drop-shadow-[0_0_40px_rgba(0,0,0,0.5)] select-none pointer-events-none"
                  />
                ) : (
                  <img
                    src={productPhotos[currentPhotoIndex]?.url || product.image}
                    alt={product.name}
                    className="max-w-full max-h-full object-contain drop-shadow-[0_0_40px_rgba(0,0,0,0.5)] select-none pointer-events-none"
                  />
                )}
              </motion.div>
            </AnimatePresence>
            
            {/* Pontinhos */}
            {productPhotos.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-50 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20">
                {productPhotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex(i);
                    }}
                    className={`h-2 rounded-full transition-all ${
                      currentPhotoIndex === i ? "w-6 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]" : "w-2 bg-white/50 hover:bg-white"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductCard;
