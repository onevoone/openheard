import { m } from "@openheard/i18n/messages";

// Labels are callbacks so they are worded while rendering, in the visitor's language.
export const SETTINGS_NAV = [
  { id: "personal", group: () => m.settings_nav_personal(), items: [["profile", () => m.settings_nav_profile()], ["billing", () => m.settings_nav_billing()], ["notifications", () => m.settings_nav_notifications()]] },
  { id: "workspace", group: () => m.settings_nav_workspace(), items: [["general", () => m.settings_nav_general()], ["branding", () => m.settings_nav_branding()], ["access", () => m.settings_nav_access()], ["team", () => m.settings_nav_team()]] },
  { id: "product", group: () => m.settings_nav_product(), items: [["public-board", () => m.settings_nav_public_board()], ["boards", () => m.settings_nav_boards()], ["statuses", () => m.settings_nav_statuses()], ["widget", () => m.settings_nav_widget()]] },
  { id: "developers", group: () => m.settings_nav_developers(), items: [["api-keys", () => m.settings_nav_api_keys()], ["integrations", () => m.settings_nav_integrations()], ["export", () => m.settings_nav_export()]] },
] as const;
