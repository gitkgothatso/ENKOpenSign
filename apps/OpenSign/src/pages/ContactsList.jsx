import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Alert from "../primitives/Alert";
import Loader from "../primitives/Loader";
import ModalUi from "../primitives/ModalUi";
import pad from "../assets/images/pad.svg";
import { emailRegex } from "../constant/const";
import { getCurrentUser } from "../api/account";
import { listContacts, createContact, updateContact, deleteContact } from "../api/contacts";

const emptyForm = { name: "", email: "", phone: "" };

const ContactsList = () => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "success", msg: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rowLoading, setRowLoading] = useState({});

  const showAlert = (type, msg, timer = 2000) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert({ type: "success", msg: "" }), timer);
  };

  const fetchContacts = async (uid, searchArg) => {
    setLoading(true);
    try {
      const res = await listContacts(uid, searchArg);
      setContacts(res);
    } catch (err) {
      console.error("Error fetching contacts", err);
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setUserId(user.id);
        return fetchContacts(user.id, "");
      })
      .catch((err) => {
        console.error("Error fetching current user", err);
        showAlert("danger", t("something-went-wrong-mssg"));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchContacts(userId, search);
  };

  const openCreateForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEditForm = (contact) => {
    setForm({ name: contact.name, email: contact.email, phone: contact.phone || "" });
    setEditingId(contact.id);
    setFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!emailRegex.test(form.email)) {
      alert(t("valid-email-alert"));
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateContact(editingId, userId, form);
        showAlert("success", t("record-updated", { defaultValue: "Contact updated" }));
      } else {
        await createContact({ ownerId: userId, ...form });
        showAlert("success", t("contact-created", { defaultValue: "Contact created" }));
      }
      setFormOpen(false);
      fetchContacts(userId, search);
    } catch (err) {
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const contact = deleteTarget;
    setDeleteTarget(null);
    setRowLoading((prev) => ({ ...prev, [contact.id]: true }));
    try {
      await deleteContact(contact.id, userId);
      showAlert("success", t("record-delete-alert", { defaultValue: "Contact deleted" }));
      fetchContacts(userId, search);
    } catch (err) {
      showAlert("danger", err.message || t("something-went-wrong-mssg"));
    } finally {
      setRowLoading((prev) => {
        const next = { ...prev };
        delete next[contact.id];
        return next;
      });
    }
  };

  return (
    <div className="relative">
      <div className="p-2 w-full bg-base-100 text-base-content op-card shadow-lg">
        {alert.msg && <Alert type={alert.type}>{alert.msg}</Alert>}
        <div className="flex flex-row items-center justify-between my-2 mx-3 text-[20px] md:text-[23px]">
          <div className="font-light">{t("report-name.Contacts", { defaultValue: "Contacts" })}</div>
          <button className="op-btn op-btn-primary op-btn-sm" onClick={openCreateForm}>
            <i className="fa-light fa-user-plus mr-1" /> {t("add", { defaultValue: "Add" })}
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="mx-3 mb-3 flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search", { defaultValue: "Search contacts" })}
            className="op-input op-input-bordered op-input-sm w-64 text-xs"
          />
          <button type="submit" className="op-btn op-btn-sm op-btn-secondary">
            {t("search", { defaultValue: "Search" })}
          </button>
        </form>

        {loading ? (
          <div className="w-full h-[300px] flex justify-center items-center">
            <Loader />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="op-table border-collapse w-full mb-4">
              <thead className="text-[14px]">
                <tr className="border-y-[1px]">
                  <th className="p-2">{t("report-heading.Sr.No", { defaultValue: "#" })}</th>
                  <th className="p-2">{t("name", { defaultValue: "Name" })}</th>
                  <th className="p-2">{t("email", { defaultValue: "Email" })}</th>
                  <th className="p-2">{t("phone", { defaultValue: "Phone" })}</th>
                  <th className="p-2 text-transparent pointer-events-none">{t("action")}</th>
                </tr>
              </thead>
              <tbody className="text-[12px]">
                {contacts.map((contact, index) => (
                  <tr className="border-y-[1px]" key={contact.id}>
                    <td className="p-2">{index + 1}</td>
                    <td className="p-2 font-semibold">{contact.name}</td>
                    <td className="p-2">{contact.email}</td>
                    <td className="p-2">{contact.phone || "-"}</td>
                    <td className="p-2">
                      <div className="flex flex-row gap-2 items-center min-w-max">
                        {rowLoading[contact.id] ? (
                          <span className="op-loading op-loading-spinner op-loading-sm" />
                        ) : (
                          <>
                            <button
                              className="op-btn op-btn-sm op-btn-ghost"
                              title={t("edit", { defaultValue: "Edit" })}
                              onClick={() => openEditForm(contact)}
                            >
                              <i className="fa-light fa-pen" />
                            </button>
                            <button
                              className="op-btn op-btn-sm op-btn-ghost text-red-600"
                              title={t("delete", { defaultValue: "Delete" })}
                              onClick={() => setDeleteTarget(contact)}
                            >
                              <i className="fa-light fa-trash" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contacts.length === 0 && (
              <div className="flex flex-col items-center justify-center w-full py-6">
                <img className="w-[60px] h-[60px] object-contain" src={pad} alt="empty" />
                <div className="text-sm font-semibold mt-2">{t("no-data-available")}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <ModalUi isOpen={!!deleteTarget} title={t("delete", { defaultValue: "Delete contact" })} handleClose={() => setDeleteTarget(null)}>
        <div className="m-[20px]">
          <div className="text-lg font-normal text-base-content">
            {t("delete-document-alert", { defaultValue: "Are you sure you want to delete this?" })}
          </div>
          <hr className="bg-[#ccc] mt-4" />
          <div className="flex items-center mt-3 gap-2 text-white">
            <button onClick={handleDelete} className="op-btn op-btn-primary">
              {t("yes")}
            </button>
            <button onClick={() => setDeleteTarget(null)} className="op-btn op-btn-secondary">
              {t("no")}
            </button>
          </div>
        </div>
      </ModalUi>

      <ModalUi
        isOpen={formOpen}
        title={editingId ? t("edit", { defaultValue: "Edit contact" }) : t("add", { defaultValue: "Add contact" })}
        handleClose={() => setFormOpen(false)}
        isLoader={saving}
      >
        <form onSubmit={handleFormSubmit} className="px-4 py-3">
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">{t("name", { defaultValue: "Name" })}</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="op-input op-input-bordered op-input-sm w-full text-xs"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">{t("email", { defaultValue: "Email" })}</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value?.toLowerCase()?.replace(/\s/g, "") }))}
              className="op-input op-input-bordered op-input-sm w-full text-xs"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1">{t("phone", { defaultValue: "Phone" })}</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="op-input op-input-bordered op-input-sm w-full text-xs"
            />
          </div>
          <button type="submit" className="op-btn op-btn-primary w-full">
            {t("submit", { defaultValue: "Save" })}
          </button>
        </form>
      </ModalUi>
    </div>
  );
};

export default ContactsList;
