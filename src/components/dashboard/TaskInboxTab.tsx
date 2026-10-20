"use client";

import React, { useState } from "react";
import { InboxTask, StaffMember, PhysicalAsset } from "@/types/assets";
import { AssignTaskModal } from "../modals/AssignTaskModal";
import {
  CheckCircle2,
  ClipboardList,
  Wrench,
  ArrowLeftRight,
  Plus,
  User,
  Clock,
  Send,
  Laptop,
} from "lucide-react";

interface TaskInboxTabProps {
  tasks: InboxTask[];
  onStatusChange: (task: InboxTask, status: InboxTask["status"]) => Promise<void>;
  onRetryLocal?: (task: InboxTask) => Promise<void>;
  isAdmin?: boolean;
  staffList?: StaffMember[];
  assetList?: PhysicalAsset[];
  onAssignTask?: (taskData: {
    title: string;
    description: string;
    type: "repair_request" | "stocktake" | "handover" | "general_task";
    assignedToStaff: StaffMember;
    asset?: PhysicalAsset;
  }) => Promise<void>;
}

export function TaskInboxTab({
  tasks,
  onStatusChange,
  onRetryLocal,
  isAdmin = false,
  staffList = [],
  assetList = [],
  onAssignTask,
}: TaskInboxTabProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "open" | "in_progress" | "done">("ALL");

  const iconFor = (type: InboxTask["type"]) =>
    type === "repair_request" ? Wrench : type === "stocktake" ? ClipboardList : ArrowLeftRight;

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === "ALL") return true;
    return t.status === filterStatus;
  });

  return (
    <div className="space-y-6" data-scroll-motion-root>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" />
            <span>Task Inbox &amp; Dispatch Command</span>
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {isAdmin
              ? "Assign tasks, inspections, and hardware verifications to staff members."
              : "Repair requests, handovers, and verification work assigned to you."}
          </p>
        </div>

        {isAdmin && onAssignTask && (
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-navy-800 hover:bg-navy-700 text-gold-400 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Task to User</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--border)]">
        {(["ALL", "open", "in_progress", "done"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterStatus === status
                ? "bg-navy-800 text-gold-400 shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            }`}
          >
            {status === "ALL"
              ? `All Tasks (${tasks.length})`
              : status === "open"
              ? `Open (${tasks.filter((t) => t.status === "open").length})`
              : status === "in_progress"
              ? `In Progress (${tasks.filter((t) => t.status === "in_progress").length})`
              : `Completed (${tasks.filter((t) => t.status === "done").length})`}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-12 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
          <p className="font-bold text-[var(--text-primary)] text-base">You’re All Caught Up</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">No assigned tasks match your selected filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const Icon = iconFor(task.type);
            return (
              <article
                key={task.id}
                className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="rounded-xl bg-blue-500/10 p-3 text-blue-500 flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-[var(--text-primary)] text-sm">{task.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {task.description || task.assetTag || task.type.replaceAll("_", " ")}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] flex-wrap pt-1">
                      {task.assignedToName && (
                        <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <User className="w-3 h-3" /> Assigned To: {task.assignedToName}
                        </span>
                      )}
                      {task.assetTag && (
                        <span className="font-mono flex items-center gap-1">
                          <Laptop className="w-3 h-3 text-slate-400" /> Asset: {task.assetTag}
                        </span>
                      )}
                      <span className="capitalize px-2 py-0.5 rounded-full bg-[var(--bg-muted)] border border-[var(--border)] font-semibold">
                        {task.localOnly ? "pending sync" : task.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {task.localSyncFailed && onRetryLocal && (
                    <button
                      onClick={() => void onRetryLocal(task)}
                      className="rounded-xl border border-amber-500 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 cursor-pointer"
                    >
                      Retry sync
                    </button>
                  )}

                  {task.status !== "done" && !task.localOnly && (
                    <div className="flex items-center gap-2">
                      {task.status === "open" && (
                        <button
                          onClick={() => void onStatusChange(task, "in_progress")}
                          className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
                        >
                          Start Task
                        </button>
                      )}
                      <button
                        onClick={() => void onStatusChange(task, "done")}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                      >
                        Complete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Assign Task Modal */}
      {isAssignModalOpen && onAssignTask && (
        <AssignTaskModal
          staffList={staffList}
          assetList={assetList}
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onAssign={onAssignTask}
        />
      )}
    </div>
  );
}
