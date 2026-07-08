import { sessionStatus } from "../redux/reducers/userReducer";
import { store } from "../redux/store";
import { isAuthenticated } from "../api/session";

export function withSessionValidation(fn) {
  return async (...args) => {
    try {
      if (!isAuthenticated()) {
        store.dispatch(sessionStatus(false));
        throw new Error("invalid session token");
      }

      return await fn(...args);
    } catch (error) {
      if (error?.message === "invalid session token") {
        console.error("invalid session", error);
        store.dispatch(sessionStatus(false));
        return;
      } else {
        throw error; // important: don't silently swallow errors
      }
    }
  };
}
