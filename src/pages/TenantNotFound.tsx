const TenantNotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Loja não encontrada
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            O endereço que você acessou não corresponde a nenhuma loja ativa na nossa plataforma.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-gray-500 text-sm">
            Verifique se o endereço está correto ou entre em contato com o suporte.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TenantNotFound;
