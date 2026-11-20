import { Check } from 'lucide-react';
import type { SaveStatus } from '../../hooks/useSaveFeedback';
import './ui-primitives.css';

export type SaveButtonProps = {
  status: SaveStatus;
  idleLabel: string;
  savingLabel?: string;
  successLabel?: string;
  showIdleCheck?: boolean;
  type?: 'submit' | 'button';
  disabled?: boolean;
  onClick?: () => void;
  form?: string;
  className?: string;
  ariaLabel?: string;
};

export function SaveButton({
  status,
  idleLabel,
  savingLabel = 'Guardando...',
  successLabel = 'Guardado',
  showIdleCheck = true,
  type = 'submit',
  disabled = false,
  onClick,
  form,
  className = '',
  ariaLabel,
}: SaveButtonProps) {
  const isSaving = status === 'saving';
  const isSuccess = status === 'success';
  const locked = disabled || isSaving || isSuccess;

  const liveAnnouncement = isSaving
    ? savingLabel
    : isSuccess
      ? successLabel
      : '';

  return (
    <button
      type={type}
      form={form}
      disabled={locked}
      aria-busy={isSaving || undefined}
      aria-label={ariaLabel}
      data-status={status}
      onClick={onClick}
      className={`ui-save-btn${className ? ` ${className}` : ''}`}
    >
      {/* Hidden sizers keep width rock-solid across idle / saving / success */}
      <span className="ui-save-btn__sizer" aria-hidden="true">
        {showIdleCheck && <Check size={15} strokeWidth={2.3} />}
        <span>{idleLabel}</span>
      </span>
      <span className="ui-save-btn__sizer" aria-hidden="true">
        <span className="ui-save-btn__spinner" />
        <span>{savingLabel}</span>
      </span>
      <span className="ui-save-btn__sizer" aria-hidden="true">
        <Check size={16} strokeWidth={2.4} />
        <span>{successLabel}</span>
      </span>

      <span className="ui-save-btn__content" key={isSaving ? 'saving' : isSuccess ? 'success' : 'idle'}>
        {isSaving && (
          <>
            <span className="ui-save-btn__spinner" aria-hidden="true" />
            <span>{savingLabel}</span>
          </>
        )}
        {isSuccess && (
          <>
            <svg className="ui-save-btn__check" viewBox="0 0 16 16" aria-hidden="true">
              <path className="ui-save-btn__check-path" d="M3.2 8.4L6.6 11.7L13 4.8" />
            </svg>
            <span>{successLabel}</span>
          </>
        )}
        {!isSaving && !isSuccess && (
          <>
            {showIdleCheck && <Check size={15} strokeWidth={2.3} aria-hidden="true" />}
            <span>{idleLabel}</span>
          </>
        )}
      </span>
      <span className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </span>
    </button>
  );
}
