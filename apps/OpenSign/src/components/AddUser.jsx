import { useState } from "react";
import Loader from "../primitives/Loader";
import { emailRegex } from "../constant/const";
import { useTranslation } from "react-i18next";
import { inviteToOrganization } from "../api/organizations";
import { getCurrentUser } from "../api/account";

const AddUser = (props) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isFormLoader, setIsFormLoader] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailRegex.test(email)) {
      alert(t("valid-email-alert"));
      return;
    }
    setIsFormLoader(true);
    try {
      const currentUser = await getCurrentUser();
      const org = await props.getOrg();
      await inviteToOrganization(org.id, {
        inviterId: currentUser.id,
        inviteeEmail: email
      });
      if (props.closePopup) props.closePopup();
      if (props.onInvited) props.onInvited();
      setEmail("");
      props.showAlert("success", t("invitation-sent") || "Invitation sent");
    } catch (err) {
      console.error("err", err);
      props.showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setIsFormLoader(false);
    }
  };

  const handleReset = () => {
    setEmail("");
    if (props.closePopup) props.closePopup();
  };

  return (
    <div className="shadow-md rounded-box my-[1px] p-3 bg-base-100 relative">
      {isFormLoader && (
        <div className="absolute w-full h-full inset-0 flex justify-center items-center bg-base-content/30 z-50">
          <Loader />
        </div>
      )}
      <div className="w-full mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="block text-xs font-semibold">
              {t("email")}
              <span className="text-[red] text-[13px]"> *</span>
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value?.toLowerCase()?.replace(/\s/g, ""))}
              required
              onInvalid={(e) => e.target.setCustomValidity(t("input-required"))}
              onInput={(e) => e.target.setCustomValidity("")}
              className="op-input op-input-bordered op-input-sm focus:outline-none hover:border-base-content w-full text-xs"
              placeholder={t("enter-email")}
            />
          </div>
          <div className="flex items-center mt-3 gap-2 text-white">
            <button type="submit" className="op-btn op-btn-primary">
              {t("submit")}
            </button>
            <div type="button" onClick={handleReset} className="op-btn op-btn-secondary">
              {t("cancel")}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUser;
