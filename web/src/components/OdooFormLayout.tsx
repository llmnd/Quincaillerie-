"use client";

import React, { ReactNode } from "react";
import styles from "./OdooFormLayout.module.css";

export type StatusStep = {
  label: string;
  active?: boolean;
  completed?: boolean;
};

export type OdooAction = {
  label: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger";
  icon?: ReactNode;
};

export interface OdooFormLayoutProps {
  title?: string;
  subtitle?: string;
  category?: string;
  categoryTitle?: string;
  documentTitle?: string;

  children: ReactNode;

  actions?: OdooAction[];
  statusSteps?: StatusStep[];

  onNew?: () => void;
  onNewClick?: () => void;
  onCloudClick?: () => void;
  onSettingsClick?: () => void;
  onClose?: () => void;
  onCloseClick?: () => void;

  showNewButton?: boolean;
  showSettings?: boolean;
  showCloud?: boolean;
  showClose?: boolean;
}

const noop = () => {};

function IconSettings() {
  return (
    <svg
      viewBox="0 0 24 24"
      className={styles.iconSvg}
      aria-hidden="true"
    >
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.1 13.4a7.8 7.8 0 0 0 .05-1.4 7.8 7.8 0 0 0-.05-1.4l2-1.55-2-3.45-2.45.95a7.6 7.6 0 0 0-2.4-1.4L13.9 2h-3.8l-.4 3.15a7.6 7.6 0 0 0-2.4 1.4l-2.45-.95-2 3.45 2 1.55a7.8 7.8 0 0 0-.05 1.4 7.8 7.8 0 0 0 .05 1.4l-2 1.55 2 3.45 2.45-.95a7.6 7.6 0 0 0 2.4 1.4l.4 3.15h3.8l.4-3.15a7.6 7.6 0 0 0 2.4-1.4l2.45.95 2-3.45-2.05-1.55Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCloudUpload() {
  return (
    <svg
      viewBox="0 0 24 24"
      className={styles.iconSvg}
      aria-hidden="true"
    >
      <path
        d="M7.2 18.2h9.7a3.6 3.6 0 0 0 .5-7.17A5.6 5.6 0 0 0 6.85 9.4a4.4 4.4 0 0 0 .35 8.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 16V8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="m8.9 11.6 3.1-3.1 3.1 3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClose() {
  return (
    <svg
      viewBox="0 0 24 24"
      className={styles.iconSvg}
      aria-hidden="true"
    >
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      className={styles.chevron}
      aria-hidden="true"
    >
      <path
        d="m9 18 6-6-6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OdooFormLayout({
  title,
  subtitle,
  category,
  categoryTitle,
  documentTitle,
  children,

  actions = [
    {
      label: "Enregistrer",
      variant: "primary",
      icon: <IconCloudUpload />,
    },
    {
      label: "Imprimer",
      variant: "default",
    },
  ],

  statusSteps = [],

  onNew,
  onNewClick,
  onCloudClick = noop,
  onSettingsClick = noop,
  onClose,
  onCloseClick,

  showNewButton = true,
  showSettings = true,
  showCloud = true,
  showClose = true,
}: OdooFormLayoutProps) {
  const resolvedTitle = documentTitle ?? title ?? "Document";
  const resolvedCategory = categoryTitle ?? category ?? "Ventes";
  const handleNew = onNewClick ?? onNew ?? noop;
  const handleClose = onCloseClick ?? onClose ?? noop;

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          {showNewButton && (
            <button
              type="button"
              className={styles.newButton}
              onClick={handleNew}
            >
              <span className={styles.newIcon}>+</span>
              <span>Nouveau</span>
            </button>
          )}

          <div className={styles.breadcrumbs}>
            <span className={styles.breadcrumbCategory}>
              {resolvedCategory}
            </span>

            <IconChevron />

            <span className={styles.breadcrumbCurrent}>
              {resolvedTitle}
            </span>
          </div>
        </div>

        <div className={styles.topActions}>
          {showSettings && (
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconSettings}`}
              title="Paramètres"
              aria-label="Paramètres"
              onClick={onSettingsClick}
            >
              <IconSettings />
            </button>
          )}

          {showCloud && (
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconSave}`}
              title="Enregistrer"
              aria-label="Enregistrer"
              onClick={onCloudClick}
            >
              <IconCloudUpload />
            </button>
          )}

          {showClose && (
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconClose}`}
              title="Fermer"
              aria-label="Fermer"
              onClick={handleClose}
            >
              <IconClose />
            </button>
          )}
        </div>
      </header>

      <div className={styles.actionBar}>
        <div className={styles.actionButtons}>
          {actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              type="button"
              onClick={action.onClick}
              className={`${styles.actionButton} ${
                action.variant === "primary"
                  ? styles.actionPrimary
                  : ""
              } ${
                action.variant === "danger"
                  ? styles.actionDanger
                  : ""
              }`}
            >
              {action.icon && (
                <span className={styles.actionIcon}>
                  {action.icon}
                </span>
              )}

              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {statusSteps.length > 0 && (
          <div className={styles.statusPipeline}>
            {statusSteps.map((step, index) => (
              <React.Fragment key={`${step.label}-${index}`}>
                <div
                  className={`${styles.statusStep} ${
                    step.active ? styles.statusActive : ""
                  } ${
                    step.completed ? styles.statusCompleted : ""
                  }`}
                >
                  <span>{step.label}</span>
                </div>

                {index < statusSteps.length - 1 && (
                  <span className={styles.statusSeparator}>
                    →
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <main className={styles.main}>
        <section className={styles.formSheet}>
          <div className={styles.formHeader}>
            <div>
              <h1>{resolvedTitle}</h1>

              {subtitle && (
                <p>{subtitle}</p>
              )}
            </div>
          </div>

          <div className={styles.formContent}>
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.formSection}>
      {(title || description) && (
        <div className={styles.sectionHeader}>
          {title && (
            <h2>{title}</h2>
          )}

          {description && (
            <p>{description}</p>
          )}
        </div>
      )}

      <div className={styles.sectionContent}>
        {children}
      </div>
    </section>
  );
}

export function FormRow({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      className={`${styles.formRow} ${
        columns === 1
          ? styles.oneColumn
          : columns === 3
          ? styles.threeColumns
          : styles.twoColumns
      }`}
    >
      {children}
    </div>
  );
}

export function FormGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.formGroup} ${className}`}>
      {children}
    </div>
  );
}

export function FormLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className={styles.formLabel}>
      {children}

      {required && (
        <span className={styles.required}>*</span>
      )}
    </label>
  );
}