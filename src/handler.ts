import { randomHandler } from "./handler_random";

export async function handleRequest(req: Request): Promise<Response> {
	return randomHandler(req)
}
