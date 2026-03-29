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

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, size: string, color?: string) => void;
}

const ProductGrid = ({ products, onAddToCart }: ProductGridProps) => {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      const offset = 100; // Ajuste para não ficar colado no topo
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
    // Pequeno delay para garantir que o estado do React atualizou a renderização antes do scroll
    setTimeout(scrollToProducts, 50);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  return (
    <section id="products" className="min-h-screen pt-4 pb-16 md:pb-32" data-aos="fade-up">
      <div className="container mx-auto px-4 md:px-8">
        {/* Category Filter - Modern Pill Slider */}
        <div className="relative mb-12 md:mb-20">
          <div className="flex overflow-x-auto scrollbar-hide gap-3 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 justify-start md:justify-center items-center">
            {categories.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`
                    relative shrink-0 h-10 md:h-12 px-6 md:px-8 
                    rounded-full text-[10px] md:text-sm font-black uppercase tracking-[0.2em]
                    transition-all duration-500 ease-out
                    ${isActive 
                      ? "bg-primary text-primary-foreground shadow-[0_0_25px_rgba(var(--primary),0.4)] scale-105 z-10" 
                      : "bg-white/5 border border-white/10 text-muted-foreground/70 hover:bg-white/10 hover:border-primary/30 hover:text-foreground"
                    }
                    active:scale-95
                  `}
                >
                  {/* Subtle inner glow for active pill */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-gradient-to-t from-white/20 to-transparent pointer-events-none" />
                  )}
                  <span className="relative z-10">{category}</span>
                </button>
              );
            })}
          </div>
          
          {/* Subtle fade edges for mobile indicating more items */}
          <div className="md:hidden absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background/80 to-transparent pointer-events-none" />
          <div className="md:hidden absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-background/80 to-transparent pointer-events-none" />
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
