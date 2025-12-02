import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  criancaId?: string;
}

export default function AIChatPanel({ criancaId }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await api.post("/chat", {
        message: inputMessage,
        criancaId: criancaId || null,
        conversationId: conversationId || null
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.data.message.content,
        timestamp: new Date(response.data.message.timestamp)
      };

      setMessages(prev => [...prev, assistantMessage]);
      setConversationId(response.data.conversationId);
    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error(error.response?.data?.message || "Erro ao processar mensagem");
      
      // Adicionar mensagem de erro
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "Qual a melhor estratégia para prematuros de 30 semanas?",
    "Compare diferentes cenários de dieta para esta criança",
    "Mostre estatísticas de crescimento",
    "Explique a predição para este paciente"
  ];

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-purple-50">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="font-bold text-gray-900">Assistente de IA Clínica</h3>
            <p className="text-xs text-gray-600">Análise baseada em dados • Não substitui avaliação médica</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Faça uma pergunta sobre análise de dados e dietoterapia</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputMessage(question)}
                  className="text-left p-2 text-sm text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 border border-purple-200"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0">
                <Bot className="w-8 h-8 text-purple-600 bg-purple-100 rounded-full p-1.5" />
              </div>
            )}
            
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {msg.role === "user" && (
              <div className="flex-shrink-0">
                <User className="w-8 h-8 text-white bg-purple-600 rounded-full p-1.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <Bot className="w-8 h-8 text-purple-600 bg-purple-100 rounded-full p-1.5" />
            <div className="bg-gray-100 p-3 rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua pergunta..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !inputMessage.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

