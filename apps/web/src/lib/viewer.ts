import { cache } from "react";
import { type AppIdentity, lookupAppUser } from "@parvaordo/core";
import { type AuthedUser, getAuthedUser } from "./auth";

export interface Viewer {
  authed: AuthedUser;
  identity: AppIdentity | null;
}

/**
 * The current viewer (auth + app identity), deduped per request via React cache
 * so the layout and the page don't both hit the DB.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const authed = await getAuthedUser();
  if (!authed) return null;
  const identity = await lookupAppUser(authed.email);
  return { authed, identity };
});
