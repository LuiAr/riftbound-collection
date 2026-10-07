export let testUser: { userId: string } | null = { userId: "advisor-owner" };
export function setTestUser(user: { userId: string } | null) { testUser = user; }
export async function getChatGPTUser() { return testUser; }
