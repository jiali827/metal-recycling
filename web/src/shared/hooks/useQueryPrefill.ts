import { useEffect } from "react";

/**
 * 进入业务列表页时，读取 URL 查询参数并写入筛选状态，实现「从纠错删除弹窗跳转后自动填充筛选条件」。
 * 读取一次（挂载时）后即从 URL 中清除该参数，避免刷新或后续操作重复套用。
 */
export function useQueryPrefill(param: string, setter: (value: string) => void): void {
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get(param);
    if (!value) return;
    setter(value);
    const url = new URL(window.location.href);
    url.searchParams.delete(param);
    window.history.replaceState(null, "", url.pathname + url.search);
    // 仅在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
