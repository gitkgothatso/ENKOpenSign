import { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { openInNewTab } from "../constant/Utils";
import Loader from "../primitives/Loader";
import { useTranslation } from "react-i18next";
import { emailRegex } from "../constant/const";
import { register } from "../api/auth";

const AddAdmin = () => {
  const appName = "OpenSign™";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [lengthValid, setLengthValid] = useState(false);
  const [caseDigitValid, setCaseDigitValid] = useState(false);
  const [specialCharValid, setSpecialCharValid] = useState(false);
  const [isAuthorize, setIsAuthorize] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrMsg("");
    if (!emailRegex.test(email)) {
      alert(t("valid-email-alert"));
      return;
    }
    if (!(lengthValid && caseDigitValid && specialCharValid)) {
      return;
    }
    const normalizedEmail = email?.toLowerCase()?.replace(/\s/g, "");
    setLoading(true);
    try {
      await register({
        email: normalizedEmail,
        username: normalizedEmail,
        password,
        firstName,
        lastName
      });
      navigate("/", {
        state: { registered: true }
      });
      alert(t("registered-user-successfully"));
    } catch (error) {
      console.error("err ", error);
      setErrMsg(error.message || t("something-went-wrong-mssg"));
    } finally {
      setLoading(false);
    }
  };
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setLengthValid(newPassword.length >= 8);
    setCaseDigitValid(
      /[a-z]/.test(newPassword) &&
        /[A-Z]/.test(newPassword) &&
        /\d/.test(newPassword)
    );
    setSpecialCharValid(/[!@#$%^&*()\-_=+{};:,<.>]/.test(newPassword));
  };
  return (
    <div className="h-screen flex justify-center">
      {loading ? (
        <div className="text-[grey] flex justify-center items-center text-lg md:text-2xl">
          <Loader />
        </div>
      ) : (
        <div className="w-[95%] md:w-[500px]">
          <form onSubmit={handleSubmit}>
            <div className="w-full my-4 op-card bg-base-100 shadow-md outline outline-1 outline-slate-300/50">
              <h2 className="text-[30px] text-center mt-3 font-medium">
                {t("opensign-setup", { appName })}
              </h2>
              {errMsg && (
                <div className="text-center text-xs text-[red] mt-2">
                  {errMsg}
                </div>
              )}
              <div className="px-6 py-3 text-xs">
                <label className="block ">
                  {t("name")} <span className="text-[red] text-[13px]">*</span>
                </label>
                <input
                  type="text"
                  className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
                  onInput={(e) => e.target.setCustomValidity("")}
                  required
                />
                <hr className="my-2 border-none" />
                <label>
                  {t("last-name") || "Last name"}{" "}
                  <span className="text-[red] text-[13px]">*</span>
                </label>
                <input
                  type="text"
                  className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
                  onInput={(e) => e.target.setCustomValidity("")}
                  required
                />
                <hr className="my-2 border-none" />
                <label>
                  {"email"} <span className="text-[red] text-[13px]">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                  value={email}
                  onChange={(e) => setEmail(e.target.value?.toLowerCase()?.replace(/\s/g, ""))}
                  onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
                  onInput={(e) => e.target.setCustomValidity("")}
                  required
                />
                <hr className="my-2 border-none" />
                <label>
                  {t("password")}
                  <span className="text-[red] text-[13px]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                    name="password"
                    value={password}
                    onChange={handlePasswordChange}
                    onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
                    onInput={(e) => e.target.setCustomValidity("")}
                    required
                  />
                  <span
                    className="absolute top-[50%] right-[10px] -translate-y-[50%] cursor-pointer text-base-content"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <i className="fa fa-eye-slash" />
                    ) : (
                      <i className="fa fa-eye" />
                    )}
                  </span>
                </div>
                {password.length > 0 && (
                  <div className="mt-1 text-[11px]">
                    <p className={lengthValid ? "text-green-600" : "text-red-600"}>
                      {lengthValid ? "✓" : "✗"} {t("password-length")}
                    </p>
                    <p className={caseDigitValid ? "text-green-600" : "text-red-600"}>
                      {caseDigitValid ? "✓" : "✗"} {t("password-case")}
                    </p>
                    <p className={specialCharValid ? "text-green-600" : "text-red-600"}>
                      {specialCharValid ? "✓" : "✗"} {t("password-special-char")}
                    </p>
                  </div>
                )}
                <div className="mt-2.5 ml-1 flex flex-row items-center">
                  <input
                    type="checkbox"
                    className="op-checkbox op-checkbox-sm"
                    id="termsandcondition"
                    checked={isAuthorize}
                    onChange={(e) => setIsAuthorize(e.target.checked)}
                    required
                  />
                  <label className="text-xs cursor-pointer ml-1 mb-0" htmlFor="termsandcondition">
                    {t("agree")}
                  </label>
                  <span
                    className="underline cursor-pointer ml-1"
                    onClick={() => openInNewTab("https://www.opensignlabs.com/terms-and-conditions")}
                  >
                    {t("term")}
                  </span>
                  <span>.</span>
                </div>
              </div>
              <div className="mx-4 text-center text-xs font-bold mb-3">
                <button type="submit" className="op-btn op-btn-primary w-full" disabled={loading || !isAuthorize}>
                  {loading ? t("loading") : t("next")}
                </button>
              </div>
              <div className="text-center text-xs mb-4">
                <NavLink to="/" className="op-link op-link-primary">
                  {t("login")}
                </NavLink>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AddAdmin;
