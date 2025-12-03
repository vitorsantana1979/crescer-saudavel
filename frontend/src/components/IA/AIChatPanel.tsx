import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, Trash2, Copy, Check } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  criancaId?: string;
}

interface AIChatPanelProps {
  criancaId?: string;
  criancaNome?: string;
}

export default function AIChatPanel({ criancaId, criancaNome }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focar input ao carregar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Mensagem de boas-vindas
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: criancaId 
          ? `Olá! 👋 Sou o assistente de IA do Crescer Saudável.\n\nEstou aqui para ajudar com informações sobre ${criancaNome || 'este paciente'}.\n\nVocê pode me perguntar sobre:\n• Crescimento e evolução\n• Histórico de consultas\n• Dietoterapia atual\n• Predições de crescimento\n• Recomendações de alimentos\n• Casos similares\n\nComo posso ajudar?`
          : `Olá! 👋 Sou o assistente de IA do Crescer Saudável.\n\nPosso ajudar com análises clínicas, predições e recomendações baseadas em dados.\n\nPara começar, você pode:\n• Fazer perguntas gerais sobre o sistema\n• Pedir estatísticas e relatórios\n• Solicitar informações sobre protocolos\n\nComo posso ajudar?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [criancaId, criancaNome, messages.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      criancaId
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat', {
        message: inputMessage,
        criancaId: criancaId || null,
        conversationId: conversationId
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.data.message?.content || response.data.message || 'Sem resposta',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Salvar conversationId se for o primeiro
      if (!conversationId && response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }

    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Desculpe, ocorreu um erro ao processar sua mensagem:\n\n${error.response?.data?.message || error.message || 'Erro desconhecido'}\n\nPor favor, tente novamente.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (confirm('Tem certeza que deseja limpar toda a conversa?')) {
      setMessages([]);
      setConversationId(null);
      toast.success('Conversa limpa');
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Copiado!');
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const formatMessage = (content: string) => {
    // Converter markdown básico para JSX
    return content.split('\n').map((line, i) => {
      // Títulos
      if (line.startsWith('###')) {
        return <h4 key={i} className="font-bold text-base mt-3 mb-1">{line.replace('###', '').trim()}</h4>;
      }
      if (line.startsWith('##')) {
        return <h3 key={i} className="font-bold text-lg mt-3 mb-1">{line.replace('##', '').trim()}</h3>;
      }
      
      // Listas
      if (line.startsWith('•') || line.startsWith('-')) {
        return <li key={i} className="ml-4">{line.replace(/^[•-]\s*/, '')}</li>;
      }
      
      // Links (se houver)
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      if (urlRegex.test(line)) {
        const parts = line.split(urlRegex);
        return (
          <p key={i} className="my-1">
            {parts.map((part, j) => 
              urlRegex.test(part) ? (
                <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  {part}
                </a>
              ) : part
            )}
          </p>
        );
      }
      
      // Texto normal
      return line ? <p key={i} className="my-1">{line}</p> : <br key={i} />;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assistente IA Clínico</h2>
            {criancaNome && (
              <p className="text-sm text-gray-600">Contexto: {criancaNome}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleClearChat}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Limpar conversa"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap break-words">
                {formatMessage(message.content)}
              </div>
              
              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-current/10">
                <span className="text-xs opacity-60">
                  {message.timestamp.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                
                {message.role === 'assistant' && (
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Copiar mensagem"
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-700" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimer */}
      <div className="px-6 py-2 bg-yellow-50 border-t border-yellow-200">
        <div className="flex items-start gap-2 text-xs text-yellow-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Aviso:</strong> Este assistente fornece informações baseadas em dados do sistema.
            Decisões clínicas devem ser tomadas por profissionais qualificados considerando o contexto
            completo do paciente.
          </p>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Pressione <kbd className="px-1.5 py-0.5 bg-gray-200 rounded border border-gray-300">Enter</kbd> para enviar
        </div>
      </div>
    </div>
  );
}

