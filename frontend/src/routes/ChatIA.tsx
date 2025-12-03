import { useSearchParams } from 'react-router-dom';
import AIChatPanel from '@/components/IA/AIChatPanel';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function ChatIA() {
  const [searchParams] = useSearchParams();
  const criancaId = searchParams.get('criancaId');
  const [criancaNome, setCriancaNome] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (criancaId) {
      setLoading(true);
      api.get(`/recemnascido/${criancaId}`)
        .then(res => {
          setCriancaNome(res.data.nome);
        })
        .catch(err => {
          console.error('Erro ao carregar dados da criança:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [criancaId]);

  return (
    <div className="h-[calc(100vh-180px)]">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        </div>
      ) : (
        <AIChatPanel 
          criancaId={criancaId || undefined} 
          criancaNome={criancaNome}
        />
      )}
    </div>
  );
}

