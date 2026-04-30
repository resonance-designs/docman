/*
 * @name linkAuthentikUsers
 * @file /docman/backend/src/scripts/linkAuthentikUsers.js
 * @description Bulk link existing DocMan users to Authentik subject IDs through an explicit mapping file
 * @author Richard Bakos
 * @version 2.2.5
 * @license UNLICENSED
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import {
    getUsersMissingAuthentikLink,
    linkUserToAuthentikIdentity,
} from "../services/userService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");

if (process.env.NODE_ENV === "development") {
    dotenv.config({ path: path.join(backendRoot, ".env.dev") });
} else if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: path.join(backendRoot, ".env.prod") });
} else {
    dotenv.config({ path: path.join(backendRoot, ".env") });
}

function parseArgs(argv) {
    const parsed = {
        dryRun: false,
        force: false,
        reportUnlinked: false,
        mapping: "",
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        switch (arg) {
            case "--dry-run":
                parsed.dryRun = true;
                break;
            case "--force":
                parsed.force = true;
                break;
            case "--report-unlinked":
                parsed.reportUnlinked = true;
                break;
            case "--mapping":
                parsed.mapping = argv[index + 1] || "";
                index += 1;
                break;
            default:
                throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return parsed;
}

function printUsage() {
    console.log(`
Usage:
  node src/scripts/linkAuthentikUsers.js --report-unlinked
  node src/scripts/linkAuthentikUsers.js --mapping path/to/authentik-links.json [--dry-run] [--force]

Mapping file format:
[
  {
    "email": "user@example.com",
    "authentikSub": "authentik-subject-id"
  },
  {
    "username": "jdoe",
    "authentikSub": "another-subject-id"
  },
  {
    "userId": "680c5d7f2d4f9d0f7b8f1111",
    "authentikSub": "third-subject-id"
  }
]
    `.trim());
}

function resolveMappingFile(filePath) {
    if (!filePath) {
        throw new Error("A mapping file path is required when not using --report-unlinked");
    }

    return path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);
}

function loadMappings(mappingPath) {
    const content = fs.readFileSync(mappingPath, "utf8");
    const mappings = JSON.parse(content);
    if (!Array.isArray(mappings)) {
        throw new Error("Mapping file must contain a JSON array");
    }

    return mappings;
}

async function reportUnlinkedUsers() {
    const users = await getUsersMissingAuthentikLink();
    console.log(JSON.stringify({
        total: users.length,
        users,
    }, null, 2));
}

async function runLinking({ mappings, dryRun, force }) {
    const summary = {
        total: mappings.length,
        linked: [],
        failed: [],
    };

    for (const mapping of mappings) {
        const target = {
            userId: mapping.userId,
            email: mapping.email,
            username: mapping.username,
            authentikSub: mapping.authentikSub,
            force,
        };

        try {
            if (dryRun) {
                summary.linked.push({
                    mode: "dry-run",
                    ...target,
                });
                continue;
            }

            const result = await linkUserToAuthentikIdentity(target);
            summary.linked.push(result);
        } catch (error) {
            summary.failed.push({
                ...target,
                error: error.message,
            });
        }
    }

    console.log(JSON.stringify(summary, null, 2));

    if (summary.failed.length > 0) {
        process.exitCode = 1;
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (!options.reportUnlinked && !options.mapping) {
        printUsage();
        throw new Error("Either --report-unlinked or --mapping must be provided");
    }

    await connectDB();

    if (options.reportUnlinked) {
        await reportUnlinkedUsers();
        return;
    }

    const mappingPath = resolveMappingFile(options.mapping);
    const mappings = loadMappings(mappingPath);
    await runLinking({
        mappings,
        dryRun: options.dryRun,
        force: options.force,
    });
}

main()
    .catch((error) => {
        console.error("❌ Authentik linking failed:", error.message || error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close();
    });
