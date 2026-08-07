import { useRef } from "react";
import { Camera } from "@phosphor-icons/react";
import { COMPANY_NAME_EN } from "@/shared/config/company";
import {
  AVATAR_ACCEPT_TYPES,
  parseAvatarProcessError,
  processLogoFile,
} from "@/shared/lib/avatar-image";
import { useI18n } from "@/shared/i18n";
import { SystemBrandMark } from "@/shared/ui/SystemBrandMark";

/** 侧栏等品牌位固定占位（宽×高一致，避免默认横图与上传方图切换时挤压布局） */
export const SIDEBAR_LOGO_BOX_SIZE = 36;

type CompanyLogoMarkProps = {
  size?: number;
  className?: string;
  title?: string;
  logoUrl?: string;
  /** 侧栏等品牌位：浅色圆角矩形外框 */
  framed?: boolean;
};

/** 侧栏等公司 Logo（上传自定义或系统默认金属图标） */
export function CompanyLogoMark({
  size = SIDEBAR_LOGO_BOX_SIZE,
  className,
  title = COMPANY_NAME_EN,
  logoUrl,
  framed = false,
}: CompanyLogoMarkProps) {
  return (
    <div
      className={`ui-brand-logo-slot${framed ? " is-framed" : ""}${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      title={title}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={title} className="ui-brand-logo-img" />
      ) : (
        <SystemBrandMark className="ui-brand-logo-mark" />
      )}
    </div>
  );
}

type CompanyLogoFullProps = {
  width?: number;
  className?: string;
  title?: string;
};

/** 完整品牌区（系统图标 + 名称，登录页等场景备用） */
export function CompanyLogoFull({
  width = 200,
  className,
  title = COMPANY_NAME_EN,
}: CompanyLogoFullProps) {
  const markSize = Math.round(width * 0.22);

  return (
    <div
      className={`flex items-center gap-3 ${className ?? ""}`}
      title={title}
    >
      <div style={{ width: markSize, height: markSize }}>
        <SystemBrandMark className="ui-brand-logo-mark" />
      </div>
      <span className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </span>
    </div>
  );
}

export function CompanyLogoUploadField({
  value,
  onChange,
  onError,
  disabled = false,
}: {
  value?: string;
  onChange: (next: string | undefined) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (disabled) return;
    try {
      const dataUrl = await processLogoFile(file);
      onChange(dataUrl);
    } catch (err) {
      const code = parseAvatarProcessError(err);
      if (code === "type") onError(t("settings.avatarTypeInvalid"));
      else if (code === "size") onError(t("settings.avatarTooLarge"));
      else onError(t("settings.avatarProcessFailed"));
    }
  }

  return (
    <div className={`ui-logo-upload${disabled ? " opacity-60" : ""}`}>
      <button
        type="button"
        className="ui-logo-upload-preview"
        onClick={() => !disabled && inputRef.current?.click()}
        aria-label={t("settings.logoChange")}
        disabled={disabled}
      >
        {value ? (
          <img src={value} alt="" className="ui-logo-upload-img" />
        ) : (
          <SystemBrandMark className="ui-logo-upload-default-mark" />
        )}
        <span className="ui-logo-upload-overlay">
          <Camera size={16} weight="bold" />
        </span>
      </button>
      <div className="ui-logo-upload-actions">
        <button
          type="button"
          className="ui-logo-upload-action"
          onClick={() => !disabled && inputRef.current?.click()}
          disabled={disabled}
        >
          {t("settings.logoChange")}
        </button>
        {value ? (
          <button
            type="button"
            className="ui-logo-upload-action ui-logo-upload-action--muted"
            onClick={() => !disabled && onChange(undefined)}
            disabled={disabled}
          >
            {t("settings.logoRemove")}
          </button>
        ) : null}
        <p className="ui-logo-upload-hint">{t("settings.companyLogoHint")}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
