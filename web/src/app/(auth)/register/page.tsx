import { redirect } from "next/navigation";

/** 一期暂不开放自助注册，入口统一回到登录 */
export default function RegisterPage() {
  redirect("/login");
}
