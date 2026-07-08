import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import Alert from "../primitives/Alert";
import Loader from "../primitives/Loader";
import ModalUi from "../primitives/ModalUi";
import pad from "../assets/images/pad.svg";
import { getCurrentUser } from "../api/account";
import { listTemplates, uploadTemplate, getTemplateFile, deleteTemplate } from "../api/templates";

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

const TemplatesList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "success", msg: "" });
  const [rowLoading, setRowLoading] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ file: null, title: "", description: "" });
  const [uploading, setUploading] = useState(false);

  const showAlert = (type, msg, timer = 2000) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: "success", msg: "" }), timer);
  };

  const fetchTemplates = async (uid) => {
    setLoading(true);
    try {
      const res = await listTemplates(uid);
      setTemplates(res);
    } catch (err) {
      console.error("Error fetching templates", err);
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setUserId(user.id);
        return fetchTemplates(user.id);
      })
      .catch((err) => {
        console.error("Error fetching current user", err);
        showAlert("danger", t("something-went-wrong-mssg"));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleDownload = (tpl) =>
    withRowLoading(tpl.id, async () => {
      try {
        const blob = await getTemplateFile(tpl.id, userId);
        downloadBlob(blob, tpl.fileName || `${tpl.title}.pdf`);
      } catch (err) {
        showAlert("danger", err.message || t("something-went-wrong-mssg"));
      }
    });

  const handleDelete = async () => {
    const tpl = deleteTarget;
    setDeleteTarget(null);
    await withRowLoading(tpl.id, async () => {
      try {
        await deleteTemplate(tpl.id, userId);
        showAlert("success", t("record-delete-alert", { defaultValue: "Template deleted" }));
        fetchTemplates(userId);
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
      await uploadTemplate(userId, {
        file: uploadForm.file,
        title: uploadForm.title,
        description: uploadForm.description
      });
      setUploadOpen(false);
      setUploadForm({ file: null, title: "", description: "" });
      showAlert("success", t("template-created", { defaultValue: "Template created" }));
      fetchTemplates(userId);
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
          <div className="font-light">{t("report-name.Templates", { defaultValue: "Templates" })}</div>
          <button className="op-btn op-btn-primary op-btn-sm" onClick={() => setUploadOpen(true)}>
            <i className="fa-light fa-upload mr-1" /> {t("upload", { defaultValue: "Upload" })}
          </button>
        </div>

        {loading ? (
          <div className="w-full h-[300px] flex justify-center items-center">
            <Loader />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="op-table border-collapse w-full mb-4">
              <thead className="text-[14px]">
                <tr className="border-y-[1px]">
                  <th className="p-2">{t("report-heading.Sr.No", { defaultValue: "#" })}</th>
                  <th className="p-2">{t("report-heading.Name", { defaultValue: "Title" })}</th>
                  <th className="p-2">{t("roles", { defaultValue: "Roles defined" })}</th>
                  <th className="p-2 text-transparent pointer-events-none">{t("action")}</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {templates.map((tpl, index) => (
                  <tr className="border-y-[1px]" key={tpl.id}>
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2 font-semibold">{tpl.title}</td>
                    <td className="p-2">{tpl.hasRoles ? t("yes") : t("no")}</td>
                    <td className="p-2">
                      <div className="flex flex-row gap-2 items-center min-w-max">
                        {rowLoading[tpl.id] ? (
                          <span className="op-loading op-loading-spinner op-loading-sm" />
                        ) : (
                          <>
                            <button
                              className="op-btn op-btn-sm op-btn-primary"
                              title={tpl.hasRoles ? t("send", { defaultValue: "Send" }) : t("define-roles", { defaultValue: "Define roles" })}
                              onClick={() => navigate(`/templates/${tpl.id}/roles`)}
                            >
                              <i className={`fa-light ${tpl.hasRoles ? "fa-paper-plane" : "fa-signature"}`} />
                            </button>
                            <button
                              className="op-btn op-btn-sm op-btn-ghost"
                              title={t("download", { defaultValue: "Download" })}
                              onClick={() => handleDownload(tpl)}
                            >
                              <i className="fa-light fa-download" />
                            </button>
                            <button
                              className="op-btn op-btn-sm op-btn-ghost text-red-600"
                              title={t("delete", { defaultValue: "Delete" })}
                              onClick={() => setDeleteTarget(tpl)}
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
            {templates.length === 0 && (
              <div className="flex flex-col items-center justify-center w-full py-6">
                <img className="w-[60px] h-[60px] object-contain" src={pad} alt="empty" />
                <div className="text-sm font-semibold mt-2">{t("no-data-available")}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <ModalUi isOpen={!!deleteTarget} title={t("delete", { defaultValue: "Delete template" })} handleClose={() => setDeleteTarget(null)}>
        <div className="m-[20px]">
          <div className="text-lg font-normal text-base-content">
            {t("delete-document-alert", { defaultValue: "Are you sure you want to delete this?" })}
          </div>
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
        title={t("upload", { defaultValue: "Upload template" })}
        handleClose={() => setUploadOpen(false)}
        isLoader={uploading}
      >
        <form onSubmit={handleUploadSubmit} className="px-4 py-3">
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">{t("file", { defaultValue: "File" })}</label>
            <input
              type="file"
              accept="application/pdf"
              required
              onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files[0] }))}
              className="op-file-input op-file-input-bordered op-file-input-sm w-full text-xs"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">{t("title", { defaultValue: "Title" })}</label>
            <input
              type="text"
              required
              value={uploadForm.title}
              onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
              className="op-input op-input-bordered op-input-sm w-full text-xs"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">{t("description", { defaultValue: "Description" })}</label>
            <input
              type="text"
              value={uploadForm.description}
              onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
              className="op-input op-input-bordered op-input-sm w-full text-xs"
            />
          </div>
          <button type="submit" className="op-btn op-btn-primary w-full">
            {t("upload", { defaultValue: "Upload" })}
          </button>
        </form>
      </ModalUi>
    </div>
  );
};

export default TemplatesList;
