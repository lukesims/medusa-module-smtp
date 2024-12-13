# medusa-module-smtp

A [notification module provider](https://docs.medusajs.com/resources/architectural-modules/notification) that allows [Medusa](https://medusajs.com) v2 applications to send email notifications via SMTP. Powered by [Nodemailer](https://github.com/nodemailer/nodemailer).

## Requirements

- Node >=20
- Medusa ^2

## Installation

Add the dependency:

```sh
npm i medusa-module-smtp
```

```sh
pnpm add medusa-module-smtp
```

```sh
yarn add medusa-module-smtp
```

Add the SMTP provider to the `providers` array option of the `@medusajs/medusa/notification` module in your `medusa-config.ts` (see [configuration](#configuration)):

```ts
module.exports = defineConfig({
  // ...

  modules: [
    // ...

    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          // ...

          {
            resolve: "medusa-module-smtp",
            id: "notification-smtp",
            options: {
              channels: ["email"],
              from: process.env.SMTP_FROM,
              host: process.env.SMTP_HOST,
              pass: process.env.SMTP_PASS,
              port: process.env.SMTP_PORT,
              secure: process.env.SMTP_SECURE === "true",
              user: process.env.SMTP_USER,
            },
          },
        ],
      },
    },
  ],
});
```

Add the environment variables to your `.env` file:

```sh
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=somebody@example.com
SMTP_PASS=password
SMTP_SECURE=false
SMTP_FROM=donotreply@example.com
```

## Configuration

```ts
type SmtpNotificationServiceConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from?: string;
  secure?: boolean;
};
```

## Usage

Notifications can be sent via SMTP using Medusa's notification module, you shouldn't need to interact with this library directly ([see Medusa docs](https://docs.medusajs.com/resources/architectural-modules/notification/send-notification)).

For example in an API route:

```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { INotificationModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const notificationService: INotificationModuleService = container.resolve(
    Modules.NOTIFICATION,
  );

  await notificationService.createNotifications({
    channel: "email",
    to: "someuser@example.com",
    content: {
      subject: "Hello world",
      text: "Email content as text",
      html: "<html><body>Email content as HTML</body></html>",
    },
    // The template property is not required by this provider but it is
    // required on Medusa's NotificationDTO type, so you'll need to add
    // it to placate the TS compiler (or use ts-ignore/ts-expect-error).
    template: "",
  });
};
```
