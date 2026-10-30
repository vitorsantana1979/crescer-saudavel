import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: PageHeaderProps) {
  const ActionIcon = action?.icon;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="w-12 h-12 flex-shrink-0 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
        >
          {ActionIcon && <ActionIcon className="w-5 h-5" />}
          {action.label}
        </button>
      )}
    </div>
  );
}

