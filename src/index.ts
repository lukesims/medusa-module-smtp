import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import { SmtpNotificationService } from "./services/smtp";

const services = [SmtpNotificationService];

export default ModuleProvider(Modules.NOTIFICATION, {
  services,
});
