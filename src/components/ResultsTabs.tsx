"use client";

import { useEffect, useState } from "react";
import { BarChart3, Mail, MessageCircle } from "lucide-react";
import { AnalysisResult } from "./AnalysisResult";
import { ChatPanel } from "./ChatPanel";
import { EmailPanel } from "./EmailPanel";
import type { AnalysisResponse } from "@/lib/analysis-prompt";

type Tab = "analysis" | "email" | "chat";

interface Props {
  result: AnalysisResponse;
}

export function ResultsTabs({ result }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const [analysisMarkdown, setAnalysisMarkdown] = useState(result.analysis);

  useEffect(() => {
    setAnalysisMarkdown(result.analysis);
  }, [result]);

  const editableResult: AnalysisResponse = {
    ...result,
    analysis: analysisMarkdown,
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("analysis")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "analysis"
              ? "bg-white text-blue-800 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Resumo
        </button>
        <button
          onClick={() => setActiveTab("email")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "email"
              ? "bg-white text-blue-800 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <Mail className="w-4 h-4" />
          E-mail
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "chat"
              ? "bg-white text-blue-800 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Chat
        </button>
      </div>

      {activeTab === "analysis" ? (
        <AnalysisResult
          result={editableResult}
          onAnalysisChange={setAnalysisMarkdown}
        />
      ) : activeTab === "email" ? (
        <EmailPanel result={editableResult} />
      ) : (
        <ChatPanel result={editableResult} />
      )}
    </div>
  );
}
