export async function handleRequest(req: Request): Promise<Response> {
	const tpPoint = Date.now();

	// random.org only cost network time
	const randomArray = await fetch_random();
	const randomQuota = await fetch_random_quota();

	// web-crypto cost cpu time
	const uuidArray = await gen_random_uuid();

	// output, spec on curl
	const userAgent = req.headers.get("user-agent");
	let randomOutput = "";
	let uuidOutput = "";
	let body = "";

	if (userAgent?.toLowerCase().includes("curl")) {
		randomOutput = `random.org:(quota ${randomQuota.trim()}/1000,000 bits)`;
		randomOutput += `\n${randomArray.join("\n")}`;
		uuidOutput = `cloudflare web-crypto:\n${uuidArray.join("\n")}`;
		body = [randomOutput, uuidOutput, ""].join("\n\n");
	} else {
		randomOutput = `random.org: ${randomArray} (quota ${randomQuota.trim()}/1000,000 bits)`;
		uuidOutput = `cloudflare web-crypto uuid4: ${uuidArray}`;
		body = [randomOutput, uuidOutput, ""].join("\n");
	}

	// output

	const bodyDigest = await digestSHA256(body);

	return new Response(body, {
		headers: {
			"content-type": "text/plain",
			"x-cost": `${Date.now() - tpPoint}ms`,
			"x-content-digest": `SHA-256=${bodyDigest}`,
		},
	});
}

// from cloudflare web-crypto api
// https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
async function gen_random_uuid(count = 2): Promise<string[]> {
	const array = [];

	for (let i = 0; i < count; i++) array.push(await crypto.randomUUID());
	return array;
}

// from random.org
const RANDOM_LENGTH = 12;
const RANDOM_COUNT = 2;
async function fetch_random(): Promise<string[]> {
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
	}

	return [];
}
async function fetch_random_quota(): Promise<string> {
	// https://www.random.org/quota/
	const resp = await fetch("https://www.random.org/quota/?format=plain");
	return await resp.text();
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

// encode sha256
async function digestSHA256(txt: string) {
	const myText = new TextEncoder().encode(txt);
	const myDigest = await crypto.subtle.digest({ name: "SHA-256" }, myText);
	const hashArray = Array.from(new Uint8Array(myDigest));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
