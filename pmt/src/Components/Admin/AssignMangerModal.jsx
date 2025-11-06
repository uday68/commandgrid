import React, { useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";

const AssignManagerModal = ({ projectId, onClose }) => {
  const { t } = useTranslation();
  const [managerId, setManagerId] = useState("");
  const [message, setMessage] = useState("");

  const handleAssign = async () => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await axios.put(
        `/api/project/${projectId}/assign-manager`,
        { managerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(t("project.managerAssignSuccess"));
      onClose();
    } catch (err) {
      setMessage(t("project.managerAssignError"));
      console.error(err);
    }
  };

  return (
    <div className="modal">
      <h2>{t("project.assignManager")}</h2>
      <input
        type="text"
        placeholder={t("project.enterManagerId")}
        value={managerId}
        onChange={(e) => setManagerId(e.target.value)}
      />
      <button onClick={handleAssign}>{t("common.assign")}</button>
      {message && <p>{message}</p>}
      <button onClick={onClose}>{t("common.close")}</button>
    </div>
  );
};

export default AssignManagerModal;
