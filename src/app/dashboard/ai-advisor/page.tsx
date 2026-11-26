"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, RefreshCw, Send, Sparkles, XCircle } from "lucide-react";

interface RecommendationRow {
  id: string;
  category: "product" | "customer" | "sales" | "marketing" | "growth_plan";
  title: string;
  opportunity_or_problem: string;
  supporting_data: string;
  why_it_matters: string;
  recommended_action: string;
  expected_impact_estimate: string;
  measurement_metric: string;
  status: "active" | "applied" | "dismissed";
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  mode?: string;
}

const QUICK_QUESTIONS = [
  "How can I increase my sales?",
  "Which products should I promote?",
  "Why are my sales decreasing?",
  "Who are my most valuable customers?",
  "Which customers should I target?",
  "How can I increase repeat purchases?",
  "What should I do to increase average order value?",
  "Which products are performing poorly?",
  "How can I improve product conversion?",
  "What marketing strategy should I follow this week?",
];

const MODULE_TABS = [
  { id: "all", label: "All Insights" },
  { id: "product", label: "A. Product Intelligence" },
  { id: "customer", label: "B. Customer Intelligence" },
  { id: "sales", label: "C. Sales Intelligence" },
  { id: "marketing", label: "D. Marketing Intelligence" },
  { id: "growth_plan", label: "E. Growth Planning" },
];

export default function AIAdvisorPage() {
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [openAiConfigured, setOpenAiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/ai/advisor");
    const data = await res.json();
    setRecommendations(data.recommendations || []);
    setOpenAiConfigured(Boolean(data.openAiConfigured));
    if (data.conversations?.[0]) {
      setConversationId(data.conversations[0].id);
      setMessages(data.conversations[0].messages || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function askAdvisor(promptText: string, refreshRecs = false) {
    if (!promptText.trim() || asking) return;
    setAsking(true);
    setMessages((prev) => [...prev, { role: "user", content: promptText }]);
    setQuestion("");

    const res = await fetch("/api/ai/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: promptText,
        conversationId,
        refreshRecommendations: refreshRecs,
      }),
    });
    const data = await res.json();
    if (data.conversationId) setConversationId(data.conversationId);
    setMessages((prev) => [...prev, { role: "assistant", content: data.answer, mode: data.mode }]);
    if (refreshRecs) await load();
    setAsking(false);
  }

  async function updateRecStatus(id: string, status: "applied" | "dismissed") {
    setRecommendations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await fetch("/api/ai/advisor", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  }

  const visibleRecs = recommendations.filter(
    (r) => r.status !== "dismissed" && (activeTab === "all" || r.category === activeTab)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy-900">AI Business Growth Advisor</h1>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">
              {openAiConfigured ? "OpenAI Tool-Calling Active" : "Analytics-Grounded Engine"}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Consults your live SellGenius store, inventory, CRM, and order tables—zero fabricated metrics.
          </p>
        </div>
        <button
          type="button"
          onClick={() => askAdvisor("Refresh all growth recommendations across products, customers, sales, and marketing.", true)}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Data Recommendations
        </button>
      </div>

      {/* Interactive Advisor Chat */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <div>
            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Bot className="h-5 w-5 text-violet-600" />
              <span className="text-sm font-bold text-navy-900">Ask Your Business Strategist</span>
            </div>

            <div className="mb-4 max-h-[360px] min-h-[220px] space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-5 text-xs text-slate-600">
                  Ask any business growth question below or click a prompt on the right. Every answer pulls verified
                  metrics from your store and CRM.
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "ml-10 bg-brand-600 text-white"
                        : "mr-6 border border-slate-200 bg-slate-50 text-navy-900"
                    }`}
                  >
                    {m.content}
                  </div>
                ))
              )}
              {asking && (
                <div className="mr-6 rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs text-violet-700">
                  Querying your store revenue, inventory, customer segments &amp; pipeline...
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              askAdvisor(question);
            }}
            className="flex gap-2"
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask e.g. How can I increase repeat purchases?"
              className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Ask
            </button>
          </form>
        </div>

        {/* Quick Questions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-navy-900">
            <Sparkles className="h-4 w-4 text-violet-600" /> Strategic Questions
          </h2>
          <div className="flex flex-col gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={asking}
                onClick={() => askAdvisor(q)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-navy-900 hover:border-brand-300 hover:bg-brand-50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5 AI Intelligence Modules & 6-Part Structured Recommendations */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {MODULE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                activeTab === t.id
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Analyzing business intelligence...</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {visibleRecs.map((rec) => (
              <div key={rec.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold uppercase text-violet-700">
                      {rec.category.replace("_", " ")}
                    </span>
                    {rec.status === "applied" && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Applied
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-navy-900">{rec.title}</h3>

                  <div className="space-y-2 text-xs leading-relaxed text-slate-700">
                    <p>
                      <strong className="text-navy-900">1. Opportunity / Problem:</strong> {rec.opportunity_or_problem}
                    </p>
                    <p className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                      <strong className="text-navy-900">2. Supporting Data:</strong> {rec.supporting_data}
                    </p>
                    <p>
                      <strong className="text-navy-900">3. Why It Matters:</strong> {rec.why_it_matters}
                    </p>
                    <p className="text-brand-700 font-medium">
                      <strong>4. Recommended Action:</strong> {rec.recommended_action}
                    </p>
                    <p>
                      <strong className="text-navy-900">5. Expected Impact (Estimate):</strong>{" "}
                      {rec.expected_impact_estimate}
                    </p>
                    <p>
                      <strong className="text-navy-900">6. How to Measure:</strong> {rec.measurement_metric}
                    </p>
                  </div>
                </div>

                {rec.status === "active" && (
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => updateRecStatus(rec.id, "applied")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Applied
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRecStatus(rec.id, "dismissed")}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
