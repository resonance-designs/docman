/*
 * @name smokeTest
 * @file /docman/backend/src/scripts/smokeTest.js
 * @description End-to-end check of a RUNNING backend (real MongoDB, real Redis): sign-in, document creation,
 *              approval workflow, separation of duties, access control, secure download + checksum, public
 *              /uploads lock-down, revision history, soft delete/restore, audit chain, and Redis status.
 *
 * Usage: SMOKE_BASE_URL=http://127.0.0.1:5001 node src/scripts/smokeTest.js
 *        Supply SMOKE_ADMIN_PASSWORD or DOCMAN_DEFAULT_PASSWORD for the disposable test account.
 *        Disposable test deployment only: enable System Settings > Accounts > Self-registration
 *        (accounts.policy.selfRegistrationEnabled) before running; restore it to off afterward.
 *        The script checks this database-backed policy and never enables registration itself.
 * @author Richard Bakos
 * @version 3.0.0
 * @license UNLICENSED
 */
import crypto from "crypto";

const BASE = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:5001").replace(/\/+$/, "");
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || process.env.DOCMAN_DEFAULT_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || process.env.DOCMAN_DEFAULT_PASSWORD;
const EXPECT_REDIS = process.env.SMOKE_EXPECT_REDIS_PROVIDER || null;
const RUN = crypto.randomBytes(3).toString("hex");

let passed = 0;
const failures = [];

async function check(name, fn) {
    try {
        await fn();
        passed += 1;
        console.log(`  ✓ ${name}`);
    } catch (error) {
        failures.push({ name, error });
        console.log(`  ✗ ${name}\n      ${error.message}`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function call(method, path, { token, json, form, raw } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let body;
    if (json !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(json);
    } else if (form) {
        body = form;
    }
    const response = await fetch(`${BASE}${path}`, { method, headers, body });
    if (raw) return response;
    const text = await response.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }
    return { status: response.status, data, headers: response.headers };
}

async function register(label) {
    const email = `smoke-${label}-${RUN}@example.test`;
    const password = crypto.randomBytes(24).toString("base64url");
    const res = await call("POST", "/api/auth/register", {
        json: { email, password, firstname: "Smoke", lastname: label, username: `smoke${label}${RUN}`, role: "viewer" },
    });
    assert(res.status === 201, `register ${label} -> ${res.status} ${JSON.stringify(res.data)}`);
    return { token: res.data.token, id: String(res.data.user.id), email };
}

async function main() {
    if (!ADMIN_PASSWORD) throw new Error("Set SMOKE_ADMIN_PASSWORD or DOCMAN_DEFAULT_PASSWORD before running the smoke test.");
    console.log(`DocMan smoke test against ${BASE} (run ${RUN})`);
    const ctx = {};
    const fileContent = `Smoke test policy document ${RUN}\nLine two.\n`;
    const fileHash = crypto.createHash("sha256").update(fileContent).digest("hex");

    await check("server is reachable", async () => {
        const res = await call("GET", "/api/docs");
        assert(res.status === 401, `expected 401 without a token, got ${res.status}`);
    });

    await check("admin signs in", async () => {
        const res = await call("POST", "/api/auth/login", { json: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
        assert(res.status === 200, `login -> ${res.status} ${JSON.stringify(res.data)}`);
        assert(["admin", "superadmin"].includes(res.data.user.role), `admin role is ${res.data.user.role}`);
        ctx.admin = { token: res.data.token, id: String(res.data.user.id), role: res.data.user.role };
    });
    if (!ctx.admin) return finish();

    await check('database policy permits disposable test registrations', async () => {
        const res = await call('GET', '/api/auth/account-policy');
        assert(res.status === 200 && res.data.selfRegistrationEnabled === true,
            'Enable self-registration in System Settings > Accounts on the disposable test deployment, then rerun. Restore it to off afterward.');
        ctx.registrationReady = true;
    });
    if (!ctx.registrationReady) return finish();

    await check("self-registration cannot request superadmin", async () => {
        const res = await call("POST", "/api/auth/register", {
            json: { email: `smoke-evil-${RUN}@example.test`, password: crypto.randomBytes(24).toString("base64url"), firstname: "E", lastname: "Vil", username: `smokeevil${RUN}`, role: "superadmin" },
        });
        assert(res.status === 400, `expected 400, got ${res.status}`);
    });

    await check("register approver and outsider (viewers)", async () => {
        ctx.approver = await register("approver");
        ctx.outsider = await register("outsider");
    });

    await check("create category", async () => {
        const res = await call("POST", "/api/categories", { token: ctx.admin.token, json: { name: `Smoke ${RUN}`, description: "smoke" } });
        assert(res.status === 201 || res.status === 200, `category -> ${res.status} ${JSON.stringify(res.data)}`);
        ctx.categoryId = res.data?._id || res.data?.category?._id;
        assert(ctx.categoryId, "no category id returned");
    });

    await check("create document with file → version 1 awaits approval", async () => {
        const form = new FormData();
        form.append("title", `Smoke policy ${RUN}`);
        form.append("description", "Created by smokeTest.js");
        form.append("author", ctx.admin.id);
        form.append("category", ctx.categoryId);
        form.append("opensForReview", new Date(Date.now() + 86400000).toISOString());
        form.append("owners", JSON.stringify([ctx.admin.id]));
        form.append("approvers", JSON.stringify([ctx.approver.id]));
        form.append("file", new Blob([fileContent], { type: "text/plain" }), "smoke-policy.txt");
        const res = await call("POST", "/api/docs", { token: ctx.admin.token, form });
        assert(res.status === 201, `create -> ${res.status} ${JSON.stringify(res.data)}`);
        ctx.docId = res.data.doc._id;
        const files = await call("GET", `/api/docs/${ctx.docId}/files`, { token: ctx.admin.token });
        assert(files.status === 200 && files.data.length === 1, `files -> ${files.status}`);
        ctx.file = files.data[0];
        assert(ctx.file.status === "pending_approval", `status is ${ctx.file.status}`);
        assert((ctx.file.contentSha256 || ctx.file.sha256) === fileHash, "recorded checksum does not match uploaded content");
        if (process.env.SMOKE_EXPECT_ENCRYPTED === "true") {
            assert(ctx.file.encrypted === true, "file was not encrypted at rest");
            assert(ctx.file.sha256 !== fileHash, "stored bytes equal the plaintext; encryption did not happen");
        }
        assert(!("path" in ctx.file), "server file path leaked in API response");
    });
    if (!ctx.docId) return finish();

    await check("approver sees it in the approvals inbox", async () => {
        const res = await call("GET", "/api/docs/approvals/pending", { token: ctx.approver.token });
        assert(res.status === 200, `inbox -> ${res.status}`);
        assert(res.data.items.some((item) => String(item.documentId) === String(ctx.docId)), "pending version not in inbox");
    });

    await check("uploader cannot approve their own version", async () => {
        const res = await call("POST", `/api/docs/${ctx.docId}/versions/1/approve`, { token: ctx.admin.token, json: {} });
        assert(res.status === 403, `expected 403, got ${res.status}`);
    });

    await check("outsider cannot read the document", async () => {
        const res = await call("GET", `/api/docs/${ctx.docId}`, { token: ctx.outsider.token });
        assert(res.status === 403, `expected 403, got ${res.status}`);
        const files = await call("GET", `/api/docs/${ctx.docId}/files`, { token: ctx.outsider.token });
        assert(files.status === 403, `files expected 403, got ${files.status}`);
    });

    await check("approver approves → version 1 published", async () => {
        const res = await call("POST", `/api/docs/${ctx.docId}/versions/1/approve`, { token: ctx.approver.token, json: { comment: "Reviewed in smoke test" } });
        assert(res.status === 200 && res.data.published === true, `approve -> ${res.status} ${JSON.stringify(res.data)}`);
        const doc = await call("GET", `/api/docs/${ctx.docId}`, { token: ctx.admin.token });
        assert(doc.data.currentVersion === 1, `currentVersion is ${doc.data.currentVersion}`);
    });

    await check("authenticated download returns the exact bytes", async () => {
        const res = await call("GET", `/api/docs/${ctx.docId}/files/${ctx.file._id}/download`, { token: ctx.approver.token, raw: true });
        assert(res.status === 200, `download -> ${res.status}`);
        const body = Buffer.from(await res.arrayBuffer()).toString();
        assert(body === fileContent, "downloaded content differs");
        assert(res.headers.get("x-content-sha256") === fileHash, "checksum header missing or wrong");
    });

    await check("document files are not served from public /uploads", async () => {
        const res = await call("GET", `/uploads/${ctx.file.filename}`, { raw: true });
        assert(res.status === 404, `expected 404, got ${res.status}`);
    });

    await check("second version: reject requires a reason, then rejected", async () => {
        const form = new FormData();
        form.append("changelog", "Second draft");
        form.append("file", new Blob([`${fileContent}v2\n`], { type: "text/plain" }), "smoke-policy-v2.txt");
        const up = await call("POST", `/api/docs/${ctx.docId}/upload`, { token: ctx.admin.token, form });
        assert(up.status === 201 && up.data.file.status === "pending_approval", `upload v2 -> ${up.status} ${JSON.stringify(up.data)}`);
        const blocked = await call("POST", `/api/docs/${ctx.docId}/upload`, { token: ctx.admin.token, form });
        assert(blocked.status === 409, `second pending upload expected 409, got ${blocked.status}`);
        const noReason = await call("POST", `/api/docs/${ctx.docId}/versions/2/reject`, { token: ctx.approver.token, json: { comment: "" } });
        assert(noReason.status === 400, `reject without reason expected 400, got ${noReason.status}`);
        const rejected = await call("POST", `/api/docs/${ctx.docId}/versions/2/reject`, { token: ctx.approver.token, json: { comment: "Needs section 3" } });
        assert(rejected.status === 200 && rejected.data.file.status === "rejected", `reject -> ${rejected.status}`);
        const doc = await call("GET", `/api/docs/${ctx.docId}`, { token: ctx.admin.token });
        assert(doc.data.currentVersion === 1, "rejected version must not be published");
    });

    await check("approver (viewer) cannot edit metadata", async () => {
        const res = await call("PUT", `/api/docs/${ctx.docId}`, { token: ctx.approver.token, json: { title: "hijack" } });
        assert(res.status === 403, `expected 403, got ${res.status}`);
    });

    await check("metadata edit is revisioned; server-controlled fields ignored", async () => {
        const res = await call("PUT", `/api/docs/${ctx.docId}`, {
            token: ctx.admin.token,
            json: { title: `Smoke policy ${RUN} (edited)`, currentVersion: 99, reviewCompleted: true },
        });
        assert(res.status === 200, `update -> ${res.status} ${JSON.stringify(res.data)}`);
        assert(res.data.doc.currentVersion === 1, `currentVersion was overwritten to ${res.data.doc.currentVersion}`);
        const revisions = await call("GET", `/api/docs/${ctx.docId}/revisions`, { token: ctx.admin.token });
        const update = revisions.data.items.find((rev) => rev.action === "update");
        assert(update && update.changes.some((c) => c.field === "title"), "no update revision with a title change");
    });

    await check("soft delete hides the document; restore brings it back", async () => {
        const del = await call("DELETE", `/api/docs/${ctx.docId}`, { token: ctx.admin.token, json: { reason: "smoke test" } });
        assert(del.status === 200, `delete -> ${del.status} ${JSON.stringify(del.data)}`);
        const gone = await call("GET", `/api/docs/${ctx.docId}`, { token: ctx.admin.token });
        assert(gone.status === 404, `deleted doc expected 404, got ${gone.status}`);
        const restore = await call("POST", `/api/docs/${ctx.docId}/restore`, { token: ctx.admin.token, json: { reason: "smoke test" } });
        assert(restore.status === 200, `restore -> ${restore.status} ${JSON.stringify(restore.data)}`);
    });

    await check("concurrent uploads permit only one active version", async () => {
        const upload = () => {
            const form = new FormData();
            form.append("file", new Blob([fileContent], { type: "text/plain" }), "concurrent.txt");
            return call("POST", `/api/docs/${ctx.docId}/upload`, { token: ctx.admin.token, form });
        };
        const results = await Promise.all([upload(), upload()]);
        assert(results.filter((r) => r.status === 201).length === 1, `expected one success: ${results.map(r => r.status)}`);
        assert(results.filter((r) => r.status === 409).length === 1, "losing upload must return conflict");
        const version = results.find((r) => r.status === 201).data.file.version;
        const withdrawn = await call("POST", `/api/docs/${ctx.docId}/versions/${version}/withdraw`, { token: ctx.admin.token, json: {} });
        assert(withdrawn.status === 200, `withdraw -> ${withdrawn.status}`);
    });

    await check("book responses do not expose inaccessible documents", async () => {
        const cat = await call("POST", "/api/categories", { token: ctx.admin.token, json: { name: `Books ${RUN}`, type: "Book" } });
        const category = cat.data?._id || cat.data?.category?._id;
        assert(category, `book category -> ${cat.status}`);
        const created = await call("POST", "/api/books", { token: ctx.admin.token,
            json: { title: `Book ${RUN}`, category, documents: [ctx.docId] } });
        assert(created.status === 201, `book create -> ${created.status}`);
        const id = created.data.book._id;
        const hidden = await call("GET", `/api/books/${id}`, { token: ctx.outsider.token });
        assert(hidden.status === 200 && hidden.data.book.documents.length === 0, "book leaked document metadata");
        const visible = await call("GET", `/api/books/${id}`, { token: ctx.approver.token });
        assert(visible.status === 200 && visible.data.book.documents.length === 1, "allowed document missing");
    });

    await check("analytics exports respect document access", async () => {
        for (const type of ["monthly", "category", "author", "review"]) {
            const res = await call("GET", `/api/analytics/export?type=${type}`, { token: ctx.outsider.token });
            assert(res.status === 200, `analytics ${type} -> ${res.status}`);
            assert(!JSON.stringify(res.data).includes(`Smoke policy ${RUN}`), `${type} leaked the protected title`);
        }
    });

    await check("audit log recorded the workflow", async () => {
        const res = await call("GET", `/api/docs/${ctx.docId}/audit?limit=500`, { token: ctx.admin.token });
        assert(res.status === 200, `doc audit -> ${res.status}`);
        const actions = new Set(res.data.items.map((entry) => entry.action));
        for (const action of ["document.create", "file.upload", "version.submit", "version.approve", "version.publish",
            "file.download", "version.reject", "document.update", "document.delete", "document.restore", "access.denied"]) {
            assert(actions.has(action), `missing audit action ${action}`);
        }
    });

    if (ctx.admin.role === "superadmin") {
        await check("audit hash chain verifies", async () => {
            const res = await call("GET", "/api/audit/verify", { token: ctx.admin.token });
            assert(res.status === 200 && res.data.valid === true, `verify -> ${res.status} ${JSON.stringify(res.data)}`);
        });
    }

    await check("audit CSV export", async () => {
        const res = await call("GET", "/api/audit/export?format=csv", { token: ctx.admin.token, raw: true });
        assert(res.status === 200, `export -> ${res.status}`);
        const text = await res.text();
        assert(text.startsWith("sequence,timestamp,action"), "unexpected CSV header");
    });

    await check("Redis status", async () => {
        const res = await call("GET", "/api/system/redis", { token: ctx.admin.token });
        assert(res.status === 200, `redis status -> ${res.status}`);
        assert(res.data.health.ok, `active provider ${res.data.activeProvider} unhealthy: ${res.data.health.error}`);
        if (EXPECT_REDIS) assert(res.data.activeProvider === EXPECT_REDIS, `active provider is ${res.data.activeProvider}, expected ${EXPECT_REDIS}`);
        assert(res.data.fallbackCount === 0, `rate limiter fell back to memory ${res.data.fallbackCount} time(s): ${res.data.lastError}`);
        console.log(`      active store: ${res.data.activeProvider} (${res.data.health.latencyMs} ms)`);
    });

    await check("logout invalidates the access token", async () => {
        const out = await call("POST", "/api/auth/logout", { token: ctx.outsider.token });
        assert(out.status === 200, `logout -> ${out.status}`);
        const me = await call("GET", "/api/auth/me", { token: ctx.outsider.token });
        assert(me.status === 401, `logged-out token still accepted: ${me.status}`);
    });
    return finish();
}

function finish() {
    console.log(`\n${passed} passed, ${failures.length} failed`);
    process.exitCode = failures.length ? 1 : 0;
}

main().catch((error) => {
    console.error("Smoke test crashed:", error);
    process.exitCode = 1;
});
