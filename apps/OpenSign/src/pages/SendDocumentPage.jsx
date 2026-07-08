import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Document, Page } from "react-pdf";
import { useTranslation } from "react-i18next";
import Alert from "../primitives/Alert";
import Loader from "../primitives/Loader";
import { emailRegex } from "../constant/const";
import { FIELD_TYPES } from "../constant/fieldTypes";
import { getCurrentUser } from "../api/account";
import { getDocument, viewDocument } from "../api/documents";
import { createSignatureRequest } from "../api/signatures";

const PAGE_WIDTH = 700;

const SendDocumentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pageRef = useRef(null);

  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [doc, setDoc] = useState(null);
  const [fileBlob, setFileBlob] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "success", msg: "" });
  const [sending, setSending] = useState(false);

  const [signers, setSigners] = useState([]);
  const [signerForm, setSignerForm] = useState({ name: "", email: "" });
  const [activeSignerIndex, setActiveSignerIndex] = useState(0);
  const [activeFieldType, setActiveFieldType] = useState("SIGNATURE");
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState([]); // { stepIndex, pageNumber, x, y, width, height, fieldType }

  const showAlert = (type, msg, timer = 2500) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: "success", msg: "" }), timer);
  };

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        setUserId(user.id);
        setUserEmail(user.email);
        const [meta, blob] = await Promise.all([getDocument(id, user.id), viewDocument(id, user.id)]);
        setDoc(meta);
        setFileBlob(blob);
      } catch (err) {
        console.error("Error loading document", err);
        showAlert("danger", err.message || t("something-went-wrong-mssg"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddSigner = (e) => {
    e.preventDefault();
    if (!emailRegex.test(signerForm.email) || !signerForm.name) {
      alert(t("valid-email-alert"));
      return;
    }
    setSigners((prev) => [...prev, { ...signerForm }]);
    setSignerForm({ name: "", email: "" });
  };

  const handleRemoveSigner = (index) => {
    setSigners((prev) => prev.filter((_, i) => i !== index));
    setFields((prev) => prev.filter((f) => f.stepIndex !== index).map((f) => (f.stepIndex > index ? { ...f, stepIndex: f.stepIndex - 1 } : f)));
    setActiveSignerIndex(0);
  };

  const handlePageClick = (e) => {
    if (signers.length === 0) {
      showAlert("danger", t("add-signer-first", { defaultValue: "Add a signer first" }));
      return;
    }
    const rect = pageRef.current.getBoundingClientRect();
    const fieldDef = FIELD_TYPES.find((f) => f.value === activeFieldType);
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.min(Math.max(0, x), 100 - fieldDef.w);
    y = Math.min(Math.max(0, y), 100 - fieldDef.h);
    setFields((prev) => [
      ...prev,
      {
        stepIndex: activeSignerIndex,
        pageNumber,
        x,
        y,
        width: fieldDef.w,
        height: fieldDef.h,
        fieldType: activeFieldType
      }
    ]);
  };

  const handleRemoveField = (index) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (signers.length === 0) {
      showAlert("danger", t("add-signer-first", { defaultValue: "Add at least one signer" }));
      return;
    }
    if (fields.length === 0) {
      showAlert("danger", t("place-field-first", { defaultValue: "Place at least one field" }));
      return;
    }
    setSending(true);
    try {
      const steps = signers.map((signer, index) => ({
        stepOrder: index + 1,
        signerEmail: signer.email,
        signerName: signer.name,
        fields: fields
          .filter((f) => f.stepIndex === index)
          .map((f) => ({
            pageNumber: f.pageNumber,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            fieldType: f.fieldType
          }))
      }));
      const missingFieldsStep = steps.find((s) => s.fields.length === 0);
      if (missingFieldsStep) {
        showAlert("danger", t("every-signer-needs-field", { defaultValue: "Every signer needs at least one field" }));
        setSending(false);
        return;
      }
      const res = await createSignatureRequest({
        documentId: id,
        requesterId: userId,
        requesterEmail: userEmail,
        message,
        steps
      });
      showAlert("success", t("document-sent-alert", { defaultValue: "Document sent for signature" }));
      setTimeout(() => navigate(`/documents`), 1200);
      return res;
    } catch (err) {
      console.error("Error sending document", err);
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[400px] flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  const pageFields = fields
    .map((f, i) => ({ ...f, index: i }))
    .filter((f) => f.pageNumber === pageNumber);

  return (
    <div className="flex flex-col md:flex-row gap-3 relative">
      {alert.msg && <Alert type={alert.type}>{alert.msg}</Alert>}
      <div className="w-full md:w-[300px] bg-base-100 text-base-content op-card shadow-lg p-3">
        <h2 className="text-lg font-semibold mb-2">{doc?.title}</h2>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1">{t("message", { defaultValue: "Message" })}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="op-textarea op-textarea-bordered op-textarea-sm w-full text-xs"
            rows={2}
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1">{t("signers", { defaultValue: "Signers" })}</label>
          {signers.map((s, index) => (
            <div
              key={index}
              className={`flex justify-between items-center px-2 py-1 mb-1 rounded cursor-pointer text-xs ${
                activeSignerIndex === index ? "bg-primary text-primary-content" : "bg-base-200"
              }`}
              onClick={() => setActiveSignerIndex(index)}
            >
              <span>
                {index + 1}. {s.name} ({s.email})
              </span>
              <i
                className="fa-light fa-xmark cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveSigner(index);
                }}
              />
            </div>
          ))}
          <form onSubmit={handleAddSigner} className="flex flex-col gap-1 mt-2">
            <input
              type="text"
              placeholder={t("name", { defaultValue: "Name" })}
              value={signerForm.name}
              onChange={(e) => setSignerForm((f) => ({ ...f, name: e.target.value }))}
              className="op-input op-input-bordered op-input-sm text-xs"
              required
            />
            <input
              type="email"
              placeholder={t("email", { defaultValue: "Email" })}
              value={signerForm.email}
              onChange={(e) => setSignerForm((f) => ({ ...f, email: e.target.value?.toLowerCase()?.replace(/\s/g, "") }))}
              className="op-input op-input-bordered op-input-sm text-xs"
              required
            />
            <button type="submit" className="op-btn op-btn-sm op-btn-secondary">
              <i className="fa-light fa-plus mr-1" /> {t("add-signer", { defaultValue: "Add signer" })}
            </button>
          </form>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1">
            {t("field-type", { defaultValue: "Field type" })} ({t("placing-for", { defaultValue: "placing for" })}{" "}
            {signers[activeSignerIndex]?.name || "-"})
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
          <p className="text-[11px] text-gray-500 mt-1">
            {t("click-doc-to-place", { defaultValue: "Click on the document to place this field" })}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-1">{t("placed-fields", { defaultValue: "Placed fields" })}</label>
          <div className="max-h-[150px] overflow-y-auto">
            {fields.map((f, index) => (
              <div key={index} className="flex justify-between items-center text-xs px-2 py-1 bg-base-200 rounded mb-1">
                <span>
                  p{f.pageNumber} · {f.fieldType} · {signers[f.stepIndex]?.name}
                </span>
                <i className="fa-light fa-trash cursor-pointer text-red-600" onClick={() => handleRemoveField(index)} />
              </div>
            ))}
          </div>
        </div>

        <button className="op-btn op-btn-primary w-full" disabled={sending} onClick={handleSend}>
          {sending ? t("loading") : t("send", { defaultValue: "Send for signature" })}
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
                  style={{
                    left: `${f.x}%`,
                    top: `${f.y}%`,
                    width: `${f.width}%`,
                    height: `${f.height}%`
                  }}
                >
                  {f.fieldType}
                </div>
              ))}
            </div>
          </Document>
        )}
        {numPages > 1 && (
          <div className="flex flex-row justify-center items-center gap-2 mt-2 text-xs font-medium">
            <button
              className="op-btn op-btn-sm"
              disabled={pageNumber === 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            >
              {t("prev")}
            </button>
            <span>
              {pageNumber} / {numPages}
            </span>
            <button
              className="op-btn op-btn-sm"
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            >
              {t("next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendDocumentPage;
