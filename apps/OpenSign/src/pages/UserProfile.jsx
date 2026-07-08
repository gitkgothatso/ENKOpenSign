import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import dp from "../assets/images/dp.png";
import Loader from "../primitives/Loader";
import { useTranslation } from "react-i18next";
import SelectLanguage from "../components/pdf/SelectLanguage";
import { getCurrentUser, updateProfile } from "../api/account";

function UserProfile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [editmode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoader, setIsLoader] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        setUser(res);
        setFirstName(res.firstName);
        setLastName(res.lastName);
      })
      .catch(() => alert(t("something-went-wrong-mssg")))
      .finally(() => setIsLoader(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoader(true);
    try {
      const res = await updateProfile(user.id, { firstName, lastName });
      setUser(res);
      localStorage.setItem("username", `${res.firstName} ${res.lastName}`.trim());
      alert(t("profile-update-alert"));
      setEditMode(false);
    } catch (error) {
      console.error("Error while updating profile", error);
      alert(t("something-went-wrong-mssg"));
    } finally {
      setIsLoader(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
  };

  if (isLoader) {
    return (
      <div className="h-[100vh] flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="flex justify-center items-center w-full relative">
        <div className="bg-base-100 text-base-content flex flex-col justify-center shadow-md rounded-box w-[450px]">
          <div className="flex flex-col justify-center items-center my-4">
            <div className="w-[200px] h-[200px] overflow-hidden rounded-full">
              <img className="object-contain w-full h-full" src={dp} alt="dp" />
            </div>
          </div>
          <ul className="w-full flex flex-col p-2 text-sm">
            <li
              className={`flex justify-between items-center border-y-[1px] border-gray-300 break-all ${
                editmode ? "py-1.5" : "py-2"
              }`}
            >
              <span className="font-semibold">{t("name")}:</span>{" "}
              {editmode ? (
                <input
                  type="text"
                  value={firstName}
                  className="op-input op-input-bordered op-input-sm w-[180px] focus:outline-none hover:border-base-content text-sm"
                  onChange={(e) => setFirstName(e.target.value)}
                />
              ) : (
                <span>{user?.firstName}</span>
              )}
            </li>
            <li
              className={`flex justify-between items-center border-b-[1px] border-gray-300 break-all ${
                editmode ? "py-1.5" : "py-2"
              }`}
            >
              <span className="font-semibold">{t("last-name", { defaultValue: "Last name" })}:</span>{" "}
              {editmode ? (
                <input
                  type="text"
                  value={lastName}
                  className="op-input op-input-bordered op-input-sm w-[180px] focus:outline-none hover:border-base-content text-sm"
                  onChange={(e) => setLastName(e.target.value)}
                />
              ) : (
                <span>{user?.lastName}</span>
              )}
            </li>
            <li className="flex justify-between items-center border-b-[1px] border-gray-300 py-2 break-all">
              <span className="font-semibold">{t("email")}:</span>
              <span>{user?.email}</span>
            </li>
            <li
              className={`flex justify-between items-center border-b-[1px] border-gray-300 break-all ${
                editmode ? "py-1.5" : "py-2"
              }`}
            >
              <span className="font-semibold">{t("language")}:</span>{" "}
              <SelectLanguage isProfile={true} />
            </li>
          </ul>
          <div className="flex flex-col md:flex-row justify-center gap-2 pt-2 pb-3 md:pt-3 md:pb-4 mx-2 md:mx-0">
            <button
              type="button"
              onClick={(e) => (editmode ? handleSubmit(e) : setEditMode(true))}
              className="op-btn op-btn-primary md:w-[100px]"
            >
              {editmode ? t("save") : t("edit")}
            </button>
            <button
              type="button"
              onClick={() => (editmode ? handleCancel() : navigate("/changepassword"))}
              className={`op-btn ${editmode ? "op-btn-ghost w-[100px]" : "op-btn-secondary"}`}
            >
              {editmode ? t("cancel") : t("change-password")}
            </button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

export default UserProfile;
