import { headers } from "next/headers";

export async function getUser() {
  const headerList = await headers();
  const userData = headerList.get("x-user");
  if (!userData) return null;

  try {
    return JSON.parse(userData);
  } catch (error) {
    console.error("Error parsing user data from headers:", error);
    return null;
  }
}
