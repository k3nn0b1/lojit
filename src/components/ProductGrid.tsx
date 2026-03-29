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
import { Filter, Check } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, size: string, color?: string) => void;
}

const ProductGrid = ({ products, onAddToCart }: ProductGridProps) => {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category)))];
  
  const filteredProducts = selectedCategory === "Todos" 
    ? products 
    : products.filter(p => p.category === selectedCategory);

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
    <section id="products" className="min-h-screen pt-4 pb-16 md:pb-32" data-aos="fade-up">
      <div className="container mx-auto px-4 md:px-8">
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
            <SheetContent side="right" className="bg-card/95 backdrop-blur-xl border-primary/20 w-[300px] md:w-[400px]">
              <SheetHeader className="mb-12 border-b border-primary/10 pb-6 text-left">
                <SheetTitle className="text-2xl font-black uppercase tracking-widest text-primary">Categorias</SheetTitle>
                <SheetDescription className="text-[10px] font-bold uppercase tracking-widest opacity-40">Selecione uma categoria para descobrir novos produtos</SheetDescription>
              </SheetHeader>
              
              <div className="flex flex-col gap-3">
                {categories.map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`
                        w-full h-16 px-6 rounded-2xl flex items-center justify-between
                        transition-all duration-300 font-black uppercase tracking-widest text-xs
                        ${isActive 
                          ? "bg-primary text-black" 
                          : "bg-white/5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }
                      `}
                    >
                      {category}
                      {isActive && <Check className="w-5 h-5" />}
                    </button>
                  );
                })}
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
