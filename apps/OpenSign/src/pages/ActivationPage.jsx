import { useEffect, useState } from "react";
import { useSearchParams, NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import Loader from "../primitives/Loader";
import { activate } from "../api/auth";

const ActivationPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const key = searchParams.get("key");
    if (!key) {
      setStatus("error");
      return;
    }
    activate(key)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "loading") {
    return (
      <div className="h-screen flex flex-col justify-center items-center gap-4">
        <Loader />
        <p className="text-sm text-gray-500">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex justify-center items-center">
      <div className="w-[95%] md:w-[450px] op-card bg-base-100 shadow-md outline outline-1 outline-slate-300/50 p-8 text-center">
        {status === "success" ? (
          <>
            <h1 className="text-xl font-semibold text-green-600 mb-2">
              {t("account-activated", { defaultValue: "Account activated" })}
            </h1>
            <p className="text-sm text-gray-500 mb-4">
              {t("account-activated-mssg", {
                defaultValue: "Your account has been activated. You can now log in."
              })}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-red-600 mb-2">
              {t("activation-failed", { defaultValue: "Activation failed" })}
            </h1>
            <p className="text-sm text-gray-500 mb-4">
              {t("activation-failed-mssg", {
                defaultValue: "This activation link is invalid or has expired."
              })}
            </p>
          </>
        )}
        <NavLink to="/" className="op-btn op-btn-primary">
          {t("login")}
        </NavLink>
      </div>
    </div>
  );
};

export default ActivationPage;
