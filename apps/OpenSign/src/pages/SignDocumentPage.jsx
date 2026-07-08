import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import { Document, Page } from "react-pdf";
import { useTranslation } from "react-i18next";
import Alert from "../primitives/Alert";
import Loader from "../primitives/Loader";
import ModalUi from "../primitives/ModalUi";
import { getSignatureRequest, sign, rejectRequest } from "../api/signatures";
import { streamForSigning, getDocumentForSigning, getDocument, viewDocument } from "../api/documents";
import { isAuthenticated } from "../api/session";
import { getCurrentUser } from "../api/account";

const PAGE_WIDTH = 700;

const SignDocumentPage = () => {
  const { requestId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { t } = useTranslation();
  const pageRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "success", msg: "" });
  const [request, setRequest] = useState(null);
  const [docTitle, setDocTitle] = useState("");
  const [fileBlob, setFileBlob] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [signatureData, setSignatureData] = useState("");
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [textFieldValues, setTextFieldValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const showAlert = (type, msg, timer = 3000) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: "success", msg: "" }), timer);
  };

  useEffect(() => {
    (async () => {
      try {
        const detail = await getSignatureRequest(requestId, token);
        setRequest(detail);
        let doc;
        let blob;
        if (token) {
          doc = await getDocumentForSigning(detail.documentId, token);
          blob = await streamForSigning(detail.documentId, token);
        } else {
          const currentUser = await getCurrentUser();
          doc = await getDocument(detail.documentId, currentUser.id);
          blob = await viewDocument(detail.documentId, currentUser.id);
        }
        setDocTitle(doc?.title || "");
        setFileBlob(blob);
        const myStep = detail.steps.find((s) => !s.completed);
        if (myStep?.fields?.length) {
          setPageNumber(myStep.fields[0].pageNumber);
        }
      } catch (err) {
        console.error("Error loading signature request", err);
        showAlert("danger", err.message || t("something-went-wrong-mssg"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, token]);

  if (loading) {
    return (
      <div className="w-full h-[400px] flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="w-full h-[400px] flex flex-col justify-center items-center gap-2">
        <p>{t("something-went-wrong-mssg")}</p>
      </div>
    );
  }

  const myStep = request.steps.find((s) => !s.completed);

  if (completed || !myStep || request.status === "COMPLETED") {
    return (
      <div className="w-full h-[400px] flex flex-col justify-center items-center gap-2">
        <i className="fa-light fa-circle-check text-5xl text-green-600" />
        <p className="text-lg font-semibold">{t("document-signed", { defaultValue: "Document signed" })}</p>
        <p className="text-sm text-gray-500">{t("thank-you", { defaultValue: "Thank you!" })}</p>
      </div>
    );
  }

  if (request.status === "CANCELLED" || request.status === "REJECTED") {
    return (
      <div className="w-full h-[400px] flex flex-col justify-center items-center gap-2">
        <i className="fa-light fa-circle-xmark text-5xl text-red-600" />
        <p className="text-lg font-semibold">
          {request.status === "REJECTED" ? t("document-declined", { defaultValue: "Document declined" }) : t("document-cancelled", { defaultValue: "Document cancelled" })}
        </p>
      </div>
    );
  }

  const myFieldIndexes = myStep.fields.map((f, i) => i).filter((i) => myStep.fields[i].pageNumber === pageNumber);
  const hasSignatureField = myStep.fields.some((f) => f.fieldType === "SIGNATURE" || f.fieldType === "INITIAL");
  const canSubmit = !hasSignatureField || !!signatureData;

  const handleFieldClick = (fieldIndex, fieldType) => {
    if (fieldType === "SIGNATURE" || fieldType === "INITIAL") {
      setTypedSignature(signatureData || myStep.signerName);
      setSignatureModalOpen(true);
    }
  };

  const handleSaveSignature = () => {
    setSignatureData(typedSignature);
    setSignatureModalOpen(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await sign(token, {
        requestId,
        signerId: myStep.signerId,
        signerEmail: myStep.signerEmail,
        signerName: myStep.signerName,
        signatureData,
        signatureType: "TYPED",
        textFieldValues
      });
      setCompleted(true);
    } catch (err) {
      console.error("Error signing", err);
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      await rejectRequest(requestId, token, { signerId: myStep.signerId, reason: rejectReason });
      setRejectOpen(false);
      showAlert("success", t("record-revoke-alert", { defaultValue: "Document declined" }));
      setTimeout(() => navigate(isAuthenticated() ? "/documents" : "/"), 1500);
    } catch (err) {
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 relative">
      {alert.msg && <Alert type={alert.type}>{alert.msg}</Alert>}
      <div className="w-full md:w-[280px] bg-base-100 text-base-content op-card shadow-lg p-3">
        <h2 className="text-lg font-semibold mb-1">{docTitle}</h2>
        <p className="text-xs text-gray-500 mb-3">
          {t("signing-as", { defaultValue: "Signing as" })} {myStep.signerName} ({myStep.signerEmail})
        </p>

        {hasSignatureField && (
          <div className="mb-3">
            <button className="op-btn op-btn-sm op-btn-secondary w-full" onClick={() => setSignatureModalOpen(true)}>
              <i className="fa-light fa-signature mr-1" />
              {signatureData ? t("edit-signature", { defaultValue: "Edit signature" }) : t("add-signature", { defaultValue: "Add your signature" })}
            </button>
            {signatureData && <p className="text-xs mt-1 italic">"{signatureData}"</p>}
          </div>
        )}

        <button className="op-btn op-btn-primary w-full mb-2" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? t("loading") : t("complete-signing", { defaultValue: "Complete signing" })}
        </button>
        <button className="op-btn op-btn-ghost w-full text-red-600" onClick={() => setRejectOpen(true)}>
          {t("decline", { defaultValue: "Decline to sign" })}
        </button>
      </div>

      <div className="flex-1 bg-base-100 op-card shadow-lg p-3 flex flex-col items-center">
        {fileBlob && (
          <Document file={fileBlob} onLoadSuccess={({ numPages: n }) => setNumPages(n)}>
            <div ref={pageRef} className="relative inline-block">
              <Page pageNumber={pageNumber} width={PAGE_WIDTH} renderAnnotationLayer={false} renderTextLayer={false} />
              {myFieldIndexes.map((fieldIndex) => {
                const f = myStep.fields[fieldIndex];
                const style = {
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  width: `${f.width}%`,
                  height: `${f.height}%`
                };
                if (f.fieldType === "SIGNATURE" || f.fieldType === "INITIAL") {
                  return (
                    <div
                      key={fieldIndex}
                      className="absolute border-2 border-primary bg-primary/10 flex items-center justify-center text-[11px] italic cursor-pointer overflow-hidden"
                      style={style}
                      onClick={() => handleFieldClick(fieldIndex, f.fieldType)}
                    >
                      {signatureData || t("click-to-sign", { defaultValue: "Click to sign" })}
                    </div>
                  );
                }
                if (f.fieldType === "DATE") {
                  return (
                    <div key={fieldIndex} className="absolute border-2 border-primary bg-primary/10 flex items-center justify-center text-[11px]" style={style}>
                      {new Date().toISOString().slice(0, 10)}
                    </div>
                  );
                }
                if (f.fieldType === "TEXT") {
                  return (
                    <input
                      key={fieldIndex}
                      type="text"
                      className="absolute border-2 border-primary text-[11px] px-1"
                      style={style}
                      value={textFieldValues[fieldIndex] || ""}
                      onChange={(e) => setTextFieldValues((prev) => ({ ...prev, [fieldIndex]: e.target.value }))}
                    />
                  );
                }
                if (f.fieldType === "CHECKBOX") {
                  return (
                    <div key={fieldIndex} className="absolute border-2 border-primary bg-primary/10 flex items-center justify-center" style={style}>
                      <input
                        type="checkbox"
                        checked={textFieldValues[fieldIndex] === "true"}
                        onChange={(e) =>
                          setTextFieldValues((prev) => ({ ...prev, [fieldIndex]: e.target.checked ? "true" : "false" }))
                        }
                      />
                    </div>
                  );
                }
                return null;
              })}
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

      <ModalUi isOpen={signatureModalOpen} title={t("add-signature", { defaultValue: "Add your signature" })} handleClose={() => setSignatureModalOpen(false)}>
        <div className="px-4 py-3">
          <label className="block text-xs font-semibold mb-1">{t("type-your-name", { defaultValue: "Type your name" })}</label>
          <input
            type="text"
            value={typedSignature}
            onChange={(e) => setTypedSignature(e.target.value)}
            className="op-input op-input-bordered op-input-sm w-full italic"
            style={{ fontFamily: "cursive", fontSize: "18px" }}
          />
          <button className="op-btn op-btn-primary w-full mt-3" onClick={handleSaveSignature} disabled={!typedSignature}>
            {t("save", { defaultValue: "Save" })}
          </button>
        </div>
      </ModalUi>

      <ModalUi isOpen={rejectOpen} title={t("decline", { defaultValue: "Decline to sign" })} handleClose={() => setRejectOpen(false)}>
        <div className="px-4 py-3">
          <label className="block text-xs font-semibold mb-1">{t("reason", { defaultValue: "Reason" })}</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="op-textarea op-textarea-bordered op-textarea-sm w-full"
            rows={3}
          />
          <button className="op-btn op-btn-primary w-full mt-3" onClick={handleReject} disabled={!rejectReason || submitting}>
            {t("submit", { defaultValue: "Submit" })}
          </button>
        </div>
      </ModalUi>
    </div>
  );
};

export default SignDocumentPage;
