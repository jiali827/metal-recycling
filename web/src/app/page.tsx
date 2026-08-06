import { redirect } from "next/navigation";

/** 首屏進入登入；已登入用戶由登入頁再導向儀表板 */
export default function HomePage() {
  redirect("/login");
}
