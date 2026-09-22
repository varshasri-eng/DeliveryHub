import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiSave, FiUpload, FiTrash2, FiChevronDown } from "react-icons/fi";
import { getPaymentSettings } from "../../api/settings";
import { resolveMediaUrl } from "../../utils/media";
import {
  updatePaymentSettings,
  uploadPaymentQr,
  deletePaymentQr,
} from "../../api/admin";

export default function PaymentSettingsPage() {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  const [uploadingQr, setUploadingQr] = useState(false);
  const [removingQr, setRemovingQr] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [savingManualUrl, setSavingManualUrl] = useState(false);

  const fileInputRef = useRef(null);

  const load = () => {
    getPaymentSettings()
      .then((res) => {
        setQrCodeUrl(res.data.qr_code_url || "");
        setInstructions(res.data.instructions || "");
        setUpdatedAt(res.data.updated_at || null);
      })
      .catch(() => toast.error("Could not load payment settings."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    // Reset the input so choosing the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;

    setUploadingQr(true);
    try {
      const res = await uploadPaymentQr(file);
      setQrCodeUrl(res.data.settings?.qr_code_url || "");
      setUpdatedAt(res.data.settings?.updated_at || null);
      toast.success("QR code uploaded.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not upload QR code.");
    } finally {
      setUploadingQr(false);
    }
  };

  const handleRemoveQr = async () => {
    if (!window.confirm("Remove the current QR code? Customers won't see one until you upload a new one.")) {
      return;
    }
    setRemovingQr(true);
    try {
      const res = await deletePaymentQr();
      setQrCodeUrl(res.data.settings?.qr_code_url || "");
      setUpdatedAt(res.data.settings?.updated_at || null);
      toast.success("QR code removed.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not remove QR code.");
    } finally {
      setRemovingQr(false);
    }
  };

  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    try {
      const res = await updatePaymentSettings({ instructions: instructions.trim() });
      setUpdatedAt(res.data.settings?.updated_at || null);
      toast.success("Instructions saved.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save instructions.");
    } finally {
      setSavingInstructions(false);
    }
  };

  const handleSaveManualUrl = async () => {
    setSavingManualUrl(true);
    try {
      const res = await updatePaymentSettings({ qr_code_url: manualUrl.trim() });
      setQrCodeUrl(res.data.settings?.qr_code_url || "");
      setUpdatedAt(res.data.settings?.updated_at || null);
      setManualUrl("");
      toast.success("QR URL saved.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save QR URL.");
    } finally {
      setSavingManualUrl(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          The QR code and instructions shown to customers on every invoice.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
        ) : (
          <div className="space-y-6">
            {/* QR code */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                QR code
              </label>

              <div className="flex items-start gap-5">
                {qrCodeUrl ? (
                  <img
                    src={resolveMediaUrl(qrCodeUrl)}
                    alt="Payment QR code"
                    className="w-32 h-32 object-contain rounded-xl border border-gray-200 bg-gray-50 p-2 flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-xl border border-dashed border-gray-300
                                  bg-gray-50 flex items-center justify-center text-xs text-gray-400
                                  text-center p-3 flex-shrink-0">
                    No QR uploaded yet
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-3">
                    Upload once — re-uploading always replaces the current QR
                    everywhere it's shown, so if this one stops working you can
                    just swap it out.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingQr}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                                 bg-brand-600 text-white text-sm font-semibold
                                 hover:bg-brand-700 disabled:opacity-50"
                    >
                      <FiUpload size={14} />
                      {uploadingQr
                        ? "Uploading…"
                        : qrCodeUrl ? "Replace QR" : "Upload QR"}
                    </button>

                    {qrCodeUrl && (
                      <button
                        onClick={handleRemoveQr}
                        disabled={removingQr}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                                   bg-red-50 text-red-600 text-sm font-semibold
                                   hover:bg-red-100 disabled:opacity-50"
                      >
                        <FiTrash2 size={14} />
                        {removingQr ? "Removing…" : "Remove"}
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    PNG, JPG, or WEBP, up to 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Instructions (optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Pay to UPI ID: tajameat@okaxis, or Zelle: Delivery Hub LLC"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl
                           text-sm outline-none focus:ring-2 focus:ring-brand-100 h-24 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Shown under the QR on the customer's invoice, next to the
                upload/note form.
              </p>
              <button
                onClick={handleSaveInstructions}
                disabled={savingInstructions}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl
                           bg-gray-900 text-white text-sm font-semibold
                           hover:bg-gray-700 disabled:opacity-50"
              >
                <FiSave size={14} />
                {savingInstructions ? "Saving…" : "Save Instructions"}
              </button>
            </div>

            {updatedAt && (
              <p className="text-xs text-gray-400">
                Last updated: {new Date(updatedAt).toLocaleString()}
              </p>
            )}

            {/* Advanced: point at an externally-hosted image instead */}
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={() => setShowAdvancedUrl((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                <FiChevronDown
                  size={13}
                  className={`transition-transform ${showAdvancedUrl ? "rotate-180" : ""}`}
                />
                Advanced: use an externally-hosted image instead
              </button>

              {showAdvancedUrl && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl
                               text-sm outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <p className="text-xs text-gray-400">
                    Only use this if you're hosting the QR image somewhere
                    else — saving this overwrites whatever was uploaded above.
                  </p>
                  <button
                    onClick={handleSaveManualUrl}
                    disabled={savingManualUrl || !manualUrl.trim()}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold
                               text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {savingManualUrl ? "Saving…" : "Use this URL instead"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}