"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { AvatarUploadField } from "@/components/ui/AvatarUploadField";
import { FormField, inputClass } from "@/components/ui/CrudUi";
import { useAuth } from "@/lib/auth-mock";
import { useI18n } from "@/lib/i18n";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validatePasswordFormat,
} from "@/lib/password";

export function ProfileEditModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, updateProfile } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setAvatarUrl(user?.avatarUrl);
    setError("");
    setMessage("");
  }, [open, user?.name, user?.avatarUrl]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const result = updateProfile({
      name,
      avatarUrl: avatarUrl ?? null,
    });
    if (!result.ok) {
      setError(result.message ?? t("common.saveFailed"));
      return;
    }
    setMessage(t("settings.profileUpdated"));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("settings.profileTitle")}
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            form="profile-edit-form"
            className="ui-btn-primary"
          >
            {t("common.save")}
          </button>
        </>
      }
    >
      <form
        id="profile-edit-form"
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <FormField
          label={t("settings.avatarLabel")}
          hint={t("settings.avatarHint")}
        >
          <AvatarUploadField
            name={name || user?.name || ""}
            value={avatarUrl}
            onChange={(next) => {
              setAvatarUrl(next);
              setError("");
            }}
            onError={setError}
          />
        </FormField>
        <FormField label={t("settings.displayName")} required>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </FormField>
        <FormField
          label={t("login.email")}
          hint={t("settings.emailReadonlyHint")}
        >
          <input
            className={inputClass}
            type="email"
            value={user?.email ?? ""}
            disabled
            readOnly
            autoComplete="username"
          />
        </FormField>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {message ? <p className="text-sm text-success">{message}</p> : null}
      </form>
    </Modal>
  );
}

export function PasswordChangeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { changePassword } = useAuth();
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
  }, [open]);

  function formatErrorMessage(
    code: ReturnType<typeof validatePasswordFormat>,
  ): string {
    if (code === "empty") return t("settings.newPasswordRequired");
    if (code === "length") return t("settings.passwordLength");
    if (code === "charset") return t("settings.passwordCharset");
    return t("settings.changeFailed");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!currentPassword) {
      setError(t("settings.currentPasswordRequired"));
      return;
    }

    const formatErr = validatePasswordFormat(nextPassword);
    if (formatErr) {
      setError(formatErrorMessage(formatErr));
      return;
    }

    if (nextPassword !== confirmPassword) {
      setError(t("settings.passwordMismatch"));
      return;
    }

    const result = changePassword(currentPassword, nextPassword);
    if (!result.ok) {
      setError(result.message ?? t("settings.changeFailed"));
      return;
    }

    setMessage(t("settings.passwordUpdated"));
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("settings.passwordTitle")}
      footer={
        <>
          <button type="button" className="ui-btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            form="password-change-form"
            className="ui-btn-primary"
          >
            {t("settings.updatePassword")}
          </button>
        </>
      }
    >
      <form
        id="password-change-form"
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <p className="text-sm text-muted">{t("settings.passwordHint")}</p>
        <FormField label={t("settings.currentPassword")} required>
          <input
            className={inputClass}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </FormField>
        <FormField label={t("settings.newPassword")} required>
          <input
            className={inputClass}
            type="password"
            value={nextPassword}
            onChange={(e) => setNextPassword(e.target.value)}
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
          />
        </FormField>
        <FormField label={t("settings.confirmPassword")} required>
          <input
            className={inputClass}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
          />
        </FormField>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {message ? <p className="text-sm text-success">{message}</p> : null}
      </form>
    </Modal>
  );
}
