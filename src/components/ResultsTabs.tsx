"use client";

import { useState } from "react";
import { BarChart3, MessageCircle } from "lucide-react";
import { AnalysisResult } from "./AnalysisResult";
import { ChatPanel } from "./ChatPanel";
import type { AnalysisResponse } from "@/lib/analysis-prompt";

type Tab = "analysis" | "chat";

interface Props {
  result: AnalysisResponse;
}

export function ResultsTabs({ result }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("analysis");

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
        <AnalysisResult result={result} />
      ) : (
        <ChatPanel result={result} />
      )}
    </div>
  );
}
