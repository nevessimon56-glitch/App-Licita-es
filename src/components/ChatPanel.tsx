"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, MessageCircle, Bot, User } from "lucide-react";
import type { AnalysisResponse, ChatMessage } from "@/lib/analysis-prompt";

const SUGGESTED_QUESTIONS = [
  "Tem instalação dos equipamentos?",
  "Quais documentos preciso para habilitação?",
  "Quais itens são exclusivos para ME/EPP?",
  "Qual o prazo de entrega?",
  "Quais os principais riscos para o fornecedor?",
  "Posso fornecer marca equivalente?",
];

interface Props {
  result: AnalysisResponse;
}

export function ChatPanel({ result }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          analysis: result.analysis,
          documents: result.documents,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erro ao enviar mensagem.");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[min(70vh,680px)]">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-700" />
          <h2 className="text-lg font-semibold text-slate-800">
            Chat sobre o edital
          </h2>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Tire dúvidas sobre a licitação com base no resumo e nos documentos
          analisados.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="flex gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <Bot className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900 leading-relaxed">
                Olá! Já analisei o edital. Pergunte o que quiser — instalação,
                habilitação, prazos, itens ME/EPP, riscos e mais.
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">
                Sugestões de perguntas
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-blue-700" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-blue-700 animate-spin" />
            </div>
            <div className="bg-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-500">
              Analisando sua pergunta...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="p-4 border-t border-slate-200"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex.: O item 5 exige instalação? Qual a garantia?"
            disabled={loading}
            className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 transition-colors"
            aria-label="Enviar mensagem"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
