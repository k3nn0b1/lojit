import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex-1 flex items-center justify-center bg-background w-full">
      <div className="text-center space-y-4">
        <h1 className="text-7xl font-display font-bold text-primary">404</h1>
        <p className="text-xl text-muted-foreground">Página não encontrada</p>
        <Link
          to="/"
          className="inline-block mt-4 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 transition-smooth"
        >
          Voltar para o Início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
