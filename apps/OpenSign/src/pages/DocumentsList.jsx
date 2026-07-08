import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import Alert from "../primitives/Alert";
import Loader from "../primitives/Loader";
import ModalUi from "../primitives/ModalUi";
import pad from "../assets/images/pad.svg";
import { getCurrentUser } from "../api/account";
import {
  listDocuments,
  uploadDocument,
  downloadDocument,
  downloadSignedDocument,
  duplicateDocument,
  deleteDocument
} from "../api/documents";

const STATUS_TABS = [
  { value: "", label: "all" },
  { value: "DRAFT", label: "draft" },
  { value: "PENDING_SIGNATURE", label: "pending" },
  { value: "SIGNED", label: "signed" },
  { value: "REJECTED", label: "rejected" },
  { value: "EXPIRED", label: "expired" }
];

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

const DocumentsList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ pagesCount: 0, totalElementsCount: 0 });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "success", msg: "" });
  const [rowLoading, setRowLoading] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ file: null, title: "", description: "", classification: "CONFIDENTIAL" });
  const [uploading, setUploading] = useState(false);

  const showAlert = (type, msg, timer = 2000) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: "success", msg: "" }), timer);
  };

  const fetchDocuments = useCallback(
    async (uid, pageArg, statusArg, searchArg) => {
      setLoading(true);
      try {
        const res = await listDocuments(uid, {
          status: statusArg || undefined,
          search: searchArg || undefined,
          page: pageArg,
          pageSize: 10
        });
        setDocuments(res.content);
        setPageInfo({ pagesCount: res.pagesCount, totalElementsCount: res.totalElementsCount });
      } catch (err) {
        console.error("Error fetching documents", err);
        showAlert("danger", err.message || t("something-went-wrong-mssg"));
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setUserId(user.id);
        return fetchDocuments(user.id, 0, "", "");
      })
      .catch((err) => {
        console.error("Error fetching current user", err);
        showAlert("danger", t("something-went-wrong-mssg"));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (userId) fetchDocuments(userId, page, status, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, page, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchDocuments(userId, 0, status, search);
  };

  const handleTabChange = (value) => {
    setStatus(value);
    setPage(0);
  };

  const withRowLoading = async (id, fn) => {
    setRowLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await fn();
    } finally {
      setRowLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleDownload = (doc) =>
    withRowLoading(doc.id, async () => {
      try {
        const blob =
          doc.status === "SIGNED"
            ? await downloadSignedDocument(doc.id, userId)
            : await downloadDocument(doc.id, userId);
        downloadBlob(blob, doc.fileName || `${doc.title}.pdf`);
      } catch (err) {
        showAlert("danger", err.message || t("something-went-wrong-mssg"));
      }
    });

  const handleDuplicate = (doc) =>
    withRowLoading(doc.id, async () => {
      try {
        await duplicateDocument(doc.id, userId);
        showAlert("success", t("document-duplicated") || "Document duplicated");
        fetchDocuments(userId, page, status, search);
      } catch (err) {
        showAlert("danger", err.message || t("something-went-wrong-mssg"));
      }
    });

  const handleDelete = async () => {
    const doc = deleteTarget;
    setDeleteTarget(null);
    await withRowLoading(doc.id, async () => {
      try {
        await deleteDocument(doc.id, userId);
        showAlert("success", t("record-delete-alert") || "Document deleted");
        fetchDocuments(userId, page, status, search);
      } catch (err) {
        showAlert("danger", err.message || t("something-went-wrong-mssg"));
      }
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.title) return;
    setUploading(true);
    try {
      await uploadDocument(userId, {
        file: uploadForm.file,
        title: uploadForm.title,
        description: uploadForm.description,
        classification: uploadForm.classification
      });
      setUploadOpen(false);
      setUploadForm({ file: null, title: "", description: "", classification: "CONFIDENTIAL" });
      showAlert("success", t("document-uploaded") || "Document uploaded");
      fetchDocuments(userId, 0, status, search);
      setPage(0);
    } catch (err) {
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <div className="p-2 w-full bg-base-100 text-base-content op-card shadow-lg">
        {alert.msg && <Alert type={alert.type}>{alert.msg}</Alert>}
        <div className="flex flex-row items-center justify-between my-2 mx-3 text-[20px] md:text-[23px]">
          <div className="font-light">{t("report-name.Documents") || "Documents"}</div>
          <button
            className="op-btn op-btn-primary op-btn-sm"
            onClick={() => setUploadOpen(true)}
          >
            <i className="fa-light fa-upload mr-1" /> {t("upload") || "Upload"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mx-3 mb-3">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`op-btn op-btn-sm ${status === tab.value ? "op-btn-primary" : "op-btn-ghost"}`}
            >
              {t(`report-heading.${tab.label}`, { defaultValue: tab.label })}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="mx-3 mb-3 flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search-documents") || "Search documents"}
            className="op-input op-input-bordered op-input-sm w-64 text-xs"
          />
          <button type="submit" className="op-btn op-btn-sm op-btn-secondary">
            {t("search") || "Search"}
          </button>
        </form>

        {loading ? (
          <div className="w-full h-[300px] flex justify-center items-center">
            <Loader />
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <table className="op-table border-collapse w-full mb-4">
                <thead className="text-[14px]">
                  <tr className="border-y-[1px]">
                    <th className="p-2">{t("report-heading.Sr.No") || "#"}</th>
                    <th className="p-2">{t("report-heading.Name") || "Title"}</th>
                    <th className="p-2">{t("report-heading.Status") || "Status"}</th>
                    <th className="p-2">{t("expiry-date") || "Expires"}</th>
                    <th className="p-2 text-transparent pointer-events-none">{t("action")}</th>
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {documents.map((doc, index) => (
                    <tr className="border-y-[1px]" key={doc.id}>
                      <td className="p-2">{page * 10 + index + 1}</td>
                      <td className="p-2 font-semibold">{doc.title}</td>
                      <td className="p-2">{doc.status}</td>
                      <td className="p-2">{doc.expiresAt ? doc.expiresAt.slice(0, 10) : "-"}</td>
                      <td className="p-2">
                        <div className="flex flex-row gap-2 items-center min-w-max">
                          {rowLoading[doc.id] ? (
                            <span className="op-loading op-loading-spinner op-loading-sm" />
                          ) : (
                            <>
                              {doc.status === "DRAFT" && (
                                <button
                                  className="op-btn op-btn-sm op-btn-primary"
                                  title={t("send") || "Send for signature"}
                                  onClick={() => navigate(`/documents/${doc.id}/signature-workflow`)}
                                >
                                  <i className="fa-light fa-paper-plane" />
                                </button>
                              )}
                              <button
                                className="op-btn op-btn-sm op-btn-ghost"
                                title={t("download") || "Download"}
                                onClick={() => handleDownload(doc)}
                              >
                                <i className="fa-light fa-download" />
                              </button>
                              <button
                                className="op-btn op-btn-sm op-btn-ghost"
                                title={t("btnLabel.duplicate") || "Duplicate"}
                                onClick={() => handleDuplicate(doc)}
                              >
                                <i className="fa-light fa-copy" />
                              </button>
                              <button
                                className="op-btn op-btn-sm op-btn-ghost text-red-600"
                                title={t("delete") || "Delete"}
                                onClick={() => setDeleteTarget(doc)}
                              >
                                <i className="fa-light fa-trash" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {documents.length === 0 && (
              <div className="flex flex-col items-center justify-center w-full py-6">
                <img className="w-[60px] h-[60px] object-contain" src={pad} alt="empty" />
                <div className="text-sm font-semibold mt-2">{t("no-data-available")}</div>
              </div>
            )}
            {pageInfo.pagesCount > 1 && (
              <div className="flex flex-row justify-center items-center gap-2 text-xs font-medium mb-2">
                <button
                  className="op-btn op-btn-sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  {t("prev")}
                </button>
                <span>
                  {page + 1} / {pageInfo.pagesCount}
                </span>
                <button
                  className="op-btn op-btn-sm"
                  disabled={page + 1 >= pageInfo.pagesCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ModalUi isOpen={!!deleteTarget} title={t("delete-document")} handleClose={() => setDeleteTarget(null)}>
        <div className="m-[20px]">
          <div className="text-lg font-normal text-base-content">{t("delete-document-alert")}</div>
          <hr className="bg-[#ccc] mt-4" />
          <div className="flex items-center mt-3 gap-2 text-white">
            <button onClick={handleDelete} className="op-btn op-btn-primary">
              {t("yes")}
            </button>
            <button onClick={() => setDeleteTarget(null)} className="op-btn op-btn-secondary">
              {t("no")}
            </button>
          </div>
        </div>
      </ModalUi>

      <ModalUi
        isOpen={uploadOpen}
        title={t("upload") || "Upload document"}
        handleClose={() => setUploadOpen(false)}
        isLoader={uploading}
      >
        <form onSubmit={handleUploadSubmit} className="px-4 py-3">
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">{t("file") || "File"}</label>
            <input
              type="file"
              accept="application/pdf"
              required
              onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files[0] }))}
              className="op-file-input op-file-input-bordered op-file-input-sm w-full text-xs"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">{t("title") || "Title"}</label>
            <input
              type="text"
              required
              value={uploadForm.title}
              onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
              className="op-input op-input-bordered op-input-sm w-full text-xs"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">{t("description") || "Description"}</label>
            <input
              type="text"
              value={uploadForm.description}
              onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
              className="op-input op-input-bordered op-input-sm w-full text-xs"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">
              {t("classification") || "Classification"}
            </label>
            <select
              value={uploadForm.classification}
              onChange={(e) => setUploadForm((f) => ({ ...f, classification: e.target.value }))}
              className="op-select op-select-bordered op-select-sm w-full text-xs"
            >
              <option value="CONFIDENTIAL">{t("confidential") || "Confidential (allows external/guest signers)"}</option>
              <option value="PUBLIC">{t("public") || "Public (allows external/guest signers)"}</option>
              <option value="INTERNAL">{t("internal") || "Internal (registered users only)"}</option>
            </select>
          </div>
          <button type="submit" className="op-btn op-btn-primary w-full">
            {t("upload") || "Upload"}
          </button>
        </form>
      </ModalUi>
    </div>
  );
};

export default DocumentsList;
