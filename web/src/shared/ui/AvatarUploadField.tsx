"use client";

import { useRef } from "react";
import { Camera } from "@phosphor-icons/react";
import {
  AVATAR_ACCEPT_TYPES,
  parseAvatarProcessError,
  processAvatarFile,
} from "@/shared/lib/avatar-image";
import { useI18n } from "@/shared/i18n";

export function UserAvatar({
  name,
  avatarUrl,
  size = 36,
  className = "",
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
  className?: string;
}) {
  const letter = (name || "U").slice(0, 1).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`ui-avatar shrink-0 rounded-full object-cover object-center ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`ui-avatar-fallback flex shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.34) }}
    >
      {letter}
    </div>
  );
}

export function AvatarUploadField({
  name,
  value,
  onChange,
  onError,
}: {
  name: string;
  value?: string;
  onChange: (next: string | undefined) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    try {
      const dataUrl = await processAvatarFile(file);
      onChange(dataUrl);
    } catch (err) {
      const code = parseAvatarProcessError(err);
      if (code === "type") onError(t("settings.avatarTypeInvalid"));
      else if (code === "size") onError(t("settings.avatarTooLarge"));
      else onError(t("settings.avatarProcessFailed"));
    }
  }

  return (
    <div className="ui-avatar-upload">
      <button
        type="button"
        className="ui-avatar-upload-preview"
        onClick={() => inputRef.current?.click()}
        aria-label={t("settings.avatarChange")}
      >
        <UserAvatar name={name} avatarUrl={value} size={64} />
        <span className="ui-avatar-upload-overlay">
          <Camera size={16} weight="bold" />
        </span>
      </button>
      <div className="ui-avatar-upload-actions">
        <button
          type="button"
          className="ui-avatar-upload-action"
          onClick={() => inputRef.current?.click()}
        >
          {t("settings.avatarChange")}
        </button>
        {value ? (
          <button
            type="button"
            className="ui-avatar-upload-action ui-avatar-upload-action--muted"
            onClick={() => onChange(undefined)}
          >
            {t("settings.avatarRemove")}
          </button>
        ) : null}
        <p className="ui-avatar-upload-hint">{t("settings.avatarHint")}</p>
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
