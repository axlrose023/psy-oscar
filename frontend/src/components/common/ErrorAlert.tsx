interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div className="rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-error-600 dark:text-error-400">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="whitespace-nowrap rounded-lg bg-error-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-error-600 transition-colors"
          >
            Повторити
          </button>
        )}
      </div>
    </div>
  );
}
