import { AlertTriangle, CheckCircle2, Clock3, UserRoundCheck } from "lucide-react";
import React from "react";

import { PageTitle } from "../_components/ui";
import { getServerAdminApiRequestOptions } from "../admin-api-request-options";
import { getAdminOperationsBoard, type AdminOperationsBoardResponse } from "../../src/admin-api";
import { OperationsBoard } from "./operations-board";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  let board: AdminOperationsBoardResponse | null = null;
  let error = "";
  try {
    board = await getAdminOperationsBoard(await getServerAdminApiRequestOptions());
  } catch (loadError) {
    error = loadError instanceof Error ? loadError.message : String(loadError);
  }

  return (
    <main>
      <PageTitle
        eyebrow="対応管理"
        title="対応ボード"
        description="担当者、返信期限、対応状況をここで整理します。左から右へ進めるだけで対応漏れを防げます。"
      />
      {error || !board ? <div className="inline-error">対応ボードを読み込めませんでした。{error}</div> : (
        <>
          <section className="task-summary" aria-label="対応状況">
            <div><span>未対応</span><strong>{board.summary.open}</strong><small>担当と期限を決める</small></div>
            <div><span>対応中</span><strong>{board.summary.in_progress}</strong><small>現在進行中</small></div>
            <div><span>期限超過</span><strong>{board.summary.overdue}</strong><small>優先して確認</small></div>
            <div><span>完了</span><strong>{board.summary.completed}</strong><small>対応済み</small></div>
          </section>
          <div className="task-guidance">
            {board.summary.overdue > 0 ? <AlertTriangle size={22} /> : <UserRoundCheck size={22} />}
            <div><strong>{board.summary.overdue > 0 ? "期限を過ぎた対応があります" : "上から順に進めれば大丈夫です"}</strong>
              <span>カード内で担当者と期限を決め、返信後に「完了」へ変更します。</span></div>
          </div>
          <div className="operations-legend" aria-label="対応ボードの見方">
            <span><Clock3 size={16} />期限までに対応</span><span><CheckCircle2 size={16} />完了へ移動</span>
          </div>
          <OperationsBoard staff={board.staff} tasks={board.tasks} />
        </>
      )}
    </main>
  );
}
