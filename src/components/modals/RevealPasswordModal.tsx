import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DigitalCredential } from "@/types/assets";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { X, ShieldAlert, KeyRound, Copy, Check, Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface RevealPasswordModalProps {
  credential: DigitalCredential;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export const RevealPasswordModal: React.FC<RevealPasswordModalProps> = ({
  credential,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const { userProfile } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  useEffect(() => {
    setRevealed(false);
    setSecret(null);
    setError(null);
  }, [credential.id]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === "ArrowRight" && hasNext && onNext) {
        onNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasPrevious, hasNext, onPrevious, onNext]);

  if (!isOpen) return null;

  const handleReveal = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!userProfile) throw new Error("Sign in before accessing a credential.");
      await addDoc(collection(db, "vault_access_logs"), {
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        credentialId: credential.id,
        platform: credential.platform,
        loginEmail: credential.loginEmail,
        timestamp: serverTimestamp(),
      });
      const secretSnapshot = await getDoc(doc(db, "credential_secrets", credential.id));
      if (!secretSnapshot.exists()) throw new Error("This credential needs admin migration before its secret can be revealed.");
      setSecret(String(secretSnapshot.data().secret || ""));
      setRevealed(true);
    } catch (err: any) {
      setError(err.message || "Failed to log vault access.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative my-auto w-full max-w-sm md:max-w-2xl lg:max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex shrink-0 justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50/50 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 flex-shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">Credential Vault Security</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{credential.platform}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Forward / Backward Navigation Buttons */}
            {(onPrevious || onNext) && (
              <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-sm">
                <button
                  type="button"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                  title="Previous Credential (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-slate-200 my-auto" />
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                  title="Next Credential (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 sm:p-6">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div>
              <span className="text-slate-400 font-medium">Account / Login:</span>
              <p className="font-semibold text-slate-800 font-mono text-sm break-all">{credential.loginEmail}</p>
            </div>
            {credential.subAgentHandleId && (
              <div>
                <span className="text-slate-400 font-medium">Sub-Agent / Handle:</span>
                <p className="font-semibold text-slate-800 font-mono">{credential.subAgentHandleId}</p>
              </div>
            )}
            <div>
              <span className="text-slate-400 font-medium">Assigned Custodian:</span>
              <p className="font-medium text-slate-700">{credential.assignedUser} ({credential.userRole || "User"})</p>
            </div>
          </div>

          {!revealed ? (
            <>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Audit Trail Notice</span>
                </div>
                <p className="text-amber-700 leading-relaxed">
                  Access to this credential is audited. Your signed-in identity{" "}
                  <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">{userProfile?.email}</code>{" "}
                  and current timestamp will be permanently logged to <span className="font-semibold">vault_access_logs</span>.
                </p>
              </div>

              {error && <div className="text-xs text-rose-600 font-medium">{error}</div>}

              <button
                onClick={handleReveal}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                {loading ? "Authenticating & Logging..." : "Acknowledge & Reveal Password"}
              </button>
            </>
          ) : (
            <div className="space-y-3 animate-in fade-in">
              <label className="block text-xs font-semibold text-slate-700">Credential Password</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={secret || "No password stored"}
                  className="flex-1 font-mono text-sm px-3 py-2 bg-emerald-50/50 border border-emerald-300 text-emerald-900 rounded-xl focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1 transition-all"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Access logged to Vault Security Audit Trail.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end p-3 border-t border-slate-100 bg-slate-50/50 sm:p-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
