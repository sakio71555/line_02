"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  runAiReplyDraftAction,
  runAiSummaryAction,
  runRagAnswerDraftAction
} from "./actions";
import type {
  AiReplyDraftActionState,
  AiSummaryActionState,
  RagAnswerDraftActionState
} from "./action-types";

const initialAiSummaryState: AiSummaryActionState = {
  status: "idle"
};

const initialAiReplyDraftState: AiReplyDraftActionState = {
  status: "idle"
};

const initialRagAnswerDraftState: RagAnswerDraftActionState = {
  status: "idle"
};

export function CustomerActionPanel({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [summaryState, runSummary, summaryPending] = useActionState(
    runAiSummaryAction.bind(null, customerId),
    initialAiSummaryState
  );
  const [replyDraftState, runReplyDraft, replyDraftPending] = useActionState(
    runAiReplyDraftAction.bind(null, customerId),
    initialAiReplyDraftState
  );
  const [ragAnswerState, runRagAnswer, ragAnswerPending] = useActionState(
    runRagAnswerDraftAction,
    initialRagAnswerDraftState
  );

  useEffect(() => {
    if (summaryState.status === "success") {
      router.refresh();
    }
  }, [router, summaryState.status, summaryState.result?.message.id]);

  return (
    <section className="section">
      <h2>AI / RAG 開発アクション</h2>
      <div className="action-grid">
        <article className="action-panel">
          <h3>AI要約</h3>
          <form action={runSummary} className="action-form">
            <button type="submit" disabled={summaryPending}>
              {summaryPending ? "要約中..." : "AI要約を作成"}
            </button>
          </form>
          <AiSummaryResult state={summaryState} />
        </article>

        <article className="action-panel">
          <h3>AI返信下書き</h3>
          <form action={runReplyDraft} className="action-form">
            <button type="submit" disabled={replyDraftPending}>
              {replyDraftPending ? "作成中..." : "返信下書きを作成"}
            </button>
          </form>
          <AiReplyDraftResult state={replyDraftState} />
        </article>

        <article className="action-panel action-panel-wide">
          <h3>RAG回答案</h3>
          <form action={runRagAnswer} className="action-form">
            <label htmlFor="rag-query">質問</label>
            <textarea
              id="rag-query"
              name="query"
              placeholder="例: オンライン相談はできますか？"
              rows={3}
            />
            <button type="submit" disabled={ragAnswerPending}>
              {ragAnswerPending ? "作成中..." : "RAG回答案を作成"}
            </button>
          </form>
          <RagAnswerDraftResult state={ragAnswerState} />
        </article>
      </div>
    </section>
  );
}

function AiSummaryResult({ state }: { state: AiSummaryActionState }) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "error") {
    return <ActionError message={state.error} />;
  }

  const result = state.result;

  if (!result) {
    return null;
  }

  return (
    <div className="action-result">
      <p className="result-label">summary</p>
      <p>{result.summary.summary}</p>
      <ResultList label="next_actions" items={result.summary.next_actions} />
      <ResultList label="risk_flags" items={result.summary.risk_flags} />
      <ResultField label="recommended_response_mode" value={result.summary.recommended_response_mode} />
      <ResultField label="provider" value={result.summary.provider} />
      <ResultField label="saved_message_id" value={result.message.id} />
    </div>
  );
}

function AiReplyDraftResult({ state }: { state: AiReplyDraftActionState }) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "error") {
    return <ActionError message={state.error} />;
  }

  const result = state.result;

  if (!result) {
    return null;
  }

  return (
    <div className="action-result">
      <p className="result-label">draft_body</p>
      <p className="message-body">{result.draft_body}</p>
      <ResultList label="next_questions" items={result.next_questions} />
      <ResultList label="risk_flags" items={result.risk_flags} />
      <ResultField label="recommended_response_mode" value={result.recommended_response_mode} />
      <ResultField label="should_handoff" value={String(result.should_handoff)} />
      <ResultField label="provider" value={result.provider} />
    </div>
  );
}

function RagAnswerDraftResult({ state }: { state: RagAnswerDraftActionState }) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "error") {
    return <ActionError message={state.error} />;
  }

  const result = state.result;

  if (!result) {
    return null;
  }

  return (
    <div className="action-result">
      <ResultField label="query" value={result.query} />
      <ResultField label="can_answer" value={String(result.can_answer)} />
      <p className="result-label">answer_body</p>
      <p className="message-body">{result.answer_body}</p>
      <ResultList label="risk_flags" items={result.risk_flags} />
      <ResultField label="handoff_required" value={String(result.handoff_required)} />
      <ResultField label="recommended_response_mode" value={result.recommended_response_mode} />
      <ResultField label="provider" value={result.provider ?? "-"} />
      <div className="source-list">
        <p className="result-label">sources</p>
        {result.sources.length === 0 ? (
          <p className="meta">該当sourceはありません。</p>
        ) : (
          <ul>
            {result.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url}>{source.title}</a>
                <dl className="compact-detail">
                  <dt>category</dt>
                  <dd>{source.category}</dd>
                  <dt>source_type</dt>
                  <dd>{source.source_type}</dd>
                  <dt>score</dt>
                  <dd>{source.score}</dd>
                  <dt>excerpt</dt>
                  <dd>{source.excerpt}</dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ActionError({ message }: { message: string | undefined }) {
  return (
    <div className="error">
      <strong>アクションエラー</strong>
      <pre>{message ?? "Unknown error"}</pre>
    </div>
  );
}

function ResultField({ label, value }: { label: string; value: string }) {
  return (
    <p className="result-field">
      <span>{label}</span>
      <code>{value}</code>
    </p>
  );
}

function ResultList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="result-label">{label}</p>
      {items.length === 0 ? (
        <p className="meta">-</p>
      ) : (
        <ul className="result-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
