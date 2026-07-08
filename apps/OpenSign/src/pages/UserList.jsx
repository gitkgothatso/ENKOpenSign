import React, { useEffect, useState } from "react";
import Alert from "../primitives/Alert";
import Loader from "../primitives/Loader";
import ModalUi from "../primitives/ModalUi";
import pad from "../assets/images/pad.svg";
import AddUser from "../components/AddUser";
import { useTranslation } from "react-i18next";
import { getMyOrganization } from "../api/organizations";
import { getCurrentUser } from "../api/account";

const heading = ["Sr.No", "Name", "Email", "Owner"];

const UserList = () => {
  const { t } = useTranslation();
  const [org, setOrg] = useState(null);
  const [isLoader, setIsLoader] = useState(true);
  const [isFormModal, setIsFormModal] = useState(false);
  const [isAlert, setIsAlert] = useState({ type: "success", msg: "" });

  const fetchOrg = async () => {
    setIsLoader(true);
    try {
      const currentUser = await getCurrentUser();
      const res = await getMyOrganization(currentUser.id);
      setOrg(res);
      return res;
    } catch (err) {
      console.log("Err in fetch organization", err);
      showAlert("danger", t("something-went-wrong-mssg"));
      return null;
    } finally {
      setIsLoader(false);
    }
  };

  useEffect(() => {
    fetchOrg();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showAlert = (type, msg, timer = 1500) => {
    setIsAlert({ type, msg });
    setTimeout(() => setIsAlert({ type: "success", msg: "" }), timer);
  };

  if (isLoader) {
    return (
      <div className="w-full h-[300px] md:h-[400px] flex justify-center items-center">
        <Loader />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-base-100 text-base-content rounded-box">
        <div className="text-center">
          <h1 className="text-[60px] lg:text-[120px] font-semibold">404</h1>
          <p className="text-[30px] lg:text-[50px]">{t("page-not-found")}</p>
        </div>
      </div>
    );
  }

  const members = org.members || [];

  return (
    <div className="relative">
      <div className="p-2 w-full bg-base-100 text-base-content op-card shadow-lg">
        {isAlert.msg && <Alert type={isAlert.type}>{isAlert.msg}</Alert>}
        <div className="flex flex-row items-center justify-between my-2 mx-3 text-[20px] md:text-[23px]">
          <div className="font-light">{t("report-name.Users")}</div>
          {org.isCurrentUserOwner && (
            <div className="cursor-pointer" onClick={() => setIsFormModal(true)}>
              <i className="fa-light fa-square-plus text-accent text-[30px] md:text-[40px]"></i>
            </div>
          )}
        </div>
        <div className="w-full overflow-x-auto">
          <table className="op-table border-collapse w-full mb-[50px]">
            <thead className="text-[14px]">
              <tr className="border-y-[1px]">
                {heading.map((item, index) => (
                  <th key={index} className="px-4 py-2">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            {members.length > 0 && (
              <tbody className="text-[12px]">
                {members.map((item, index) => (
                  <tr className="border-y-[1px]" key={item.id}>
                    <th className="px-4 py-2">{index + 1}</th>
                    <td className="px-4 py-2 font-semibold">{item.name}</td>
                    <td className="px-4 py-2">{item.email}</td>
                    <td className="px-4 py-2">{item.isOwner ? t("yes") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {members.length === 0 && (
          <div className="flex flex-col items-center justify-center w-full bg-base-100 text-base-content rounded-xl py-4">
            <div className="w-[60px] h-[60px] overflow-hidden">
              <img className="w-full h-full object-contain" src={pad} alt="img" />
            </div>
            <div className="text-sm font-semibold">{t("no-data-available")}</div>
          </div>
        )}
        <ModalUi
          isOpen={isFormModal}
          title={t("add-user")}
          handleClose={() => setIsFormModal(false)}
        >
          <AddUser
            showAlert={showAlert}
            getOrg={() => org}
            onInvited={fetchOrg}
            closePopup={() => setIsFormModal(false)}
          />
        </ModalUi>
      </div>
    </div>
  );
};

export default UserList;
