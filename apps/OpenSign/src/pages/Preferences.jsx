import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Alert from "../primitives/Alert";
import Loader from "../primitives/Loader";
import TimezoneSelector from "../components/preferences/TimezoneSelector";
import DateFormatSelector from "../components/preferences/DateFormatSelector";
import { getCurrentUser, getPreferences, updatePreferences } from "../api/account";
import { listSavedSignatures } from "../api/signatures";

const Preferences = () => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: "success", msg: "" });
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [timezone, setTimezone] = useState("");
  const [defaultSignatureId, setDefaultSignatureId] = useState("");
  const [savedSignatures, setSavedSignatures] = useState([]);

  const showAlert = (type, msg, timer = 2000) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: "success", msg: "" }), timer);
  };

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        setUserId(user.id);
        const [prefs, signatures] = await Promise.all([
          getPreferences(user.id),
          listSavedSignatures(user.id)
        ]);
        setDateFormat(prefs.dateFormat || "MM/DD/YYYY");
        setTimezone(prefs.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        setDefaultSignatureId(prefs.defaultSignatureId || "");
        setSavedSignatures(signatures);
      } catch (err) {
        console.error("Error loading preferences", err);
        showAlert("danger", err.message || t("something-went-wrong-mssg"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences(userId, { dateFormat, timezone, defaultSignatureId: defaultSignatureId || undefined });
      showAlert("success", t("preferences-updated", { defaultValue: "Preferences updated" }));
    } catch (err) {
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[300px] flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-2 w-full bg-base-100 text-base-content op-card shadow-lg">
      {alert.msg && <Alert type={alert.type}>{alert.msg}</Alert>}
      <div className="font-light text-[20px] md:text-[23px] my-2 mx-3">{t("preferences", { defaultValue: "Preferences" })}</div>

      <div className="mx-3 flex flex-col gap-4 mb-4">
        <TimezoneSelector timezone={timezone} setTimezone={setTimezone} />
        <DateFormatSelector dateFormat={dateFormat} setDateFormat={setDateFormat} />

        <div className="max-w-[400px]">
          <label className="text-[14px] mb-[0.7rem] font-medium block">
            {t("default-signature", { defaultValue: "Default signature" })}
          </label>
          <select
            value={defaultSignatureId}
            onChange={(e) => setDefaultSignatureId(e.target.value)}
            className="op-select op-select-bordered op-select-sm w-full text-xs"
          >
            <option value="">{t("none", { defaultValue: "None" })}</option>
            {savedSignatures.map((sig) => (
              <option key={sig.id} value={sig.id}>
                {sig.type} {sig.isDefault ? `(${t("default", { defaultValue: "default" })})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mx-3 mb-4">
        <button className="op-btn op-btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? t("loading") : t("save", { defaultValue: "Save" })}
        </button>
      </div>
    </div>
  );
};

export default Preferences;
