import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Document, Page } from "react-pdf";
import { useTranslation } from "react-i18next";
import Alert from "../primitives/Alert";
import Loader from "../primitives/Loader";
import { emailRegex } from "../constant/const";
import { FIELD_TYPES } from "../constant/fieldTypes";
import { getCurrentUser } from "../api/account";
import { getTemplate, getTemplateFile, defineTemplateRoles, sendTemplate } from "../api/templates";

const PAGE_WIDTH = 700;

const DefineRolesView = ({ template, userId, userEmail, fileBlob, onRolesDefined }) => {
  const { t } = useTranslation();
  const pageRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [roles, setRoles] = useState([{ roleName: "Signer 1" }]);
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const [activeFieldType, setActiveFieldType] = useState("SIGNATURE");
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: "success", msg: "" });

  const showAlert = (type, msg, timer = 2500) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: "success", msg: "" }), timer);
  };

  const handleAddRole = () => {
    setRoles((prev) => [...prev, { roleName: `Signer ${prev.length + 1}` }]);
  };

  const handleRemoveRole = (index) => {
    if (roles.length === 1) return;
    setRoles((prev) => prev.filter((_, i) => i !== index));
    setFields((prev) => prev.filter((f) => f.roleIndex !== index).map((f) => (f.roleIndex > index ? { ...f, roleIndex: f.roleIndex - 1 } : f)));
    setActiveRoleIndex(0);
  };

  const handleRoleNameChange = (index, name) => {
    setRoles((prev) => prev.map((r, i) => (i === index ? { ...r, roleName: name } : r)));
  };

  const handlePageClick = (e) => {
    const rect = pageRef.current.getBoundingClientRect();
    const fieldDef = FIELD_TYPES.find((f) => f.value === activeFieldType);
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.min(Math.max(0, x), 100 - fieldDef.w);
    y = Math.min(Math.max(0, y), 100 - fieldDef.h);
    setFields((prev) => [
      ...prev,
      { roleIndex: activeRoleIndex, pageNumber, x, y, width: fieldDef.w, height: fieldDef.h, fieldType: activeFieldType }
    ]);
  };

  const handleRemoveField = (index) => setFields((prev) => prev.filter((_, i) => i !== index));

  const handleSaveRoles = async () => {
    const roleDtos = roles.map((role, index) => ({
      roleOrder: index + 1,
      roleName: role.roleName,
      fields: fields
        .filter((f) => f.roleIndex === index)
        .map((f) => ({ pageNumber: f.pageNumber, x: f.x, y: f.y, width: f.width, height: f.height, fieldType: f.fieldType }))
    }));
    const missing = roleDtos.find((r) => r.fields.length === 0);
    if (missing) {
      showAlert("danger", t("every-role-needs-field") || "Every role needs at least one field");
      return;
    }
    setSaving(true);
    try {
      await defineTemplateRoles(template.id, userId, roleDtos);
      onRolesDefined();
    } catch (err) {
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setSaving(false);
    }
  };

  const pageFields = fields.map((f, i) => ({ ...f, index: i })).filter((f) => f.pageNumber === pageNumber);

  return (
    <div className="flex flex-col md:flex-row gap-3 relative">
      {alert.msg && <Alert type={alert.type}>{alert.msg}</Alert>}
      <div className="w-full md:w-[300px] bg-base-100 text-base-content op-card shadow-lg p-3">
        <h2 className="text-lg font-semibold mb-2">{template.title}</h2>
        <p className="text-xs text-gray-500 mb-3">
          {t("define-roles-help") || "Define abstract roles (e.g. Signer 1, Approver) and place their fields. You'll bind real people to these roles when you send."}
        </p>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1">{t("roles") || "Roles"}</label>
          {roles.map((role, index) => (
            <div
              key={index}
              className={`flex justify-between items-center px-2 py-1 mb-1 rounded cursor-pointer text-xs ${
                activeRoleIndex === index ? "bg-primary text-primary-content" : "bg-base-200"
              }`}
              onClick={() => setActiveRoleIndex(index)}
            >
              <input
                type="text"
                value={role.roleName}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleRoleNameChange(index, e.target.value)}
                className="bg-transparent border-none text-xs w-full focus:outline-none"
              />
              {roles.length > 1 && (
                <i
                  className="fa-light fa-xmark cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveRole(index);
                  }}
                />
              )}
            </div>
          ))}
          <button className="op-btn op-btn-sm op-btn-secondary mt-1" onClick={handleAddRole}>
            <i className="fa-light fa-plus mr-1" /> {t("add-role") || "Add role"}
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1">
            {t("field-type") || "Field type"} ({t("placing-for") || "placing for"} {roles[activeRoleIndex]?.roleName})
          </label>
          <div className="flex flex-wrap gap-1">
            {FIELD_TYPES.map((ft) => (
              <button
                key={ft.value}
                onClick={() => setActiveFieldType(ft.value)}
                className={`op-btn op-btn-xs ${activeFieldType === ft.value ? "op-btn-primary" : "op-btn-ghost"}`}
              >
                <i className={`fa-light ${ft.icon} mr-1`} /> {ft.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">{t("click-doc-to-place") || "Click on the document to place this field"}</p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1">{t("placed-fields") || "Placed fields"}</label>
          <div className="max-h-[150px] overflow-y-auto">
            {fields.map((f, index) => (
              <div key={index} className="flex justify-between items-center text-xs px-2 py-1 bg-base-200 rounded mb-1">
                <span>
                  p{f.pageNumber} · {f.fieldType} · {roles[f.roleIndex]?.roleName}
                </span>
                <i className="fa-light fa-trash cursor-pointer text-red-600" onClick={() => handleRemoveField(index)} />
              </div>
            ))}
          </div>
        </div>

        <button className="op-btn op-btn-primary w-full" disabled={saving} onClick={handleSaveRoles}>
          {saving ? t("loading") : t("save-roles") || "Save roles"}
        </button>
      </div>

      <div className="flex-1 bg-base-100 op-card shadow-lg p-3 flex flex-col items-center">
        {fileBlob && (
          <Document file={fileBlob} onLoadSuccess={({ numPages: n }) => setNumPages(n)}>
            <div ref={pageRef} className="relative inline-block cursor-crosshair" onClick={handlePageClick}>
              <Page pageNumber={pageNumber} width={PAGE_WIDTH} renderAnnotationLayer={false} renderTextLayer={false} />
              {pageFields.map((f) => (
                <div
                  key={f.index}
                  className="absolute border-2 border-primary bg-primary/20 flex items-center justify-center text-[10px] text-primary-content pointer-events-none"
                  style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.width}%`, height: `${f.height}%` }}
                >
                  {f.fieldType}
                </div>
              ))}
            </div>
          </Document>
        )}
        {numPages > 1 && (
          <div className="flex flex-row justify-center items-center gap-2 mt-2 text-xs font-medium">
            <button className="op-btn op-btn-sm" disabled={pageNumber === 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>
              {t("prev")}
            </button>
            <span>
              {pageNumber} / {numPages}
            </span>
            <button className="op-btn op-btn-sm" disabled={pageNumber >= numPages} onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}>
              {t("next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const SendFromTemplateView = ({ template, userId, userEmail }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bindings, setBindings] = useState(
    template.roles.map((role) => ({ roleName: role.roleName, signerEmail: "", signerName: "" }))
  );
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [alert, setAlert] = useState({ type: "success", msg: "" });

  const showAlert = (type, msg, timer = 2500) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: "success", msg: "" }), timer);
  };

  const handleBindingChange = (index, field, value) => {
    setBindings((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  };

  const handleSend = async () => {
    const invalid = bindings.find((b) => !emailRegex.test(b.signerEmail) || !b.signerName);
    if (invalid) {
      showAlert("danger", t("valid-email-alert"));
      return;
    }
    setSending(true);
    try {
      await sendTemplate(template.id, { requesterId: userId, requesterEmail: userEmail, message, roleBindings: bindings });
      showAlert("success", t("document-sent-alert") || "Document sent for signature");
      setTimeout(() => navigate("/documents"), 1200);
    } catch (err) {
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-[500px] bg-base-100 text-base-content op-card shadow-lg p-4 relative">
      {alert.msg && <Alert type={alert.type}>{alert.msg}</Alert>}
      <h2 className="text-lg font-semibold mb-3">{template.title}</h2>

      <div className="mb-4">
        <label className="block text-xs font-semibold mb-1">{t("message") || "Message"}</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="op-textarea op-textarea-bordered op-textarea-sm w-full text-xs"
          rows={2}
        />
      </div>

      {bindings.map((binding, index) => (
        <div key={index} className="mb-3 p-2 bg-base-200 rounded">
          <div className="text-xs font-semibold mb-1">{binding.roleName}</div>
          <input
            type="text"
            placeholder={t("name") || "Name"}
            value={binding.signerName}
            onChange={(e) => handleBindingChange(index, "signerName", e.target.value)}
            className="op-input op-input-bordered op-input-sm w-full text-xs mb-1"
          />
          <input
            type="email"
            placeholder={t("email") || "Email"}
            value={binding.signerEmail}
            onChange={(e) => handleBindingChange(index, "signerEmail", e.target.value?.toLowerCase()?.replace(/\s/g, ""))}
            className="op-input op-input-bordered op-input-sm w-full text-xs"
          />
        </div>
      ))}

      <button className="op-btn op-btn-primary w-full" disabled={sending} onClick={handleSend}>
        {sending ? t("loading") : t("send") || "Send for signature"}
      </button>
    </div>
  );
};

const TemplateRolesPage = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [template, setTemplate] = useState(null);
  const [fileBlob, setFileBlob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        setUserId(user.id);
        setUserEmail(user.email);
        const detail = await getTemplate(id, user.id);
        setTemplate(detail);
        if (!detail.roles || detail.roles.length === 0) {
          const blob = await getTemplateFile(id, user.id);
          setFileBlob(blob);
        }
      } catch (err) {
        console.error("Error loading template", err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const refetchTemplate = async () => {
    const detail = await getTemplate(id, userId);
    setTemplate(detail);
  };

  if (loading) {
    return (
      <div className="w-full h-[400px] flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  if (!template) {
    return <div className="w-full h-[400px] flex justify-center items-center">{t("something-went-wrong-mssg")}</div>;
  }

  return template.roles && template.roles.length > 0 ? (
    <SendFromTemplateView template={template} userId={userId} userEmail={userEmail} />
  ) : (
    <DefineRolesView template={template} userId={userId} userEmail={userEmail} fileBlob={fileBlob} onRolesDefined={refetchTemplate} />
  );
};

export default TemplateRolesPage;
