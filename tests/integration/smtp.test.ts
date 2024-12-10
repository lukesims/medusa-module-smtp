import type {
  Attachment,
  ProviderSendNotificationDTO,
} from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import {
  SmtpNotificationService,
  SmtpNotificationServiceConfig,
} from "../../src/services/smtp";
import { getCombos } from "../utils/combos";
import {
  cleanId,
  deleteMessages,
  getMessage,
  getMessageAttachment,
  getMessageHtml,
  getMessageText,
  healthCheck,
  listMessages,
  config as mailpitConfig,
  searchMessages,
} from "../utils/mailpit";

const readAttachment = (name: string) => {
  const path = resolve(__dirname, "../files", name);
  return {
    content: readFileSync(path, { encoding: "base64" }),
    size: statSync(path).size,
  };
};

const testAttachments: Attachment[] = [
  {
    filename: "example.jpg",
    content_type: "image/jpeg",
    ...readAttachment("example.jpg"),
  },
  {
    filename: "example.pdf",
    content_type: "application/pdf",
    ...readAttachment("example.pdf"),
  },
  {
    filename: "example.png",
    content_type: "image/png",
    ...readAttachment("example.png"),
  },
  {
    filename: "example.svg",
    content_type: "image/svg+xml",
    ...readAttachment("example.svg"),
  },
  {
    filename: "example.txt",
    content_type: "text/plain",
    ...readAttachment("example.txt"),
  },
];

// When sending notifications we're required to supply values for
// "channel" and "template" in the ProviderSendNotificationDTO
// objects, even though we do not use them internally
const channel = "anything";
const template = "anything";

function serviceFactory(overrides?: Partial<SmtpNotificationServiceConfig>) {
  return new SmtpNotificationService(
    {
      logger: {
        activity: () => "",
        debug: () => {},
        error: () => {},
        failure: () => null,
        info: () => {},
        log: () => {},
        panic: () => {},
        progress: () => {},
        setLogLevel: () => {},
        shouldLog: () => true,
        success: () => null,
        unsetLogLevel: () => {},
        warn: () => {},
      },
    },
    {
      host: mailpitConfig.host,
      ...mailpitConfig.smtp,
      ...overrides,
    },
  );
}

describe("SMTP notification provider", () => {
  beforeAll(async () => {
    await healthCheck();
  });

  beforeEach(async () => {
    await deleteMessages();
  });

  test("sends emails with html only", async () => {
    const smtpService = serviceFactory();
    const { id } = await smtpService.send({
      to: "John Doe <someone@example.com>",
      from: "sends-emails-with-html-only <integration@medusa-module-smtp.test>",
      content: {
        subject: "sends-emails-with-html-only",
        html: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"></head><body>sends-emails-with-html-only</body></html>',
      },
      channel,
      template,
    });

    if (!id) {
      throw new Error("Mailpit did not return a message ID");
    }

    const res = await searchMessages({ query: `message-id:${cleanId(id)}` });
    const [message] = res.messages;

    expect(message).toMatchObject({
      To: [
        {
          Name: "John Doe",
          Address: "someone@example.com",
        },
      ],
      From: {
        Name: "sends-emails-with-html-only",
        Address: "integration@medusa-module-smtp.test",
      },
      Bcc: [],
      Cc: [],
      ReplyTo: [],
      Subject: "sends-emails-with-html-only",
      Attachments: 0,
    });

    const html = await getMessageHtml(message.ID);
    expect(html.replace(/\s+/g, " ").trim()).toBe(
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"></head><body>sends-emails-with-html-only</body></html>',
    );
  });

  test("sends emails with text only", async () => {
    const smtpService = serviceFactory();
    const { id } = await smtpService.send({
      to: "John Doe <someone@example.com>",
      from: "sends-emails-with-text-only <integration@medusa-module-smtp.test>",
      content: {
        subject: "sends-emails-with-text-only",
        text: "sends-emails-with-text-only",
      },
      channel,
      template,
    });

    if (!id) {
      throw new Error("Mailpit did not return a message ID");
    }

    const res = await searchMessages({ query: `message-id:${cleanId(id)}` });
    const [message] = res.messages;

    expect(message).toMatchObject({
      To: [
        {
          Name: "John Doe",
          Address: "someone@example.com",
        },
      ],
      From: {
        Name: "sends-emails-with-text-only",
        Address: "integration@medusa-module-smtp.test",
      },
      Bcc: [],
      Cc: [],
      ReplyTo: [],
      Subject: "sends-emails-with-text-only",
      Attachments: 0,
    });

    const text = await getMessageText(message.ID);
    expect(text.trim()).toBe("sends-emails-with-text-only");
  });

  test("sends emails with html and text", async () => {
    const smtpService = serviceFactory();
    const { id } = await smtpService.send({
      to: "John Doe <someone@example.com>",
      from: "sends-emails-with-html-and-text <integration@medusa-module-smtp.test>",
      content: {
        subject: "sends-emails-with-html-and-text",
        text: "text-content",
        html: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"></head><body>html-content</body></html>',
      },
      channel,
      template,
    });

    if (!id) {
      throw new Error("Mailpit did not return a message ID");
    }

    const res = await searchMessages({ query: `message-id:${cleanId(id)}` });
    const [message] = res.messages;

    expect(message).toMatchObject({
      To: [{ Name: "John Doe", Address: "someone@example.com" }],
      From: {
        Name: "sends-emails-with-html-and-text",
        Address: "integration@medusa-module-smtp.test",
      },
      Bcc: [],
      Cc: [],
      ReplyTo: [],
      Subject: "sends-emails-with-html-and-text",
      Attachments: 0,
    });

    const html = await getMessageHtml(message.ID);
    expect(html.replace(/\s+/g, " ").trim()).toBe(
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"></head><body>html-content</body></html>',
    );

    const text = await getMessageText(message.ID);
    expect(text.trim()).toBe("text-content");
  });

  test("sends emails with attachments", async () => {
    const smtpService = serviceFactory();
    const attachments = testAttachments.map((a) => {
      // @ts-expect-error we add size but it's not a part of Attachment
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { size, ...attachment } = a;
      return attachment;
    });

    const notification = {
      to: "John Doe <someone@example.com>",
      attachments,
      channel,
      template,
    };

    const regularAttachmentsResponse = await smtpService.send(notification);
    const inlineAttachmentsResponse = await smtpService.send({
      ...notification,
      attachments: attachments.map((a) => ({ ...a, disposition: "inline" })),
    });
    const mixedAttachmentsResponse = await smtpService.send({
      ...notification,
      attachments: attachments.map((a, i) =>
        i % 2 === 0 ? a : { ...a, disposition: "inline" },
      ),
    });

    if (
      !regularAttachmentsResponse.id ||
      !inlineAttachmentsResponse.id ||
      !mixedAttachmentsResponse.id
    ) {
      throw new Error("Mailpit did not return a message ID");
    }

    const regularAttachmentsMsgId = cleanId(regularAttachmentsResponse.id);
    const inlineAttachmentsMsgId = cleanId(inlineAttachmentsResponse.id);
    const mixedAttachmentsMsgId = cleanId(mixedAttachmentsResponse.id);

    const { messages, messages_count, total } = await listMessages();
    expect(messages).toHaveLength(3);
    expect(messages_count).toBe(3);
    expect(total).toBe(3);

    for (const message of messages) {
      const msg = await getMessage(message.ID);

      expect(msg.To).toHaveLength(1);
      expect(msg.To[0].Name).toBe("John Doe");
      expect(msg.To[0].Address).toBe("someone@example.com");

      switch (msg.MessageID) {
        case regularAttachmentsMsgId:
          expect(msg.Attachments).toHaveLength(5);
          expect(msg.Inline).toHaveLength(0);
          for (let i = 0; i < testAttachments.length; i++) {
            const attachment = testAttachments[i];
            expect(msg.Attachments[i].PartID).toBe(i + 1 + "");
            expect(msg.Attachments[i].FileName).toBe(attachment.filename);
            // @ts-expect-error we add size but it's not a part of Attachment
            expect(msg.Attachments[i].Size).toBe(attachment.size);
            expect(msg.Attachments[i].ContentType).toBe(
              attachment.content_type,
            );
            const dataArr = await getMessageAttachment(message.ID, i + 1 + "");
            const data64 = Buffer.from(dataArr).toString("base64");
            expect(data64).toBe(attachment.content);
          }
          break;

        case inlineAttachmentsMsgId:
          expect(msg.Attachments).toHaveLength(0);
          expect(msg.Inline).toHaveLength(5);
          for (let i = 0; i < testAttachments.length; i++) {
            const attachment = testAttachments[i];
            expect(msg.Inline[i].PartID).toBe(i + 1 + "");
            expect(msg.Inline[i].FileName).toBe(attachment.filename);
            expect(msg.Inline[i].ContentType).toBe(attachment.content_type);
            // @ts-expect-error we add size but it's not a part of Attachment
            expect(msg.Inline[i].Size).toBe(attachment.size);
            const dataArr = await getMessageAttachment(message.ID, i + 1 + "");
            const data64 = Buffer.from(dataArr).toString("base64");
            expect(data64).toBe(attachment.content);
          }
          break;

        case mixedAttachmentsMsgId:
          expect(msg.Attachments).toHaveLength(3);
          expect(msg.Inline).toHaveLength(2);
          for (let i = 0; i < testAttachments.length; i++) {
            const attachment = testAttachments[i];
            const msgAttachment =
              i % 2 === 0
                ? msg.Attachments[Math.floor(i / 2)]
                : msg.Inline[Math.floor(i / 2)];
            expect(msgAttachment.PartID).toBe(i + 1 + "");
            expect(msgAttachment.FileName).toBe(attachment.filename);
            expect(msgAttachment.ContentType).toBe(attachment.content_type);
            // @ts-expect-error we add size but it's not a part of Attachment
            expect(msgAttachment.Size).toBe(attachment.size);
            const dataArr = await getMessageAttachment(message.ID, i + 1 + "");
            const data64 = Buffer.from(dataArr).toString("base64");
            expect(data64).toBe(attachment.content);
          }
          break;

        default:
          throw new Error("Couldn't match message IDs to API response");
      }
    }
  });

  test(`default "from" can be overridden per-notification`, async () => {
    const smtpService = serviceFactory({
      from: "default@medusa-module-smtp.test",
    });
    const { id: defaultFromMessageId } = await smtpService.send({
      to: "someone@example.com",
      channel,
      template,
    });
    const { id: overriddenFromMessageId } = await smtpService.send({
      to: "someone@example.com",
      from: "overridden@medusa-module-smtp.test",
      channel,
      template,
    });

    if (!defaultFromMessageId || !overriddenFromMessageId) {
      throw new Error("Mailpit did not return a message ID");
    }

    const { messages, messages_count, total } = await listMessages();
    expect(messages).toHaveLength(2);
    expect(messages_count).toBe(2);
    expect(total).toBe(2);

    for (const message of messages) {
      if (message.MessageID === cleanId(defaultFromMessageId)) {
        expect(message.From).toMatchObject({
          Address: "default@medusa-module-smtp.test",
        });
      }
      if (message.MessageID === cleanId(overriddenFromMessageId)) {
        expect(message.From).toMatchObject({
          Address: "overridden@medusa-module-smtp.test",
        });
      }
    }
  });

  test(`only required notification property is "to"`, async () => {
    const smtpService = serviceFactory();

    // Generate an array of ProviderSendNotificationDTO objects with
    // every possible combination of properties. With the 7 properties
    // below this produces 128 (2^7) combinations, half of which we
    // would expect to succeed (the ones that have the "to" field).
    const combos = getCombos<ProviderSendNotificationDTO>({
      to: ["someone@example.com", undefined],
      from: ["integration1@medusa-module-smtp.test", undefined],
      channel: [channel, undefined],
      template: [template, undefined],
      content: {
        subject: ["This is a test email", undefined],
        text: ["integration1", undefined],
        html: [
          `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"></head><body>integration1</body></html>`,
          undefined,
        ],
      },
    });

    // Keep track of the combinations that sent without error so
    // we can compare them against the data received by Mailpit
    const validCombos: [string, Partial<ProviderSendNotificationDTO>][] = [];

    // 3 for each invalid combo, 1 for every valid combo, plus 4 others
    // validating the API response - so we expect 259 ((4 x 64) + 4)
    expect.assertions(260);

    for (const combo of combos) {
      try {
        const { id } = await smtpService.send(
          combo as ProviderSendNotificationDTO,
        );
        validCombos.push([cleanId(id!), combo]);
      } catch (error) {
        expect(error).toBeInstanceOf(MedusaError);
        expect(error.message).toMatch(/^Failed to send email: /);
        expect(error.type).toMatch(MedusaError.Types.UNEXPECTED_STATE);
      }
    }

    expect(validCombos).toHaveLength(64);

    const response = await listMessages({ limit: 100 });
    expect(response.messages).toHaveLength(64);
    expect(response.messages_count).toBe(64);
    expect(response.total).toBe(64);

    for (const c of validCombos) {
      const [msgId, combo] = c;
      const [msg] = response.messages.filter((m) => m.MessageID === msgId);
      expect(msg).toMatchObject({
        To: [{ Name: "", Address: combo.to }],
        From: { Name: "", Address: combo.from ?? "" },
        Bcc: [],
        Cc: [],
        ReplyTo: [],
        Subject: combo.content?.subject ?? "",
        Attachments: 0,
      });
    }
  });
});
