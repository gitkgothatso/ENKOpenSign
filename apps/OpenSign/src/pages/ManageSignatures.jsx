import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Alert from "../primitives/Alert";
import Loader from "../primitives/Loader";
import { getCurrentUser } from "../api/account";
import {
  listSavedSignatures,
  uploadSavedSignature,
  getSavedSignatureImage,
  makeSavedSignatureDefault,
  deleteSavedSignature
} from "../api/signatures";

const TYPES = ["SIGNATURE", "INITIAL", "STAMP"];

const ManageSignatures = () => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "success", msg: "" });
  const [uploadType, setUploadType] = useState("IMAGE");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [rowLoading, setRowLoading] = useState({});

  const showAlert = (type, msg, timer = 2000) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: "success", msg: "" }), timer);
  };

  const fetchSignatures = async (uid) => {
    setLoading(true);
    try {
      const res = await listSavedSignatures(uid);
      setSignatures(res);
      const entries = await Promise.all(
        res.map(async (sig) => {
          try {
            const blob = await getSavedSignatureImage(sig.id, uid);
            return [sig.id, URL.createObjectURL(blob)];
          } catch {
            return [sig.id, null];
          }
        })
      );
      setImages(Object.fromEntries(entries));
    } catch (err) {
      console.error("Error fetching saved signatures", err);
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setUserId(user.id);
        return fetchSignatures(user.id);
      })
      .catch((err) => {
        console.error("Error fetching current user", err);
        showAlert("danger", t("something-went-wrong-mssg"));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      await uploadSavedSignature(userId, { file, type: uploadType, makeDefault: signatures.length === 0 });
      setFile(null);
      showAlert("success", t("uploaded", { defaultValue: "Signature saved" }));
      fetchSignatures(userId);
    } catch (err) {
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setUploading(false);
    }
  };

  const handleMakeDefault = async (sig) => {
    setRowLoading((prev) => ({ ...prev, [sig.id]: true }));
    try {
      await makeSavedSignatureDefault(sig.id, userId);
      fetchSignatures(userId);
    } catch (err) {
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setRowLoading((prev) => {
        const next = { ...prev };
        delete next[sig.id];
        return next;
      });
    }
  };

  const handleDelete = async (sig) => {
    setRowLoading((prev) => ({ ...prev, [sig.id]: true }));
    try {
      await deleteSavedSignature(sig.id, userId);
      fetchSignatures(userId);
    } catch (err) {
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setRowLoading((prev) => {
        const next = { ...prev };
        delete next[sig.id];
        return next;
      });
    }
  };

  return (
    <div className="p-2 w-full bg-base-100 text-base-content op-card shadow-lg relative">
      {alert.msg && <Alert type={alert.type}>{alert.msg}</Alert>}
      <div className="font-light text-[20px] md:text-[23px] my-2 mx-3">{t("my-signature", { defaultValue: "My Signature" })}</div>

      <form onSubmit={handleUpload} className="mx-3 mb-4 flex flex-col md:flex-row gap-2 items-start md:items-end">
        <div>
          <label className="block text-xs font-semibold mb-1">{t("type", { defaultValue: "Type" })}</label>
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            className="op-select op-select-bordered op-select-sm text-xs"
          >
            {TYPES.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">{t("file", { defaultValue: "Image" })}</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
            className="op-file-input op-file-input-bordered op-file-input-sm text-xs"
          />
        </div>
        <button type="submit" className="op-btn op-btn-primary op-btn-sm" disabled={!file || uploading}>
          {uploading ? t("loading") : t("upload", { defaultValue: "Upload" })}
        </button>
      </form>

      {loading ? (
        <div className="w-full h-[200px] flex justify-center items-center">
          <Loader />
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 mx-3 mb-4">
          {signatures.map((sig) => (
            <div key={sig.id} className="op-card bg-base-200 p-2 w-[180px] flex flex-col items-center gap-2">
              {images[sig.id] ? (
                <img src={images[sig.id]} alt={sig.type} className="h-[60px] object-contain" />
              ) : (
                <div className="h-[60px] flex items-center justify-center text-xs text-gray-500">{sig.type}</div>
              )}
              <div className="text-[11px]">{sig.isDefault ? t("default", { defaultValue: "Default" }) : sig.type}</div>
              {rowLoading[sig.id] ? (
                <span className="op-loading op-loading-spinner op-loading-sm" />
              ) : (
                <div className="flex gap-1">
                  {!sig.isDefault && (
                    <button className="op-btn op-btn-xs op-btn-secondary" onClick={() => handleMakeDefault(sig)}>
                      {t("make-default", { defaultValue: "Make default" })}
                    </button>
                  )}
                  <button className="op-btn op-btn-xs op-btn-ghost text-red-600" onClick={() => handleDelete(sig)}>
                    <i className="fa-light fa-trash" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {signatures.length === 0 && (
            <div className="text-sm text-gray-500">{t("no-data-available")}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageSignatures;
