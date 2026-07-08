import { Outlet } from "react-router";
import SessionExpiredModal from "./SessionExpiredModal";
import { getToken, isTokenExpired } from "../api/session";

// Guest-signer routes pass through with no token at all; only an
// expired/invalid stored token should trigger the expired-session modal.
const Validate = () => {
  const token = getToken();
  const isUserValid = !token || !isTokenExpired(token);
  return isUserValid ? <Outlet /> : <SessionExpiredModal />;
};

export default Validate;
