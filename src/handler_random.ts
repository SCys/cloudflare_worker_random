export async function randomHandler(_: Request): Promise<Response> {
    const tpPoint = Date.now();

    // random.org only cost network time
    // const randomArray: string[] = []; //await fetch_random();
    // const randomQuota = await fetch_random_quota();

    // web-crypto cost cpu time
    const uuidArray = await gen_random_uuid();

    // js random cost cpu time
    const jsArray = await gen_random_string();

    // let randomOutput = `random.org:(quota ${randomQuota.trim()}/1000,000 bits)`;
    // randomOutput += `\n${randomArray.join("\n")}`;

    const body = [
        // randomOutput,
        `cloudflare web-crypto:\n${uuidArray.join("\n")}`,
        `js random without (OojlIL0):\n${jsArray.join("\n")}`,
        "code at https://github.com/SCys/cloudflare_worker_random",
        ""].join("\n\n");

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
async function gen_random_uuid(count = 6): Promise<string[]> {
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

// js random string without OojlIL0
const JS_SEED = "123456789ABCDEFGHKMNPQRSTUVWXTZabcdefghikmnpqrstuvwxyz"
function gen_random_string(size = 6): string[] {
    const output = []
    for (let i = 0; i < size; i++)
        output.push((() => {
            let a = ''
            for (; a.length < 12;) a += JS_SEED[(Math.random() * JS_SEED.length) | 0];
            return a;
        })())
    return output;
}

// encode sha256
async function digestSHA256(txt: string) {
    const myText = new TextEncoder().encode(txt);
    const myDigest = await crypto.subtle.digest({ name: "SHA-256" }, myText);
    const hashArray = Array.from(new Uint8Array(myDigest));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
