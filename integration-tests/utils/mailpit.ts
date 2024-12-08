import { URLSearchParams } from "url";

if (
  !process.env.MAILPIT_HOST ||
  !process.env.MAILPIT_HTTP_PORT ||
  !process.env.MAILPIT_SMTP_PORT ||
  !process.env.MAILPIT_SMTP_USER ||
  !process.env.MAILPIT_SMTP_PASS ||
  !process.env.MAILPIT_SMTP_SECURE
) {
  throw new Error(
    "Missing required environment variables for SMTP service integration testing.\nSee integration-tests/__tests__/smtp.spec.ts for the required variables.",
  );
}

export const config = {
  host: process.env.MAILPIT_HOST,
  http: {
    port: parseInt(process.env.MAILPIT_HTTP_PORT, 10),
  },
  smtp: {
    port: parseInt(process.env.MAILPIT_SMTP_PORT, 10),
    user: process.env.MAILPIT_SMTP_USER,
    pass: process.env.MAILPIT_SMTP_PASS,
    secure: process.env.MAILPIT_SMTP_SECURE === "true",
  },
};

export function cleanId(id: string) {
  return id.substring(0, id.length - 1).substring(1);
}

export function deleteMessages(params?: DeleteMessagesParams) {
  return fetchApi<string>("api/v1/messages", {
    method: "delete",
    body: params ? JSON.stringify(params) : undefined,
  });
}

async function fetchApi<T>(
  path: string,
  init?: RequestInit,
  transform?: (res: Response) => Promise<T>,
): Promise<T> {
  const res = await fetch(
    `http://${config.host}:${config.http.port}/${path}`,
    init,
  );
  if (!res.ok || res.status !== 200) {
    throw new Error(`API ERROR ${path} - ${await res.text()}`);
  }
  if (transform) {
    return transform(res);
  }
  return res.headers.get("content-type") === "application/json"
    ? res.json()
    : res.text();
}

export function getMessage(messageId: string) {
  return fetchApi<Message>(`api/v1/message/${messageId}`);
}

export function getMessageAttachment(messageId: string, partId: string) {
  return fetchApi<ArrayBuffer>(
    `api/v1/message/${messageId}/part/${partId}`,
    undefined,
    (res) => res.arrayBuffer(),
  );
}

export function getMessageHtml(messageId: string) {
  return fetchApi<string>(`/view/${messageId}.html`);
}

export function getMessageText(messageId: string) {
  return fetchApi<string>(`/view/${messageId}.txt`);
}

export async function healthCheck() {
  try {
    await fetchApi("livez");
    await fetchApi("readyz");
  } catch (error) {
    throw new Error(`The mailpit service is not healthy (${error.message})`);
  }
}

export function listMessages(params: ListMessagesParams = {}) {
  return fetchApi<ListMessagesResponse>(
    `api/v1/messages?${new URLSearchParams(
      Object.keys(params).reduce((obj, key) => {
        if (params[key]) obj[key] = params[key];
        return obj;
      }, {}),
    ).toString()}`,
  );
}

export function searchMessages(params: SearchMessagesParams) {
  return fetchApi<ListMessagesResponse>(
    `/api/v1/search?${new URLSearchParams(
      Object.keys(params).reduce((obj, key) => {
        if (params[key]) obj[key] = params[key];
        return obj;
      }, {}),
    ).toString()}`,
  );
}

export interface DeleteMessagesParams {
  IDs: string[];
}

export interface ListMessagesParams {
  limit?: number;
  start?: number;
}

export interface ListMessagesResponse {
  messages: MessageSummary[];
  messages_count: number;
  start: number;
  tags: string[];
  total: number;
  unread: number;
}

interface MessageAttachment {
  ContentID: string;
  ContentType: string;
  FileName: string;
  PartID: string;
  Size: number;
}

interface MessageContact {
  Address: string;
  Name: string;
}

interface MessageCommon {
  ID: string;
  Bcc: MessageContact[];
  Cc: MessageContact[];
  From: MessageContact;
  MessageID: string;
  ReplyTo: MessageContact[];
  Size: number;
  Subject: string;
  Tags: string[];
  To: MessageContact[];
}

export interface Message extends MessageCommon {
  Attachments: MessageAttachment[];
  Date: string;
  HTML: string;
  Inline: MessageAttachment[];
  ReturnPath: string;
  Text: string;
}

export interface MessageSummary extends MessageCommon {
  Attachments: number;
  Created: string;
  Read: boolean;
  Snippet: string;
}

export interface SearchMessagesParams {
  query: string;
  start?: number;
  limit?: number;
  tz?: string;
}
