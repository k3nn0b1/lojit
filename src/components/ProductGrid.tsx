import { useState } from "react";
import ProductCard, { Product } from "./ProductCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription
} from "@/components/ui/sheet";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Filter, Check, Tag, Ruler, Palette, RotateCcw } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, size: string, color?: string) => void;
}

const ProductGrid = ({ products, onAddToCart }: ProductGridProps) => {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedSize, setSelectedSize] = useState("Todos");
  const [selectedColor, setSelectedColor] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category)))];
  const allSizes = ["Todos", ...Array.from(new Set(products.flatMap(p => p.sizes || [])))];
  
  // Extrai cores únicas (objetos {name, hex})
  const colorsMap = new Map();
  products.forEach(p => {
    if (Array.isArray(p.colors)) {
      p.colors.forEach((c: any) => {
        if (c.name && c.hex) colorsMap.set(c.name, c.hex);
      } );
    }
  });
  const colors = ["Todos", ...Array.from(colorsMap.keys())];

  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    const matchSize = selectedSize === "Todos" || (p.sizes && p.sizes.includes(selectedSize));
    
    const productColorsNames = Array.isArray(p.colors) ? p.colors.map((c: any) => c.name) : [];
    const matchColor = selectedColor === "Todos" || productColorsNames.includes(selectedColor);
    
    return matchCategory && matchSize && matchColor;
  });

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  const scrollToProducts = () => {
    const element = document.getElementById("products");
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setTimeout(scrollToProducts, 50);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  return (
    <section id="products" className="min-h-screen pt-8 pb-16 md:pb-32 relative" data-aos="fade-up">
      {/* Background overlay com gradiente suave para escurecer o fundo sem corte seco */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/60 pointer-events-none -z-10" />
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        {/* Category Filter - Modal Version */}
        <div className="flex justify-between items-center mb-10 md:mb-16">
          <div className="flex flex-col">
            <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-primary/60 mb-1">Explore a</h3>
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-[0.1em]">Coleção Ativa</h2>
          </div>

          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                className={`
                  h-12 md:h-14 px-6 md:px-8 rounded-full border border-primary/20 
                  bg-card/20 backdrop-blur-md transition-all duration-300
                  ${selectedCategory !== "Todos" ? "bg-primary text-black border-none" : "hover:border-primary hover:bg-primary/10"}
                  flex items-center gap-3 font-black uppercase tracking-widest text-[10px] md:text-xs
                `}
              >
                <Filter className={`w-4 h-4 ${selectedCategory !== "Todos" ? "text-black" : "text-primary"}`} />
                {selectedCategory === "Todos" ? "Filtrar" : selectedCategory}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#050505]/95 backdrop-blur-xl border-primary/20 w-[320px] md:w-[450px] p-0 overflow-hidden flex flex-col">
              <SheetHeader className="p-8 border-b border-primary/10 text-left bg-primary/5">
                <SheetTitle className="text-3xl font-black uppercase tracking-tighter text-primary flex items-center gap-3">
                  <Filter className="w-8 h-8" /> Filtros
                </SheetTitle>
                <SheetDescription className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Refine sua busca por produtos</SheetDescription>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                <Accordion type="multiple" className="w-full space-y-4">
                  
                  {/* Categorias */}
                  <AccordionItem value="categories" className="border-zinc-800/10">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <span className="text-xs font-black uppercase tracking-widest flex items-center gap-3 text-white">
                           <Tag className="w-4 h-4 text-primary" /> Categorias
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6">
                        <div className="grid grid-cols-1 gap-1.5">
                           {categories.map((c) => (
                              <button
                                key={c}
                                onClick={() => { setSelectedCategory(c); setCurrentPage(1); }}
                                className={`h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all border flex items-center justify-between ${selectedCategory === c ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-zinc-500 hover:bg-white/10'}`}
                              >
                                {c === 'Todos' ? 'TODAS AS CATEGORIAS' : c}
                                {selectedCategory === c && <Check className="w-4 h-4" />}
                              </button>
                           ))}
                        </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Grades / Tamanhos */}
                  <AccordionItem value="sizes" className="border-zinc-800/10">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <span className="text-xs font-black uppercase tracking-widest flex items-center gap-3 text-white">
                           <Ruler className="w-4 h-4 text-primary" /> Grades
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6">
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                           {allSizes.map((s) => (
                              <button
                                key={s}
                                onClick={() => { setSelectedSize(s); setCurrentPage(1); }}
                                className={`h-11 rounded-lg text-[10px] font-black uppercase transition-all border flex items-center justify-center ${selectedSize === s ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-zinc-500 hover:bg-white/10'}`}
                              >
                                {s}
                              </button>
                           ))}
                        </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Cores */}
                  <AccordionItem value="colors" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-4">
                        <span className="text-xs font-black uppercase tracking-widest flex items-center gap-3 text-white">
                           <Palette className="w-4 h-4 text-primary" /> Paleta de Cores
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                           {colors.map((c) => (
                              <button
                                key={c}
                                onClick={() => { setSelectedColor(c); setCurrentPage(1); }}
                                className={`h-12 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-3 ${selectedColor === c ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 bg-white/5 text-zinc-500 hover:bg-white/10'}`}
                              >
                                {c === 'Todos' ? (
                                   <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-red-500 via-green-500 to-blue-500" />
                                ) : (
                                   <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: colorsMap.get(c) }} />
                                )}
                                <span className="truncate">{c}</span>
                              </button>
                           ))}
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="p-8 border-t border-primary/10 bg-black/40">
                <Button 
                   onClick={() => { 
                      setSelectedCategory("Todos"); 
                      setSelectedSize("Todos"); 
                      setSelectedColor("Todos");
                      setCurrentPage(1);
                      setIsFilterOpen(false);
                   }}
                   className="w-full h-14 bg-zinc-900 border border-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-xs hover:text-primary transition-all flex items-center justify-center gap-3 rounded-2xl"
                >
                   <RotateCcw className="w-4 h-4" /> Resetar Filtros
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-10 overflow-hidden">
          {visibleProducts.map((product) => (
            <div key={product.id}>
              <ProductCard
                product={product}
                onAddToCart={onAddToCart}
              />
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              Nenhum produto encontrado nesta categoria.
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredProducts.length > 0 && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-12 bg-card/20 p-4 rounded-xl border border-border/20">
            <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
              <span>Mostrando {pageSize} por página</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  handlePageChange(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] bg-background">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 40].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                className="border-primary/20 hover:bg-primary/10 hover:border-primary/50 hover:text-foreground text-xs font-bold uppercase tracking-wider h-9"
              >
                Anterior
              </Button>

              <div className="flex items-center gap-1.5">
                {(() => {
                  const windowSize = 5;
                  const pages: (number | "ellipsis")[] = [];
                  const start = Math.max(1, currentPage - Math.floor(windowSize / 2));
                  const end = Math.min(totalPages, start + windowSize - 1);
                  const adjustedStart = Math.max(1, end - windowSize + 1);

                  if (adjustedStart > 1) {
                    pages.push(1);
                    if (adjustedStart > 2) pages.push("ellipsis");
                  }

                  for (let n = adjustedStart; n <= end; n++) {
                    pages.push(n);
                  }

                  if (end < totalPages) {
                    if (end < totalPages - 1) pages.push("ellipsis");
                    pages.push(totalPages);
                  }

                  return pages.map((item, idx) =>
                    item === "ellipsis" ? (
                      <span key={`el-${idx}`} className="px-1 text-muted-foreground">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={item}
                        variant={currentPage === item ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(item as number)}
                        className={`h-9 w-9 p-0 font-bold transition-all duration-300 ${
                          currentPage === item
                            ? "bg-primary text-primary-foreground shadow-primary/40"
                            : "border-primary/20 hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
                        }`}
                      >
                        {item}
                      </Button>
                    )
                  );
                })()}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                className="border-primary/20 hover:bg-primary/10 hover:border-primary/50 hover:text-foreground text-xs font-bold uppercase tracking-wider h-9"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;
