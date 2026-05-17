import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function getAccessToken() {
  const session = await getServerSession(authOptions);
  return (session as any)?.accessToken as string | undefined;
}