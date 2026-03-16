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
  onAddToCart: (product: Product, size: string) => void;
}

const ProductGrid = ({ products, onAddToCart }: ProductGridProps) => {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category)))];
  
  const filteredProducts = selectedCategory === "Todos" 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  // Reset page when category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  return (
    <section id="products" className="min-h-screen py-16 md:py-24" data-aos="fade-up">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl md:text-6xl font-display text-foreground">
            NOSSA <span className="text-primary glow-neon">COLEÇÃO</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            As melhores camisas de futebol do mundo
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {categories.map((category) => (
            <Button
              key={category}
              onClick={() => handleCategoryChange(category)}
              variant={selectedCategory === category ? "default" : "outline"}
              className={
                selectedCategory === category
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground glow-soft font-bold"
                  : "border-primary/30 hover:border-primary hover:bg-primary/10 hover:text-foreground font-bold"
              }
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
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
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] bg-background">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  {[12, 24, 48, 96].map((size) => (
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
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                        onClick={() => setCurrentPage(item as number)}
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
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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
