import { redirect } from "next/navigation";

/** 修改密码已改为用户菜单弹窗，保留路由以免书签失效 */
export default function PasswordSettingsPage() {
  redirect("/dashboard");
}
