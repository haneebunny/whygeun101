"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type AlertType = "success" | "error" | "warning" | "info";

interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  debugInfo?: string;
  onClose?: () => void;
}

interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<AlertOptions | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const showAlert = (options: AlertOptions) => {
    setAlertState({
      type: "info",
      ...options,
    });
    setShowDebug(false);
  };

  const showConfirm = (options: ConfirmOptions) => {
    setConfirmState(options);
  };

  const handleAlertClose = () => {
    if (alertState?.onClose) {
      alertState.onClose();
    }
    setAlertState(null);
  };

  const handleConfirmAction = (confirm: boolean) => {
    if (confirm) {
      confirmState?.onConfirm();
    } else if (confirmState?.onCancel) {
      confirmState.onCancel();
    }
    setConfirmState(null);
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Global Alert Modal */}
      {alertState && (
        <div className="fixed inset-0 bg-slate-950/25 backdrop-blur-[3px] flex items-center justify-center p-5 z-[999] animate-fadeIn">
          <div className="bg-white rounded-[28px] p-7 w-full max-w-[320px] flex flex-col items-center text-center gap-5 shadow-2xl border border-slate-100 animate-scaleUp">
            {/* Header Icon */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              alertState.type === "error" || alertState.type === "warning"
                ? "bg-rose-50 text-rose-500"
                : "bg-blue-50 text-blue-500"
            }`}>
              <span className="text-[18px] font-black font-mono">
                {alertState.type === "error" || alertState.type === "warning" ? "!" : "i"}
              </span>
            </div>

            {/* Header Title */}
            <h3 className="text-[16px] font-extrabold text-slate-800 tracking-tight leading-none">
              {alertState.title}
            </h3>

            {/* Message Body */}
            <p className="text-[13px] text-slate-500 font-medium leading-relaxed whitespace-pre-line px-1">
              {alertState.message}
            </p>

            {alertState.debugInfo && (
              <div className="flex flex-col gap-1.5 mt-1 items-center w-full">
                <button
                  type="button"
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition flex items-center gap-1"
                >
                  {showDebug ? "▼ 상세 오류 정보 접기" : "▶ 상세 오류 정보 보기"}
                </button>
                {showDebug && (
                  <pre className="p-3 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-mono overflow-x-auto max-h-32 border border-slate-100 leading-normal whitespace-pre-wrap break-all w-full text-left">
                    {alertState.debugInfo}
                  </pre>
                )}
              </div>
            )}

            {/* Confirm Button */}
            <button
              onClick={handleAlertClose}
              className={`w-full py-3.5 text-white font-extrabold rounded-2xl transition text-[13.5px] cursor-pointer outline-none ${
                alertState.type === "error" || alertState.type === "warning"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Global Confirm Modal */}
      {confirmState && (() => {
        const isWarning =
          confirmState.title.includes("삭제") ||
          confirmState.title.includes("초기화") ||
          confirmState.message.includes("삭제") ||
          confirmState.message.includes("초기화") ||
          (confirmState.confirmText && (confirmState.confirmText.includes("삭제") || confirmState.confirmText.includes("초기화")));

        return (
          <div className="fixed inset-0 bg-slate-950/25 backdrop-blur-[3px] flex items-center justify-center p-5 z-[999] animate-fadeIn">
            <div className="bg-white rounded-[28px] p-7 w-full max-w-[320px] flex flex-col items-center text-center gap-5 shadow-2xl border border-slate-100 animate-scaleUp">
              {/* Header Icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                isWarning ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-blue-500"
              }`}>
                <span className="text-[18px] font-black font-mono">
                  {isWarning ? "!" : "i"}
                </span>
              </div>

              {/* Header Title */}
              <h3 className="text-[16px] font-extrabold text-slate-800 tracking-tight leading-none">
                {confirmState.title}
              </h3>

              {/* Message Body */}
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed whitespace-pre-line px-1">
                {confirmState.message}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-2.5 w-full mt-1">
                <button
                  onClick={() => handleConfirmAction(false)}
                  className="px-4 py-3.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-500 font-bold rounded-2xl flex-1 transition text-[13.5px] cursor-pointer outline-none"
                >
                  {confirmState.cancelText || "취소"}
                </button>
                <button
                  onClick={() => handleConfirmAction(true)}
                  className={`px-4 py-3.5 text-white font-bold rounded-2xl flex-1 transition text-[13.5px] cursor-pointer outline-none ${
                    isWarning ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {confirmState.confirmText || "확인"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}
