/*
 * @name verifyAuditChain
 * @file /docman/backend/src/scripts/verifyAuditChain.js
 * @description CLI check of the audit log hash chain. Exit code 0 = intact, 2 = tampering/corruption detected.
 *              Suitable for a nightly cron/systemd timer. Usage: NODE_ENV=production node src/scripts/verifyAuditChain.js
 * @author Richard Bakos
 * @version 2.3.0
 * @license UNLICENSED
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
if (process.env.NODE_ENV === "development") dotenv.config({ path: path.join(backendDir, ".env.dev") });
else if (process.env.NODE_ENV === "production") dotenv.config({ path: path.join(backendDir, ".env.prod") });
else dotenv.config({ path: path.join(backendDir, ".env") });

const { connectDB } = await import("../config/db.js");
const { verifyChain, record, AUDIT_ACTIONS } = await import("../services/auditService.js");

try {
    await connectDB();
    const result = await verifyChain();
    await record(null, {
        action: AUDIT_ACTIONS.AUDIT_VERIFY,
        outcome: result.valid ? "success" : "failure",
        resourceType: "audit",
        summary: result.valid
            ? `Scheduled audit chain verification passed (${result.checked} entries)`
            : `Scheduled audit chain verification FAILED at sequence ${result.firstInvalidSequence} (${result.reason})`,
        metadata: result,
    });
    console.log(JSON.stringify(result));
    process.exitCode = result.valid ? 0 : 2;
} catch (error) {
    console.error("Audit verification failed to run:", error);
    process.exitCode = 1;
} finally {
    await mongoose.connection.close();
}
