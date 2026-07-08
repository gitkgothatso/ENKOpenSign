import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import login_img from "../assets/images/login_img.svg";
import { useWindowSize } from "../hook/useWindowSize";
import { emailRegex } from "../constant/const";
import Alert from "../primitives/Alert";
import { appInfo } from "../constant/appinfo";
import Loader from "../primitives/Loader";
import { useTranslation } from "react-i18next";
import SelectLanguage from "../components/pdf/SelectLanguage";
import { login as loginRequest } from "../api/auth";
import { getCurrentUser } from "../api/account";
import { setToken } from "../api/httpClient";
import { isAuthenticated } from "../api/session";

const DEFAULT_LANDING = "/documents";

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { width } = useWindowSize();
  const [state, setState] = useState({
    email: "",
    password: "",
    alertType: "success",
    alertMsg: "",
    passwordVisible: false,
    loading: false
  });

  useEffect(() => {
    if (isAuthenticated()) {
      const redirectUrl = location?.state?.from || DEFAULT_LANDING;
      navigate(redirectUrl);
    }
    // eslint-disable-next-line
  }, []);

  const showToast = (type, msg) => {
    setState((prev) => ({ ...prev, loading: false, alertType: type, alertMsg: msg }));
    setTimeout(() => setState((prev) => ({ ...prev, alertMsg: "" })), 2000);
  };

  const handleChange = (event) => {
    let { name, value } = event.target;
    if (name === "email") {
      value = value?.toLowerCase()?.replace(/\s/g, "");
    }
    setState({ ...state, [name]: value });
  };

  const handleLogin = async () => {
    const { email, password } = state;
    if (!email || !password) {
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const { id_token } = await loginRequest({ username: email, password });
      setToken(id_token);
      const user = await getCurrentUser();
      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.setItem("username", `${user.firstName} ${user.lastName}`.trim());
      localStorage.setItem("userEmail", user.email);
      const redirectUrl = location?.state?.from || DEFAULT_LANDING;
      navigate(redirectUrl);
    } catch (error) {
      console.error("Error while logging in user", error);
      showToast("danger", t("invalid-username-password-region"));
    }
  };

  const handleLoginBtn = async (event) => {
    event.preventDefault();
    if (!emailRegex.test(state.email)) {
      alert(t("valid-email-alert"));
      return;
    }
    await handleLogin();
  };

  const togglePasswordVisibility = () => {
    setState({ ...state, passwordVisible: !state.passwordVisible });
  };

  return (
    <>
      {state.loading && (
        <div
          aria-live="assertive"
          className="fixed w-full h-full flex justify-center items-center bg-black bg-opacity-30 z-50"
        >
          <Loader />
        </div>
      )}
      <div
        aria-labelledby="loginHeading"
        role="region"
        className="pb-1 md:pb-4 pt-10 md:px-10 lg:px-16 h-full"
      >
        <div className="md:p-4 lg:p-10 p-4 bg-base-100 text-base-content op-card">
          <div className="w-[250px] h-[66px] inline-block overflow-hidden">
            <img
              src={appInfo?.applogo}
              className="object-contain h-full"
              alt="applogo"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2">
            <div>
              <form onSubmit={handleLoginBtn} aria-label="Login Form">
                <h1 className="text-[30px] mt-6">{t("welcome")}</h1>
                <fieldset>
                  <legend className="text-[12px] text-[#878787]">
                    {t("Login-to-your-account")}
                  </legend>
                  <div className="w-full px-6 py-3 my-1 op-card bg-base-100 shadow-md outline outline-1 outline-slate-300/50">
                    <label className="block text-xs" htmlFor="email">
                      {t("email")}
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                      name="email"
                      autoComplete="username"
                      value={state.email}
                      onChange={handleChange}
                      required
                      onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
                      onInput={(e) => e.target.setCustomValidity("")}
                    />
                    <hr className="my-1 border-none" />
                    <label className="block text-xs" htmlFor="password">
                      {t("password")}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={state.passwordVisible ? "text" : "password"}
                        className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
                        name="password"
                        value={state.password}
                        autoComplete="current-password"
                        onChange={handleChange}
                        onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
                        onInput={(e) => e.target.setCustomValidity("")}
                        required
                      />
                      <span
                        className="absolute cursor-pointer top-[50%] right-[10px] -translate-y-[50%] text-base-content"
                        onClick={togglePasswordVisibility}
                      >
                        {state.passwordVisible ? (
                          <i className="fa-light fa-eye-slash text-xs pb-1" />
                        ) : (
                          <i className="fa-light fa-eye text-xs pb-1 " />
                        )}
                      </span>
                    </div>
                    <div className="relative mt-1 flex justify-between">
                      <NavLink
                        to="/forgetpassword"
                        className="text-[13px] op-link op-link-primary underline-offset-1 focus:outline-none ml-1"
                      >
                        {t("forgot-password")}?
                      </NavLink>
                      <NavLink
                        to="/addadmin"
                        className="text-[13px] op-link op-link-primary underline-offset-1 focus:outline-none ml-1"
                      >
                        {t("create-account", { defaultValue: "Create account" })}
                      </NavLink>
                    </div>
                  </div>
                </fieldset>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-center text-xs font-bold mt-2">
                  <button type="submit" className="op-btn op-btn-primary" disabled={state.loading}>
                    {state.loading ? t("loading") : t("login")}
                  </button>
                </div>
              </form>
            </div>
            {width >= 768 && (
              <div className="place-self-center">
                <div className="mx-auto md:w-[300px] lg:w-[400px] xl:w-[500px]">
                  <img
                    src={login_img}
                    alt="The image illustrates a person from behind, seated at a desk with a four-monitor computer setup, in an environment with a light blue and white color scheme, featuring a potted plant to the right."
                    width="100%"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <SelectLanguage />
        {state.alertMsg && <Alert type={state.alertType}>{state.alertMsg}</Alert>}
      </div>
    </>
  );
}
export default Login;
