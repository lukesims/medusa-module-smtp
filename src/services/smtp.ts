import { Logger, NotificationTypes } from "@medusajs/framework/types";
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils";
import nodemailer, { type Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { z, ZodError } from "zod";

type InjectedDependencies = {
  logger: Logger;
};

export type SmtpNotificationServiceConfig = z.infer<typeof configSchema>;

const configSchema = z.object({
  from: z.string().optional(),
  host: z.string(),
  pass: z.string().optional(),
  port: z.number(),
  secure: z.boolean().optional(),
  user: z.string().optional(),
});

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

    this.transport = nodemailer.createTransport(
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

    this.logger.info("Initialised SmtpNotificationService");
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

      return { id: messageId };
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send email: ${error.message ?? "unknown error"}`,
      );
    }
  }

  static validateOptions(options: Record<string, unknown>) {
    try {
      configSchema.parse(options);
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        error instanceof ZodError
          ? `Invalid SMTP module config: ${JSON.stringify(error.issues)}`
          : (error as Error).message,
      );
    }
  }
}
