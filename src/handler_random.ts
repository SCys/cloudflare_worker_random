const COUNT_MAX = 20000;
const DEFAULT_LOOP_COUNT = 4;

// enum classifiers
const enum CLASSIFIERS {
	UUID = "uuid",
	JS = "js",
	RANDOM_ORG = "random.org",
}

export function ErrorResponse(err: Error) {
	const raw = err.stack;

	return new Response("OOP Dump :-( ...<br />" + raw, {
		status: 200,
		headers: {
			"content-type": "text/plain",
		},
	});
}

export async function randomHandler(req: Request): Promise<Response> {
	let count = DEFAULT_LOOP_COUNT;
	let classifies = [CLASSIFIERS.UUID, CLASSIFIERS.JS, CLASSIFIERS.RANDOM_ORG];

	const headers: any = {
		"content-type": "text/plain",
	};

	try {
		// const { searchParams: params } = new URL(req.url)
		const url = new URL(req.url);
		const params = url.searchParams;
		const pathname = url.pathname;

		// s => count
		count = Number.parseInt(params.get("s") || "");
		if (isNaN(count) || count > COUNT_MAX) count = DEFAULT_LOOP_COUNT;

		switch (pathname) {
			case "/random":
				break;
			case "/random/id":
				classifies = [CLASSIFIERS.UUID];
				break;

			case "/random/js":
				classifies = [CLASSIFIERS.JS];
				break;

			case "/random/org":
				classifies = [CLASSIFIERS.RANDOM_ORG];
				break;

			default:
				// no support classifier, return empty 204 response
				return new Response("", { status: 204, headers });
		}
	} catch (ex) {
		console.error(`[randomHandler]parse query failed:${ex}`);
		return ErrorResponse(ex as Error);
	}

	let body = "";

	const data = [];

	// web-crypto cost cpu time
	if (classifies.includes(CLASSIFIERS.UUID)) {
		data.push("web crypto random UUID:");
		data.push((await gen_random_uuid(count)).join("\n"));
	}

	// js random cost cpu time
	if (classifies.includes(CLASSIFIERS.JS)) {
		data.push('random string without "OojlIL0":');
		data.push((await gen_random_string(count)).join("\n"));
	}

	// random.org
	if (classifies.includes(CLASSIFIERS.RANDOM_ORG)) {
		const randomQuota = await fetch_random_quota();
		if (randomQuota > 2) {
			data.push(`random.org quota ${randomQuota}/1000000 words:`);
			data.push((await fetch_random()).join("\n"));
		} else {
			data.push(`random.org quota 0/1000000 words, skip`);
		}
	}

	body = [
		...data,
		"running on cloudflare worker(free limited) code at https://github.com/SCys/cloudflare_worker_random",
	].join("\n\n");

	const bodyDigest = await digestSHA256(body);
	headers["x-content-digest"] = `SHA-256=${bodyDigest}`;
	return new Response(body, { headers });
}

// from cloudflare web-crypto api
// https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
async function gen_random_uuid(count = 6): Promise<string[]> {
	const output = new Set<string>();
	for (; output.size < count; ) output.add(await crypto.randomUUID());
	return [...output];
}

// from random.org
const RANDOM_LENGTH = 32;
const RANDOM_COUNT = 2;
async function fetch_random(): Promise<string[]> {
	// timer
	const timer = new Date();

	try {
		const url = `https://www.random.org/strings/?num=${RANDOM_COUNT}&len=${RANDOM_LENGTH}&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain&rnd=new`;
		const resp = await fetch(url);
		const text = await resp.text();
		return text
			.trim()
			.split("\n")
			.map((i) => i.trim());
	} catch (e) {
		console.error(`[fetch_random]with exception ${e}`);
	} finally {
		console.log(
			`[fetch_random]fetch ${RANDOM_COUNT} random string with length ${RANDOM_LENGTH} cost ${(
				new Date().getTime() - timer.getTime()
			).toFixed(2)}ms`
		);
	}
	return [];
}
async function fetch_random_quota(): Promise<number> {
	try {
		// https://www.random.org/quota/
		const resp = await fetch("https://www.random.org/quota/?format=plain");
		// convert string to number
		return Number.parseInt(await resp.text()); // will be NaN
	} catch (e) {
		console.error(`[fetch_random_quota]with exception ${e}`);
	}

	return 0;
}

// // from xid-js https://github.com/xaviiic/xid-js/blob/master/lib/xid.js
// const XID_MACHINE_ID = "abc";
// const XID_PROCESS_ID = 1199 & 0xffff; // a fixed process id
// let xid_seq = Math.random();
// let xid_time = (new Date().getTime() / 1000) | 0;
// async function gen_xid(count = 2): Promise<string[]> {
// 	const buff = new Uint8Array(Array(12).fill(0));
// 	buff.writeUInt32BE(xid_time, 0);
// 	buff.writeUIntBE(mid, 4, 3);
// 	buff.writeUInt16BE(pid, 7);

// 	return [];
// }

// js random string without OojlIL0
const JS_SEED = "123456789ABCDEFGHKMNPQRSTUVWXTZabcdefghikmnpqrstuvwxyz";
function gen_random_string(size = 6): string[] {
	const output = new Set<string>();
	for (; output.size < size; )
		output.add(
			(() => {
				let a = "";
				for (; a.length < 12; )
					a += JS_SEED[(Math.random() * JS_SEED.length) | 0];
				return a;
			})()
		);
	return [...output];
}

// encode sha256
async function digestSHA256(txt: string) {
	const myText = new TextEncoder().encode(txt);
	const myDigest = await crypto.subtle.digest({ name: "SHA-256" }, myText);
	const hashArray = Array.from(new Uint8Array(myDigest));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
