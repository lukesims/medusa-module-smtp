import { Logger, NotificationTypes } from "@medusajs/framework/types";
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils";
import nodemailer, { type Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

type InjectedDependencies = {
  logger: Logger;
};

export interface SmtpNotificationServiceConfig {
  from?: string;
  host: string;
  pass?: string;
  port: number;
  secure?: boolean;
  user?: string;
}

export class SmtpNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-smtp";
  protected config: SmtpNotificationServiceConfig;
  protected logger: Logger;
  protected transport: Transporter<
    SMTPTransport.SentMessageInfo,
    SMTPTransport.Options
  >;

  constructor(
    { logger }: InjectedDependencies,
    options: SmtpNotificationServiceConfig,
  ) {
    super();
    this.logger = logger;
    this.config = { ...options };
    this.transport = this.createTransport();

    console.group("SmtpNotificationService::constructor");
    console.log("options:", options);
    console.groupEnd();
  }

  protected createTransport() {
    return nodemailer.createTransport(
      {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
      },
      {
        from: this.config.from,
      },
    );
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO,
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No notification information provided",
      );
    }

    console.group("SmtpNotificationService::send");
    console.log("notification:", notification);

    try {
      const { messageId } = await this.transport.sendMail({
        from: notification.from?.trim() || this.config.from,
        to: notification.to?.trim(),
        subject: notification.content?.subject,
        html: notification.content?.html,
        text: notification.content?.text,

        attachments: Array.isArray(notification.attachments)
          ? notification.attachments.map((attachment) => ({
              cid: attachment.id ?? undefined,
              content: attachment.content,
              contentDisposition:
                attachment.disposition === "inline" ? "inline" : "attachment",
              contentType: attachment.content_type,
              encoding: "base64",
              filename: attachment.filename,
            }))
          : undefined,
      });

      console.log("messageId:", messageId);
      console.groupEnd();

      return { id: messageId };
    } catch (error) {
      console.groupEnd();
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send email: ${error.message ?? "unknown error"}`,
      );
    }
  }
}
