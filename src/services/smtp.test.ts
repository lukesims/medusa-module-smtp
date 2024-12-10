import { MedusaError } from "@medusajs/framework/utils";

import { getCombos } from "../../tests/utils/combos";
import { SmtpNotificationService, SmtpNotificationServiceConfig } from "./smtp";

describe("SmtpNotificationService", () => {
  describe("validateOptions", () => {
    test("throws if required options are not present", () => {
      expect.assertions(65);
      let validCombos = 0;
      for (const combo of getCombos<SmtpNotificationServiceConfig>({
        from: ["from@example.com", undefined],
        host: ["mail.example.com", undefined],
        pass: ["secret", undefined],
        port: [8888, undefined],
        secure: [true, undefined],
        user: ["user", undefined],
      })) {
        const validate = () => SmtpNotificationService.validateOptions(combo);
        if (combo.host && combo.port) {
          expect(validate).not.toThrow();
          validCombos++;
        } else {
          expect(validate).toThrow();
        }
      }
      expect(validCombos).toBe(16);
    });

    test("throws if options' types are incorrect", () => {
      expect.assertions(512);
      for (const combo of getCombos<SmtpNotificationServiceConfig>({
        host: [1, 1n, null, true, Symbol("foo"), [], {}, () => {}],
        port: ["", 1n, null, true, Symbol("foo"), [], {}, () => {}],
        secure: ["", 1, 1n, null, Symbol("foo"), [], {}, () => {}],
      })) {
        expect(() => SmtpNotificationService.validateOptions(combo)).toThrow();
      }
    });

    test("includes validation issues in the thrown error", () => {
      try {
        SmtpNotificationService.validateOptions({ from: 5 });
      } catch (error) {
        expect(error).toBeInstanceOf(MedusaError);
        expect(
          JSON.parse(error.message.split(":").slice(1).join(":")),
        ).toIncludeSameMembers([
          {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["from"],
            message: "Expected string, received number",
          },
          {
            code: "invalid_type",
            expected: "string",
            received: "undefined",
            path: ["host"],
            message: "Required",
          },
          {
            code: "invalid_type",
            expected: "number",
            received: "undefined",
            path: ["port"],
            message: "Required",
          },
        ]);
      }
    });
  });
});
